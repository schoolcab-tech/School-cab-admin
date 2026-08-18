import { supabase } from "@/integrations/supabase/client";

export interface DriverTrip {
  driver_trip_id: number;
  driver_id: number;
  school_id: number;
  trip_name: string;
  trip_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_count?: number;
  student_preview?: string[];
}

export interface TripStudent {
  driver_trip_student_id: number;
  driver_trip_id: number;
  student_id: number;
  is_active: boolean;
  assigned_at: string;
  pickup_order: number | null;
  drop_order: number | null;
  student_name: string;
  student_class?: string;
  student_section?: string;
  pickup_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  drop_address: string;
}

export interface UnassignedStudent {
  student_id: number;
  name: string;
  class: string;
  section: string;
  pickup_address: string;
  drop_address: string;
  booking_id: number;
}

/**
 * Get all active trips for a driver+school, sorted by trip_order
 */
export async function getDriverTrips(
  driverId: number,
  schoolId: number
): Promise<DriverTrip[]> {
  const { data: trips, error } = await supabase
    .from("driver_trips")
    .select("*")
    .eq("driver_id", driverId)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("trip_order", { ascending: true });

  if (error) throw error;
  if (!trips || trips.length === 0) return [];

  // Enrich each trip with student count and preview
  const enrichedTrips: DriverTrip[] = [];
  for (const trip of trips) {
    const { data: students, error: studentsError } = await supabase
      .from("driver_trip_students")
      .select(
        `
        student_id,
        students (name)
      `
      )
      .eq("driver_trip_id", trip.driver_trip_id)
      .eq("is_active", true);

    if (studentsError) throw studentsError;

    enrichedTrips.push({
      ...trip,
      student_count: students?.length || 0,
      student_preview: (students || [])
        .slice(0, 3)
        .map((s: any) => s.students?.name || "Unknown"),
    });
  }

  return enrichedTrips;
}

/**
 * Create a new driver trip
 */
export async function createDriverTrip(
  driverId: number,
  schoolId: number,
  tripName: string,
  tripOrder: number
): Promise<DriverTrip> {
  const { data, error } = await supabase
    .from("driver_trips")
    .insert({
      driver_id: driverId,
      school_id: schoolId,
      trip_name: tripName,
      trip_order: tripOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, student_count: 0, student_preview: [] };
}

/**
 * Update a trip (name or order)
 */
export async function updateDriverTrip(
  driverTripId: number,
  updates: { trip_name?: string; trip_order?: number }
): Promise<void> {
  const { error } = await supabase
    .from("driver_trips")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("driver_trip_id", driverTripId);

  if (error) throw error;
}

/**
 * Soft-delete a trip by marking it inactive (CASCADE hard-delete avoided).
 * The trip row is preserved for audit history; setting is_active=false hides
 * it from all active-trip queries which already filter by is_active=true.
 */
export async function deleteDriverTrip(driverTripId: number): Promise<void> {
  const { error } = await supabase
    .from("driver_trips")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("driver_trip_id", driverTripId);

  if (error) throw error;
}

/**
 * Get students assigned to a specific trip with their details
 */
export async function getDriverTripStudents(
  driverTripId: number
): Promise<TripStudent[]> {
  const { data, error } = await supabase
    .from("driver_trip_students")
    .select(
      `
      driver_trip_student_id,
      driver_trip_id,
      student_id,
      is_active,
      assigned_at,
      pickup_order,
      drop_order,
      students (
        name,
        class,
        section,
        pickup_address,
        pickup_latitude,
        pickup_longitude,
        drop_address
      )
    `
    )
    .eq("driver_trip_id", driverTripId)
    .eq("is_active", true)
    .order("pickup_order", { ascending: true, nullsFirst: false })
    .order("student_id", { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    driver_trip_student_id: row.driver_trip_student_id,
    driver_trip_id: row.driver_trip_id,
    student_id: row.student_id,
    is_active: row.is_active,
    assigned_at: row.assigned_at,
    pickup_order: row.pickup_order ?? null,
    drop_order: row.drop_order ?? null,
    student_name: row.students?.name || "Unknown",
    student_class: row.students?.class,
    student_section: row.students?.section,
    pickup_address: row.students?.pickup_address || "",
    pickup_latitude: row.students?.pickup_latitude
      ? Number(row.students.pickup_latitude)
      : undefined,
    pickup_longitude: row.students?.pickup_longitude
      ? Number(row.students.pickup_longitude)
      : undefined,
    drop_address: row.students?.drop_address || "",
  }));
}

/**
 * Assign a student to a trip.
 * If the student was previously removed (is_active=false), reactivate instead of inserting.
 * The unique constraint on (driver_trip_id, student_id) prevents duplicate rows.
 */
