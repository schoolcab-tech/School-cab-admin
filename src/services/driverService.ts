import { supabase } from "@/integrations/supabase/client";

export type Driver = {
  driver_id: number;
  user_id: string;
  name: string | null;
  phone: string | null;
  cab_number: string;
  cab_capacity: number;
  license_number: string;
  vehicle_type: string;
  is_verified: boolean | null;
  verification_date: string | null;
  avg_rating: number | null;
  num_cabs_owned: number | null;
  created_at: string;
  updated_at: string;
  notification_token: string | null;
  schools_serving: string[] | null;
  service_areas?: Array<{ pincode: string }>;
  assigned_students?: Array<{
    student_id: number;
    name: string;
    pickup_address: string;
    drop_address: string;
    school: { name: string };
  }>;
  total_earnings?: number;
  monthly_earnings?: number;
};

export type DriverFilter = {
  search?: string;
  status?: "active" | "suspended";
  pincode?: string;
  schoolId?: string;
  is_verified?: boolean;
};

export type CreateDriverInput = {
  name: string;
  phone: string;
  cab_number: string;
  cab_capacity: number;
  license_number: string;
  vehicle_type: string;
  service_areas: string[];
};

export type UpdateDriverInput = Partial<CreateDriverInput>;

export type DriverEarnings = {
  total_earnings: number;
  monthly_earnings: number;
  pending_payments: number;
  completed_payments: number;
};

