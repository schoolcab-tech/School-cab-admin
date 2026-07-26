import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "./auditLogService";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Updates a student's status (active/inactive)
 */
export async function updateStudentStatus(
  studentId: number,
  status: "active" | "inactive"
) {
  // We'll use custom status field in the database
  const { data, error } = await supabase
    .from("students")
    .update({
      // Store the status in the metadata or a custom field that's compatible with the schema
      notification_token: status, // Using this field temporarily as status isn't in the schema
    })
    .eq("student_id", studentId)
    .select();

  if (error) throw new Error(`Error updating student status: ${error.message}`);
  return data?.[0];
}

/**
 * Assigns a driver to a student by creating or updating a booking
 * IMPORTANT: Also updates all related tables (subscription_cycles, subscription_payments, payments)
 * to maintain data consistency across the system
 *
 * @param studentId - Student ID
 * @param driverId - New driver ID to assign
 * @param schoolId - School ID
 * @param adminUserId - User ID of the admin making the change (for audit logging)
 * @param adminRole - Role of the admin making the change (for audit logging)
 */
export async function assignDriverToStudent(
  studentId: number,
  driverId: number,
  schoolId: number,
  adminUserId?: string,
  adminRole?: AppRole
) {
  // Check if there's an existing booking for this student.
  // IMPORTANT: must match the UI's logic in getStudents() which sorts by
  // updated_at DESC — otherwise the service can pick a DIFFERENT booking than
  // what the UI is showing. This causes the early-return below to fire on the
  // wrong booking (thinking "driver is the same") when the user is actually
  // trying to reassign the booking the UI is showing.
  // Filter to confirmed bookings and order by updated_at DESC for consistency.
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("booking_id, driver_id")
    .eq("student_id", studentId)
    .eq("status", "confirmed")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existingBooking && existingBooking.length > 0) {
    const bookingId = existingBooking[0].booking_id;
    const oldDriverId = existingBooking[0].driver_id;

    // Only proceed with update if driver has actually changed
    if (oldDriverId === driverId) {
      console.log("Driver is the same, no update needed");
      return existingBooking[0];
    }

    console.log(`Reassigning student ${studentId} from driver ${oldDriverId} to driver ${driverId}`);

    // Step 1: Update the booking (including updated_at for proper sorting)
    const { data: updatedBooking, error: bookingError } = await supabase
      .from("bookings")
      .update({
        driver_id: driverId,
        updated_at: new Date().toISOString() // Explicitly update timestamp
      })
      .eq("booking_id", bookingId)
      .select();

    if (bookingError) {
      throw new Error(
        `Error updating booking driver: ${bookingError.message}`
      );
    }

    // Step 2: Update all subscription_cycles for this booking
    const { error: cyclesError } = await supabase
      .from("subscription_cycles")
      .update({ driver_id: driverId })
      .eq("booking_id", bookingId);

    if (cyclesError) {
      console.error("Error updating subscription_cycles:", cyclesError);
      throw new Error(
        `Error updating subscription cycles: ${cyclesError.message}`
      );
    }

    // Step 3: Update all subscription_payments for this booking
    const { error: subscriptionPaymentsError } = await supabase
      .from("subscription_payments")
      .update({ driver_id: driverId })
      .eq("booking_id", bookingId);

    if (subscriptionPaymentsError) {
      console.error("Error updating subscription_payments:", subscriptionPaymentsError);
      throw new Error(
        `Error updating subscription payments: ${subscriptionPaymentsError.message}`
      );
    }

    // Step 4: Update all payments for this booking
    const { error: paymentsError } = await supabase
      .from("payments")
      .update({ driver_id: driverId })
      .eq("booking_id", bookingId);

    if (paymentsError) {
      console.error("Error updating payments:", paymentsError);
      throw new Error(
        `Error updating payments: ${paymentsError.message}`
      );
    }

    console.log(`Successfully reassigned student ${studentId} to driver ${driverId} across all tables`);

    // Step 4.5: Sync driver_trip_students — the student may be assigned to a
    // trip owned by the OLD driver. If we don't clean this up, the driver app's
    // multi-trip mode will still think the student belongs to the old driver,
    // and neither driver will see them on Start Trip.
    // NOTE: driver_trips / driver_trip_students are not in the generated
    // Supabase types file yet, so we cast to `any` for these queries.
    try {
      const db = supabase as any;

      // Find all active trip assignments for this student, with their trip's driver
      const { data: existingTripAssignments } = await db
        .from("driver_trip_students")
        .select(
          `driver_trip_student_id, driver_trip_id, driver_trips!inner(driver_id, school_id, trip_order, is_active)`
        )
        .eq("student_id", studentId)
        .eq("is_active", true);

      // Deactivate assignments owned by any driver != new driver
      const staleIds = (existingTripAssignments || [])
        .filter((r: any) => r.driver_trips?.driver_id !== driverId)
        .map((r: any) => r.driver_trip_student_id);

      if (staleIds.length > 0) {
        const { error: deactivateError } = await db
          .from("driver_trip_students")
          .update({ is_active: false })
          .in("driver_trip_student_id", staleIds);
        if (deactivateError) {
          console.error("Error deactivating stale trip assignments:", deactivateError);
        } else {
          console.log(`Deactivated ${staleIds.length} stale trip assignment(s) for student ${studentId}`);
        }
      }

      // Check if student is already in any active trip owned by the new driver
      const alreadyInNewDriverTrip = (existingTripAssignments || []).some(
        (r: any) => r.driver_trips?.driver_id === driverId
      );

      if (!alreadyInNewDriverTrip) {
        // Try to add the student to the new driver's first active trip (lowest trip_order)
        // for the same school as the booking. If new driver has no trips, do nothing —
        // the driver app will fall back to single-trip mode and show the student anyway.
        const { data: newDriverTrips } = await db
          .from("driver_trips")
          .select("driver_trip_id, trip_order")
          .eq("driver_id", driverId)
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .order("trip_order", { ascending: true })
          .limit(1);

        if (newDriverTrips && newDriverTrips.length > 0) {
          const targetTripId = newDriverTrips[0].driver_trip_id;
          const { error: insertError } = await db
            .from("driver_trip_students")
            .insert({
              driver_trip_id: targetTripId,
              student_id: studentId,
              is_active: true,
              assigned_by: adminUserId ?? null,
            });
          if (insertError) {
            console.error("Error adding student to new driver's trip:", insertError);
          } else {
            console.log(`Added student ${studentId} to new driver's trip ${targetTripId}`);
          }
        }
      }
    } catch (tripSyncError) {
      // Non-fatal — don't block the reassignment if trip sync fails
      console.error("Error syncing driver_trip_students:", tripSyncError);
    }

    // Step 5: Create audit log entry if admin credentials provided
    if (adminUserId && adminRole) {
      try {
        await createAuditLog(
          adminUserId,
          adminRole,
          "override_data", // Using generic action type for manual data changes
          "student_driver_assignment",
          bookingId,
          {
            student_id: studentId,
            old_driver_id: oldDriverId,
            booking_id: bookingId,
          },
          {
            student_id: studentId,
            new_driver_id: driverId,
            booking_id: bookingId,
          },
          `Reassigned student ${studentId} from driver ${oldDriverId} to driver ${driverId}. Updated bookings, subscription_cycles, subscription_payments, and payments tables.`
        );
        console.log("Audit log created for driver reassignment");
      } catch (auditError) {
        // Don't fail the whole operation if audit logging fails
        console.error("Failed to create audit log:", auditError);
      }
    } else {
      console.warn("No admin credentials provided for audit logging");
    }

    return updatedBooking?.[0];
  } else {
    // Create new booking with minimal required fields
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .single();

    if (!student) throw new Error("Student not found");

    // Get user_id for the booking
    const { data: userData } = await supabase
      .from("students")
      .select("user_id")
      .eq("student_id", studentId)
      .single();

    if (!userData) throw new Error("User not found for student");

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        student_id: studentId,
        driver_id: driverId,
        school_id: schoolId,
        user_id: userData.user_id, // Required field from the schema
        booking_type: "monthly",
        fare: 0, // This should be calculated or set appropriately in a real system
        status: "confirmed",
        booking_date: new Date().toISOString().split("T")[0],
        pickup_address: student.pickup_address,
        drop_address: student.drop_address,
        pickup_pincode: student.pickup_pincode,
        drop_pincode: student.drop_pincode,
        pickup_time: student.pickup_time,
        drop_time: student.drop_time,
      })
      .select();

    if (error)
      throw new Error(
        `Error creating student driver assignment: ${error.message}`
      );
    return data?.[0];
  }
}