export async function assignStudentToTrip(
  driverTripId: number,
  studentId: number,
  assignedBy: string
): Promise<void> {
  const db = supabase as any;
  // Check if a row already exists (could be inactive from a previous removal)
  const { data: existing } = await db
    .from("driver_trip_students")
    .select("driver_trip_student_id, is_active")
    .eq("driver_trip_id", driverTripId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    if (existing.is_active) return; // Already assigned, nothing to do
    // Reactivate the existing row
    const { error } = await db
      .from("driver_trip_students")
      .update({ is_active: true, assigned_by: assignedBy, assigned_at: new Date().toISOString() })
      .eq("driver_trip_student_id", existing.driver_trip_student_id);
    if (error) throw error;
  } else {
    // Insert new row
    const { error } = await db.from("driver_trip_students").insert({
      driver_trip_id: driverTripId,
      student_id: studentId,
      is_active: true,
      assigned_by: assignedBy,
    });
    if (error) throw error;
  }
}

/**
 * Remove a student from a trip (soft-delete: set is_active=false).
 * Keeps the row so it can be reactivated later without hitting the unique constraint.
 */
export async function removeStudentFromTrip(
  driverTripId: number,
  studentId: number
): Promise<void> {
  const { error } = await (supabase as any)
    .from("driver_trip_students")
    .update({ is_active: false })
    .eq("driver_trip_id", driverTripId)
    .eq("student_id", studentId);

  if (error) throw error;
}

/**
 * Get subscribed students NOT assigned to any active trip for this driver+school
 */
export async function getUnassignedStudents(
  driverId: number,
  schoolId: number
): Promise<UnassignedStudent[]> {
  // Get all confirmed monthly bookings for this driver+school
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      `
      booking_id,
      student_id,
      students (
        student_id,
        name,
        class,
        section,
        pickup_address,
        drop_address
      )
    `
    )
    .eq("driver_id", driverId)
    .eq("school_id", schoolId)
    .eq("status", "confirmed")
    .eq("booking_type", "monthly");

  if (bookingsError) throw bookingsError;
  if (!bookings || bookings.length === 0) return [];

  // Get all active trips for this driver+school
  const { data: trips, error: tripsError } = await supabase
    .from("driver_trips")
    .select("driver_trip_id")
    .eq("driver_id", driverId)
    .eq("school_id", schoolId)
    .eq("is_active", true);

  if (tripsError) throw tripsError;

  if (!trips || trips.length === 0) {
    // No trips exist — all students are "unassigned"
    return bookings.map((b: any) => ({
      student_id: b.student_id,
      name: b.students?.name || "Unknown",
      class: b.students?.class || "",
      section: b.students?.section || "",
      pickup_address: b.students?.pickup_address || "",
      drop_address: b.students?.drop_address || "",
      booking_id: b.booking_id,
    }));
  }

  const tripIds = trips.map((t) => t.driver_trip_id);

  // Get all students already assigned to trips
  const { data: assigned, error: assignedError } = await supabase
    .from("driver_trip_students")
    .select("student_id")
    .in("driver_trip_id", tripIds)
    .eq("is_active", true);

  if (assignedError) throw assignedError;

  const assignedStudentIds = new Set(
    (assigned || []).map((a) => a.student_id)
  );

  // Filter out assigned students
  return bookings
    .filter((b: any) => !assignedStudentIds.has(b.student_id))
    .map((b: any) => ({
      student_id: b.student_id,
      name: b.students?.name || "Unknown",
      class: b.students?.class || "",
      section: b.students?.section || "",
      pickup_address: b.students?.pickup_address || "",
      drop_address: b.students?.drop_address || "",
      booking_id: b.booking_id,
    }));
}

/**
 * Auto-assign all unassigned students to trips based on cab capacity.
 * Creates new trips as needed ("Trip 1", "Trip 2", ...).
 */
export async function autoAssignStudentsToTrips(
  driverId: number,
  schoolId: number,
  cabCapacity: number,
  assignedBy: string
): Promise<DriverTrip[]> {
  const unassigned = await getUnassignedStudents(driverId, schoolId);
  if (unassigned.length === 0) return [];

  // Get existing trips to determine next trip_order
  const existingTrips = await getDriverTrips(driverId, schoolId);
  let nextOrder = existingTrips.length > 0
    ? Math.max(...existingTrips.map((t) => t.trip_order)) + 1
    : 1;

  const createdTrips: DriverTrip[] = [];
  const studentsToAssign = [...unassigned];

  while (studentsToAssign.length > 0) {
    // Check if there's an existing trip with room
    let targetTrip = existingTrips.find(
      (t) => (t.student_count || 0) < cabCapacity
    );

    if (!targetTrip) {
      // Create a new trip
      targetTrip = await createDriverTrip(
        driverId,
        schoolId,
        `Trip ${nextOrder}`,
        nextOrder
      );
      nextOrder++;
      createdTrips.push(targetTrip);
      existingTrips.push(targetTrip);
    }

    const availableSlots = cabCapacity - (targetTrip.student_count || 0);
    const batch = studentsToAssign.splice(0, availableSlots);

    for (const student of batch) {
      await assignStudentToTrip(
        targetTrip.driver_trip_id,
        student.student_id,
        assignedBy
      );
    }

    // Update the count so the next iteration sees it
    targetTrip.student_count = (targetTrip.student_count || 0) + batch.length;
  }

  return createdTrips;
}

/**
 * Get cab capacity for a driver
 */