export type School = {
  school_id: number;
  name: string;
  address: string;
  locality: string;
  pincode: string;
  contact_number: string;
  email: string;
  code: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverStats = {
  total_bookings: number;
  active_bookings: number;
  assigned_students: number;
  avg_rating: number;
  total_reviews: number;
};

export const getDrivers = async (filters?: DriverFilter) => {
  try {
    // Base select with joined service areas — exclude soft-deleted drivers
    let query = (supabase.from("drivers") as any).select(`
      *,
      service_areas:driver_service_areas(pincode)
    `).is("deleted_at", null);

    // ----- Build driver id filter list based on pincode / school -----
    let driverIdsFilter: number[] | null = null;

    if (filters?.pincode) {
      const idsByPincode = await getDriversByPincode(filters.pincode);
      driverIdsFilter = idsByPincode;
    }

    if (filters?.schoolId) {
      const idsBySchool = await getDriversBySchool(filters.schoolId);
      driverIdsFilter = driverIdsFilter
        ? driverIdsFilter.filter((id) => idsBySchool.includes(id))
        : idsBySchool;
    }

    if (driverIdsFilter !== null) {
      // If no drivers matched the combined filters, short-circuit to empty array
      if (driverIdsFilter.length === 0) return [];
      query = query.in("driver_id", driverIdsFilter);
    }

    // ----- Search filter -----
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,cab_number.ilike.%${filters.search}%`
      );
    }

    // ----- Status / verification filters -----
    if (filters?.status) {
      if (filters.status === "active") {
        query = query.eq("is_verified", true);
      } else if (filters.status === "suspended") {
        query = query.eq("is_verified", false);
      }
    }

    if (filters?.is_verified !== undefined) {
      query = query.eq("is_verified", filters.is_verified);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching drivers:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in getDrivers:", error);
    throw error;
  }
};

export const getDriverById = async (id: string) => {
  const { data, error } = await (supabase as any)
    .from("drivers")
    .select(
      `
      *,
      service_areas:driver_service_areas(pincode),
      assigned_students:bookings!bookings_driver_id_fkey(
        student_id,
        students(
          name,
          pickup_address,
          drop_address,
          schools(name)
        )
      )
    `
    )
    .eq("driver_id", id)
    .is("deleted_at", null)
    .eq("bookings.status", "confirmed")
    .eq("bookings.booking_type", "monthly")
    .single();

  if (error) throw error;
  return data;
};

export const createDriver = async (data: CreateDriverInput, userId?: string) => {
  // Use provided user_id (from admin auth flow) or fall back to current user
  const resolvedUserId = userId || (await supabase.auth.getUser()).data.user?.id || "";

  // First create the driver
  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .insert({
      name: data.name,
      phone: data.phone,
      cab_number: data.cab_number,
      cab_capacity: data.cab_capacity,
      license_number: data.license_number,
      vehicle_type: data.vehicle_type,
      user_id: resolvedUserId,
    })
    .select()
    .single();

  if (driverError) throw driverError;

  // Then add service areas
  if (data.service_areas.length > 0) {
    const serviceAreasData = data.service_areas.map((pincode) => ({
      driver_id: driver.driver_id,
      pincode: pincode,
    }));

    const { error: serviceAreasError } = await supabase
      .from("driver_service_areas")
      .insert(serviceAreasData);

    if (serviceAreasError) throw serviceAreasError;
  }

  return driver;
};

export const updateDriver = async (id: string, data: UpdateDriverInput) => {
  // Using any here for flexibility in building partial update object

  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.cab_number !== undefined) updateData.cab_number = data.cab_number;
  if (data.cab_capacity !== undefined)
    updateData.cab_capacity = data.cab_capacity;
  if (data.license_number !== undefined)
    updateData.license_number = data.license_number;
  if (data.vehicle_type !== undefined)
    updateData.vehicle_type = data.vehicle_type;

  const { data: driver, error } = await supabase
    .from("drivers")
    .update(updateData)
    .eq("driver_id", id)
    .select()
    .single();

  if (error) throw error;

  // Update service areas if provided
  if (data.service_areas) {
    // Delete existing service areas
    await supabase.from("driver_service_areas").delete().eq("driver_id", id);

    // Insert new service areas
    if (data.service_areas.length > 0) {
      const serviceAreasData = data.service_areas.map((pincode) => ({
        driver_id: parseInt(id),
        pincode: pincode,
      }));

      const { error: serviceAreasError } = await supabase
        .from("driver_service_areas")
        .insert(serviceAreasData);

      if (serviceAreasError) throw serviceAreasError;
    }
  }

  return driver;
};

export const deleteDriver = async (id: string) => {
  // Soft delete: stamp deleted_at instead of issuing a hard DELETE.
  // Also nullify driver_id in student_attendance so the FK
  // (student_attendance_driver_id_fkey) doesn't block the update.
  const { error: attendanceError } = await (supabase as any)
    .from("student_attendance")
    .update({ driver_id: null })
    .eq("driver_id", id);

  if (attendanceError) {
    console.warn(
      "Could not nullify driver_id in student_attendance (safe to ignore if migration applied):",
      attendanceError
    );
  }

  const { error } = await (supabase as any)
    .from("drivers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("driver_id", id);

  if (error) throw error;
};

export const updateDriverStatus = async (id: string, is_verified: boolean) => {
  const { data, error } = await supabase
    .from("drivers")
    .update({
      is_verified,
      verification_date: is_verified
        ? new Date().toISOString().split("T")[0]
        : null,
    })
    .eq("driver_id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getDriverEarnings = async (
  driverId: string
): Promise<DriverEarnings> => {
  console.log(`Fetching earnings for driver ID: ${driverId}`);

  const driverIdNum = parseInt(driverId, 10);
  if (isNaN(driverIdNum)) {
    throw new Error(`Invalid driver ID: ${driverId}`);
  }

  const { data, error } = await supabase
    .from("payments")
    .select("amount, status, payment_date")
    .eq("driver_id", driverIdNum);

  if (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }

  console.log("Raw payments data:", data);

  const total_earnings = data
    .filter((p) => p.status?.toLowerCase() === "completed")
    .reduce((sum, payment) => {
      const amount = parseFloat(payment.amount?.toString() || "0");
      console.log(
        `Payment: ${payment.amount}, Status: ${payment.status}, Parsed: ${amount}`
      );
      return sum + amount;
    }, 0);

  const pending_payments = data
    .filter((p) => p.status?.toLowerCase() === "pending")
    .reduce(
      (sum, payment) => sum + parseFloat(payment.amount?.toString() || "0"),
      0
    );

  // Get current month earnings
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  console.log(`Fetching monthly earnings for month: ${currentMonth}`);

  // Calculate next month for the date range
  const currentDate = new Date();
  const nextMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    1
  );
  const nextMonthStr = nextMonth.toISOString().slice(0, 10); // YYYY-MM-DD format

  const { data: monthlyData, error: monthlyError } = await supabase
    .from("payments")
    .select("amount, payment_date")
    .eq("driver_id", driverIdNum)
    .eq("status", "completed")
    .gte("payment_date", `${currentMonth}-01`)
    .lt("payment_date", nextMonthStr);

  if (monthlyError) {
    console.error("Error fetching monthly payments:", monthlyError);
    throw monthlyError;
  }

  console.log("Monthly payments data:", monthlyData);

  const monthly_earnings = monthlyData.reduce(
    (sum, payment) => sum + parseFloat(payment.amount?.toString() || "0"),
    0
  );

  const completed_payments = data.filter(
    (p) => p.status?.toLowerCase() === "completed"
  ).length;

  const result = {
    total_earnings,
    monthly_earnings,
    pending_payments,
    completed_payments,
  };

  console.log("Processed earnings result:", result);
  return result;
};
export const getDriverStats = async (
  driverId: string
): Promise<DriverStats> => {
  // Get bookings stats
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("status")
    .eq("driver_id", driverId);

  if (bookingsError) throw bookingsError;

  // Get assigned students (monthly bookings)
  const { data: monthlyBookings, error: monthlyError } = await supabase
    .from("bookings")
    .select("student_id")
    .eq("driver_id", driverId)
    .eq("booking_type", "monthly")
    .eq("status", "confirmed");

  if (monthlyError) throw monthlyError;

  // Get reviews
  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("rating")
    .eq("driver_id", driverId);

  if (reviewsError) throw reviewsError;

  const avg_rating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return {
    total_bookings: bookings.length,
    active_bookings: bookings.filter((b) => b.status === "confirmed").length,
    assigned_students: monthlyBookings.length,
    avg_rating,
    total_reviews: reviews.length,
  };
};

export const getDriverAssignedStudents = async (driverId: string) => {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      booking_id,
      fare,
      booking_date,
      status,
      students(
        student_id,
        name,
        pickup_address,
        drop_address,
        pickup_time,
        drop_time,
        class,
        section,
        schools(name)
      )
    `
    )
    .eq("driver_id", driverId)
    .eq("booking_type", "monthly")
    .eq("status", "confirmed");

  if (error) throw error;
  return data;
};

// In src/services/driverService.ts

// Add these new functions
export const getDriversByPincode = async (pincode: string) => {
  const { data, error } = await supabase
    .from("driver_service_areas")
    .select("driver_id")
    .eq("pincode", pincode);

  if (error) throw error;
  return data?.map((item) => item.driver_id) || [];
};

export const getDriversBySchool = async (schoolId: string) => {
  const numericId = parseInt(schoolId, 10);
  if (isNaN(numericId) || numericId <= 0) return [];

  const { data, error } = await supabase
    .from("drivers")
    .select("driver_id")
    .contains("schools_serving", [numericId])
    .is("deleted_at", null);

  if (error) throw error;
  return data?.map((item) => item.driver_id) || [];
};

/**
 * Fetches schools by their IDs
 * @param schoolIds Array of school IDs to fetch
 * @returns Array of School objects
 */
export const getSchoolsByIds = async (
  schoolIds: string[]
): Promise<School[]> => {
  if (!schoolIds || schoolIds.length === 0) return [];

  // Convert string IDs to numbers and filter out any invalid values
  const validSchoolIds = schoolIds
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id) && id > 0);

  if (validSchoolIds.length === 0) return [];

  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .in("school_id", validSchoolIds);

  if (error) throw error;

  return data || [];
};