/**
 * Delete a student and related transport records (bookings, payments, trips, etc.).
 * Leaves the parent auth user intact (a parent may have other students).
 */
export async function deleteStudent(
  studentId: number,
  adminUserId?: string,
  adminRole?: AppRole
) {
  const { data: student, error: studentFetchError } = await supabase
    .from("students")
    .select("student_id, name, school_id, user_id")
    .eq("student_id", studentId)
    .single();

  if (studentFetchError) {
    throw new Error(`Error fetching student: ${studentFetchError.message}`);
  }
  if (!student) throw new Error("Student not found");

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("booking_id")
    .eq("student_id", studentId);

  if (bookingsError) {
    throw new Error(`Error fetching student bookings: ${bookingsError.message}`);
  }

  const bookingIds = (bookings || []).map((b) => b.booking_id);

  if (bookingIds.length > 0) {
    const { error: subscriptionPaymentsError } = await supabase
      .from("subscription_payments")
      .delete()
      .in("booking_id", bookingIds);
    if (subscriptionPaymentsError) {
      throw new Error(
        `Error deleting subscription payments: ${subscriptionPaymentsError.message}`
      );
    }

    const { error: paymentsError } = await supabase
      .from("payments")
      .delete()
      .in("booking_id", bookingIds);
    if (paymentsError) {
      throw new Error(`Error deleting payments: ${paymentsError.message}`);
    }

    const { error: cyclesError } = await supabase
      .from("subscription_cycles")
      .delete()
      .in("booking_id", bookingIds);
    if (cyclesError) {
      throw new Error(
        `Error deleting subscription cycles: ${cyclesError.message}`
      );
    }
  }

  // Tables not always present in generated types — cast where needed
  const db = supabase as any;

  const { error: tripStudentsError } = await db
    .from("trip_students")
    .delete()
    .eq("student_id", studentId);
  if (tripStudentsError) {
    throw new Error(`Error deleting trip students: ${tripStudentsError.message}`);
  }

  const { error: driverTripStudentsError } = await db
    .from("driver_trip_students")
    .delete()
    .eq("student_id", studentId);
  if (driverTripStudentsError) {
    throw new Error(
      `Error deleting driver trip students: ${driverTripStudentsError.message}`
    );
  }

  const { error: bookingRequestsError } = await supabase
    .from("booking_requests")
    .delete()
    .eq("student_id", studentId);
  if (bookingRequestsError) {
    throw new Error(
      `Error deleting booking requests: ${bookingRequestsError.message}`
    );
  }

  const { error: unservicedError } = await supabase
    .from("unserviced_requests")
    .delete()
    .eq("student_id", studentId);
  if (unservicedError) {
    throw new Error(
      `Error deleting unserviced requests: ${unservicedError.message}`
    );
  }

  if (bookingIds.length > 0) {
    const { error: deleteBookingsError } = await supabase
      .from("bookings")
      .delete()
      .eq("student_id", studentId);
    if (deleteBookingsError) {
      throw new Error(`Error deleting bookings: ${deleteBookingsError.message}`);
    }
  }

  const { error: deleteStudentError } = await supabase
    .from("students")
    .delete()
    .eq("student_id", studentId);

  if (deleteStudentError) {
    throw new Error(`Error deleting student: ${deleteStudentError.message}`);
  }

  if (adminUserId && adminRole) {
    try {
      await createAuditLog(
        adminUserId,
        adminRole,
        "delete_student",
        "student",
        studentId,
        {
          student_id: student.student_id,
          name: student.name,
          school_id: student.school_id,
          user_id: student.user_id,
          booking_ids: bookingIds,
        },
        null,
        `Deleted student ${student.name} (ID ${studentId})`
      );
    } catch (auditError) {
      console.error("Failed to create audit log for student delete:", auditError);
    }
  }

  return true;
}