export async function getDriverCabCapacity(
  driverId: number
): Promise<number> {
  const { data, error } = await supabase
    .from("drivers")
    .select("cab_capacity")
    .eq("driver_id", driverId)
    .single();

  if (error) throw error;
  return data?.cab_capacity || 0;
}

/**
 * Get trip assignments for all students of a driver+school.
 * Returns a map of student_id → trip_name.
 */
export async function getTripAssignmentsForDriver(
  driverId: number,
  schoolId: number
): Promise<Record<number, string>> {
  const { data: trips, error: tripsError } = await supabase
    .from("driver_trips")
    .select("driver_trip_id, trip_name")
    .eq("driver_id", driverId)
    .eq("school_id", schoolId)
    .eq("is_active", true);

  if (tripsError) throw tripsError;
  if (!trips || trips.length === 0) return {};

  const tripIds = trips.map((t) => t.driver_trip_id);
  const tripNameMap = new Map(trips.map((t) => [t.driver_trip_id, t.trip_name]));

  const { data: assignments, error: assignError } = await supabase
    .from("driver_trip_students")
    .select("student_id, driver_trip_id")
    .in("driver_trip_id", tripIds)
    .eq("is_active", true);

  if (assignError) throw assignError;

  const result: Record<number, string> = {};
  for (const a of assignments || []) {
    result[a.student_id] = tripNameMap.get(a.driver_trip_id) || "Unknown Trip";
  }
  return result;
}

/**
 * Reorder students within a trip by updating pickup_order or drop_order.
 * @param driverTripId - the trip
 * @param orderedStudentIds - student IDs in desired order
 * @param orderType - "pickup" or "drop"
 */
export async function reorderTripStudents(
  driverTripId: number,
  orderedStudentIds: number[],
  orderType: "pickup" | "drop" = "pickup"
): Promise<void> {
  const field = orderType === "drop" ? "drop_order" : "pickup_order";
  for (let i = 0; i < orderedStudentIds.length; i++) {
    const { error } = await supabase
      .from("driver_trip_students")
      .update({ [field]: i + 1 })
      .eq("driver_trip_id", driverTripId)
      .eq("student_id", orderedStudentIds[i]);

    if (error) throw error;
  }
}

// ── Trip Route Optimization ──────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Optimize student order within a trip using nearest-neighbor TSP.
 * - pickup mode: starts from school, uses pickup coords
 * - drop mode: starts from school, uses drop coords (school is first stop after pickup)
 * Students without GPS coordinates are placed at the end.
 */
export async function optimizeTripRoute(
  driverTripId: number,
  schoolId: number,
  orderType: "pickup" | "drop" = "pickup"
): Promise<void> {
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("latitude, longitude")
    .eq("school_id", schoolId)
    .single();

  if (schoolError) throw schoolError;

  const schoolLat = school?.latitude ? Number(school.latitude) : null;
  const schoolLng = school?.longitude ? Number(school.longitude) : null;

  const students = await getDriverTripStudents(driverTripId);
  if (students.length === 0) return;

  // Use pickup or drop coordinates based on mode
  const getLat = (s: TripStudent) =>
    orderType === "drop" ? (s.drop_address ? schoolLat : null) : s.pickup_latitude;
  const getLng = (s: TripStudent) =>
    orderType === "drop" ? (s.drop_address ? schoolLng : null) : s.pickup_longitude;

  // For drop mode we use pickup coords (since drop is at school for all)
  // The optimization is: from school, nearest-neighbor to each student's HOME (pickup coords)
  // This gives the drop-off route from school outward
  const getStudentLat = (s: TripStudent) => s.pickup_latitude;
  const getStudentLng = (s: TripStudent) => s.pickup_longitude;

  const withGps = students.filter(
    (s) => getStudentLat(s) != null && getStudentLng(s) != null
  );
  const withoutGps = students.filter(
    (s) => getStudentLat(s) == null || getStudentLng(s) == null
  );

  const startLat = schoolLat ?? withGps[0] ? getStudentLat(withGps[0]) : null;
  const startLng = schoolLng ?? withGps[0] ? getStudentLng(withGps[0]) : null;

  let ordered: TripStudent[] = [];

  if (startLat != null && startLng != null && withGps.length > 0) {
    const remaining = [...withGps];
    let curLat = startLat;
    let curLng = startLng;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      remaining.forEach((s, idx) => {
        const dist = haversineKm(curLat, curLng, getStudentLat(s)!, getStudentLng(s)!);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      });

      const nearest = remaining.splice(nearestIdx, 1)[0];
      ordered.push(nearest);
      curLat = getStudentLat(nearest)!;
      curLng = getStudentLng(nearest)!;
    }
  } else {
    ordered = withGps;
  }

  ordered.push(...withoutGps);

  const field = orderType === "drop" ? "drop_order" : "pickup_order";
  for (let i = 0; i < ordered.length; i++) {
    const { error } = await supabase
      .from("driver_trip_students")
      .update({ [field]: i + 1 })
      .eq("driver_trip_student_id", ordered[i].driver_trip_student_id);

    if (error) throw error;
  }
}