/**
 * Get all students with their details
 */
export async function getStudents(options?: {
  schoolId?: number;
  driverIds?: number[];
}) {
  let studentIdsFilter: number[] | undefined;

  if (options?.driverIds != null) {
    if (options.driverIds.length === 0) {
      return [];
    }

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("student_id")
      .in("driver_id", options.driverIds)
      .eq("status", "confirmed")
      .eq("booking_type", "monthly");

    if (bookingsError) {
      throw new Error(`Error fetching fleet students: ${bookingsError.message}`);
    }

    studentIdsFilter = [...new Set((bookings || []).map((b) => b.student_id))];
    if (studentIdsFilter.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from("students")
    .select(
      `
      *,
      schools(name, address, school_id),
      bookings(
        booking_id,
        driver_id,
        created_at,
        updated_at,
        drivers(
          driver_id,
          name,
          phone,
          cab_number,
          vehicle_type
        )
      )
    `
    );

  if (options?.schoolId != null) {
    query = query.eq("school_id", options.schoolId);
  }

  if (studentIdsFilter != null) {
    query = query.in("student_id", studentIdsFilter);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw new Error(`Error fetching students: ${error.message}`);

  // Process the data to extract the most recent driver assignment for each student
  return data?.map((student) => {
    const bookings = student.bookings || [];

    // IMPORTANT: Sort bookings by updated_at DESC to get the most recent driver assignment
    // We use updated_at because that's what changes when we reassign a driver
    const sortedBookings = [...bookings].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA; // Descending order (most recent first)
    });

    const latestBooking = sortedBookings[0];

    return {
      ...student,
      // Add assigned_driver field for convenience
      assigned_driver: latestBooking?.drivers || null,
      // Map notification_token to status if we're using it as a status placeholder
      status: student.notification_token as "active" | "inactive" | undefined,
    };
  });
}
