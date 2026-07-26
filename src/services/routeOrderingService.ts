import { supabase } from "@/integrations/supabase/client";

export interface StudentRouteOrder {
  route_order_id?: number;
  student_id: number;
  student_name: string;
  student_class?: string;
  student_section?: string;
  pickup_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  drop_address: string;
  drop_latitude?: number;
  drop_longitude?: number;
  pickup_order: number;
  drop_order: number;
  is_active: boolean;
}

export interface DriverSchoolRoute {
  driver_id: number;
  driver_name: string;
  school_id: number;
  school_name: string;
  school_address: string;
  school_latitude?: number;
  school_longitude?: number;
  students: StudentRouteOrder[];
}

export interface DriverSchoolRouteSummary {
  driver_id: number;
  driver_name: string;
  school_id: number;
  school_name: string;
  student_count: number;
  has_custom_order: boolean;
}

function upsertRouteSummary(
  routeMap: Map<string, DriverSchoolRouteSummary>,
  driverId: number,
  schoolId: number,
  driverName: string,
  schoolName: string,
  addStudents = 0
) {
  const key = `${driverId}-${schoolId}`;
  if (!routeMap.has(key)) {
    routeMap.set(key, {
      driver_id: driverId,
      driver_name: driverName,
      school_id: schoolId,
      school_name: schoolName,
      student_count: 0,
      has_custom_order: false,
    });
  }
  if (addStudents > 0) {
    routeMap.get(key)!.student_count += addStudents;
  }
}

async function mergeFleetDriverRoutes(
  routeMap: Map<string, DriverSchoolRouteSummary>,
  driverIds: number[]
) {
  if (driverIds.length === 0) return;

  const { data: drivers } = await supabase
    .from("drivers")
    .select("driver_id, name, schools_serving")
    .in("driver_id", driverIds);

  const schoolIds = new Set<number>();
  for (const driver of drivers || []) {
    for (const schoolId of driver.schools_serving || []) {
      if (typeof schoolId === "number") schoolIds.add(schoolId);
    }
  }

  const schoolNames = new Map<number, string>();
  if (schoolIds.size > 0) {
    const { data: schools } = await supabase
      .from("schools")
      .select("school_id, name")
      .in("school_id", Array.from(schoolIds));
    for (const school of schools || []) {
      schoolNames.set(school.school_id, school.name);
    }
  }

  for (const driver of drivers || []) {
    for (const schoolId of driver.schools_serving || []) {
      if (typeof schoolId !== "number") continue;
      upsertRouteSummary(
        routeMap,
        driver.driver_id,
        schoolId,
        driver.name || "Unknown Driver",
        schoolNames.get(schoolId) || `School #${schoolId}`
      );
    }
  }

  const { data: trips } = await supabase
    .from("driver_trips")
    .select(
      `
      driver_id,
      school_id,
      drivers!inner ( name ),
      schools!inner ( name )
    `
    )
    .in("driver_id", driverIds)
    .eq("is_active", true);

  for (const trip of trips || []) {
    const driver = trip.drivers as unknown as { name: string };
    const school = trip.schools as unknown as { name: string };
    upsertRouteSummary(
      routeMap,
      trip.driver_id,
      trip.school_id,
      driver?.name || "Unknown Driver",
      school?.name || "Unknown School"
    );
  }
}

/**
 * Get all driver-school combinations for the admin list view
 */
export async function getAllDriverSchoolRoutes(options?: {
  schoolId?: number;
  driverIds?: number[];
}): Promise<DriverSchoolRouteSummary[]> {
  if (options?.driverIds != null && options.driverIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("bookings")
    .select(
      `
      driver_id,
      school_id,
      drivers!inner (
        driver_id,
        name
      ),
      schools!inner (
        school_id,
        name
      )
    `
    )
    .eq("status", "confirmed")
    .eq("booking_type", "monthly");

  if (options?.schoolId != null) {
    query = query.eq("school_id", options.schoolId);
  }

  if (options?.driverIds != null) {
    query = query.in("driver_id", options.driverIds);
  }

  const { data, error } = await query;

  // Fleet owners may not have bookings RLS access — fall back to schools_serving
  if (error && options?.driverIds == null) {
    throw error;
  }

  const routeMap = new Map<string, DriverSchoolRouteSummary>();

  for (const booking of data || []) {
    const driver = booking.drivers as unknown as { driver_id: number; name: string };
    const school = booking.schools as unknown as { school_id: number; name: string };
    upsertRouteSummary(
      routeMap,
      booking.driver_id,
      booking.school_id,
      driver.name || "Unknown Driver",
      school.name || "Unknown School",
      1
    );
  }

  if (options?.driverIds != null) {
    await mergeFleetDriverRoutes(routeMap, options.driverIds);
  }

  const routes = Array.from(routeMap.values());

  // Check for custom orders
  for (const route of routes) {
    const { count } = await supabase
      .from("driver_route_orders")
      .select("*", { count: "exact", head: true })
      .eq("driver_id", route.driver_id)
      .eq("school_id", route.school_id)
      .eq("is_active", true);

    route.has_custom_order = (count || 0) > 0;
  }

  return routes;
}

/**
 * Get all students for a driver-school combination with their current ordering
 */
export async function getDriverSchoolStudents(
  driverId: number,
  schoolId: number
): Promise<DriverSchoolRoute | null> {
  // Get driver info
  const { data: driverData, error: driverError } = await supabase
    .from("drivers")
    .select("driver_id, name")
    .eq("driver_id", driverId)
    .single();

  if (driverError) throw driverError;

  // Get school info
  const { data: schoolData, error: schoolError } = await supabase
    .from("schools")
    .select("school_id, name, address, latitude, longitude")
    .eq("school_id", schoolId)
    .single();

  if (schoolError) throw schoolError;

  // Get students from bookings (confirmed monthly subscriptions)
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
        pickup_latitude,
        pickup_longitude,
        drop_address,
        drop_latitude,
        drop_longitude
      )
    `
    )
    .eq("driver_id", driverId)
    .eq("school_id", schoolId)
    .eq("status", "confirmed")
    .eq("booking_type", "monthly");

  if (bookingsError) throw bookingsError;

  // Get existing route orders
  const { data: existingOrders, error: ordersError } = await supabase
    .from("driver_route_orders")
    .select("*")
    .eq("driver_id", driverId)
    .eq("school_id", schoolId)
    .eq("is_active", true);

  if (ordersError && ordersError.code !== "PGRST116") throw ordersError;

  // Merge booking students with existing orders
  const orderMap = new Map(
    (existingOrders || []).map((o) => [o.student_id, o])
  );

  const students: StudentRouteOrder[] = (bookings || []).map((b, index) => {
    const existingOrder = orderMap.get(b.student_id);
    const student = b.students as unknown as {
      student_id: number;
      name: string;
      class: string;
      section: string;
      pickup_address: string;
      pickup_latitude: number;
      pickup_longitude: number;
      drop_address: string;
      drop_latitude: number;
      drop_longitude: number;
    };

    return {
      route_order_id: existingOrder?.route_order_id,
      student_id: b.student_id,
      student_name: student?.name || "Unknown",
      student_class: student?.class,
      student_section: student?.section,
      pickup_address: student?.pickup_address || "",
      pickup_latitude: student?.pickup_latitude,
      pickup_longitude: student?.pickup_longitude,
      drop_address: student?.drop_address || "",
      drop_latitude: student?.drop_latitude,
      drop_longitude: student?.drop_longitude,
      pickup_order: existingOrder?.pickup_order ?? index + 1,
      drop_order: existingOrder?.drop_order ?? index + 1,
      is_active: existingOrder?.is_active ?? true,
    };
  });

  // Sort by pickup_order
  students.sort((a, b) => a.pickup_order - b.pickup_order);

  return {
    driver_id: driverData.driver_id,
    driver_name: driverData.name || "Unknown Driver",
    school_id: schoolData.school_id,
    school_name: schoolData.name,
    school_address: schoolData.address,
    school_latitude: schoolData.latitude ? Number(schoolData.latitude) : undefined,
    school_longitude: schoolData.longitude ? Number(schoolData.longitude) : undefined,
    students,
  };
}

/**
 * Save or update the student ordering for a driver-school combination.
 * Uses delete + insert to avoid unique constraint violations on pickup_order/drop_order
 * when swapping student positions.
 */
export async function saveStudentOrdering(
  driverId: number,
  schoolId: number,
  students: Array<{
    student_id: number;
    pickup_order: number;
    drop_order: number;
    is_active?: boolean;
  }>,
  adminUserId: string
): Promise<void> {
  const insertData = students.map((s) => ({
    driver_id: driverId,
    school_id: schoolId,
    student_id: s.student_id,
    pickup_order: s.pickup_order,
    drop_order: s.drop_order,
    is_active: s.is_active ?? true,
    updated_by: adminUserId,
    updated_at: new Date().toISOString(),
  }));

  // Delete existing orders first to avoid unique constraint conflicts on pickup_order/drop_order
  const { error: deleteError } = await supabase
    .from("driver_route_orders")
    .delete()
    .eq("driver_id", driverId)
    .eq("school_id", schoolId);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("driver_route_orders")
    .insert(insertData);

  if (insertError) throw insertError;
}

/**
 * Reorder students for pickup or drop (drag & drop).
 * Uses delete + insert to avoid unique constraint violations on pickup_order/drop_order
 * when swapping student positions.
 */
export async function reorderStudents(
  driverId: number,
  schoolId: number,
  studentIds: number[],
  type: "pickup" | "drop",
  adminUserId: string
): Promise<void> {
  // First get existing orders to preserve the other order type
  const { data: existingOrders } = await supabase
    .from("driver_route_orders")
    .select("student_id, pickup_order, drop_order")
    .eq("driver_id", driverId)
    .eq("school_id", schoolId)
    .eq("is_active", true);

  const existingMap = new Map(
    (existingOrders || []).map((o) => [o.student_id, o])
  );

  const insertData = studentIds.map((studentId, index) => {
    const existing = existingMap.get(studentId);
    return {
      driver_id: driverId,
      school_id: schoolId,
      student_id: studentId,
      pickup_order: type === "pickup" ? index + 1 : (existing?.pickup_order ?? index + 1),
      drop_order: type === "drop" ? index + 1 : (existing?.drop_order ?? index + 1),
      is_active: true,
      updated_by: adminUserId,
      updated_at: new Date().toISOString(),
    };
  });

  // Delete existing orders first to avoid unique constraint conflicts on pickup_order/drop_order
  const { error: deleteError } = await supabase
    .from("driver_route_orders")
    .delete()
    .eq("driver_id", driverId)
    .eq("school_id", schoolId);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("driver_route_orders")
    .insert(insertData);

  if (insertError) throw insertError;
}

// Haversine formula for distance calculation
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Auto-generate optimized pickup order based on geographical proximity
 * Uses nearest-neighbor algorithm for TSP approximation
 */
export async function generateOptimizedPickupOrder(
  driverId: number,
  schoolId: number,
  startLatitude?: number,
  startLongitude?: number
): Promise<number[]> {
  const route = await getDriverSchoolStudents(driverId, schoolId);
  if (!route) throw new Error("Route not found");

  const studentsWithCoords = route.students.filter(
    (s) => s.pickup_latitude && s.pickup_longitude
  );

  if (studentsWithCoords.length === 0) {
    return route.students.map((s) => s.student_id);
  }

  // Start from provided location or first student
  const startPoint =
    startLatitude && startLongitude
      ? { lat: startLatitude, lng: startLongitude }
      : {
          lat: studentsWithCoords[0].pickup_latitude!,
          lng: studentsWithCoords[0].pickup_longitude!,
        };

  const ordered: number[] = [];
  const remaining = [...studentsWithCoords];

  let currentPoint = startPoint;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((student, idx) => {
      const dist = haversineDistance(
        currentPoint.lat,
        currentPoint.lng,
        student.pickup_latitude!,
        student.pickup_longitude!
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    const nearest = remaining.splice(nearestIdx, 1)[0];
    ordered.push(nearest.student_id);
    currentPoint = {
      lat: nearest.pickup_latitude!,
      lng: nearest.pickup_longitude!,
    };
  }

  // Add students without coordinates at the end
  const studentsWithoutCoords = route.students.filter(
    (s) => !s.pickup_latitude || !s.pickup_longitude
  );
  ordered.push(...studentsWithoutCoords.map((s) => s.student_id));

  return ordered;
}

/**
 * Auto-generate optimized drop order based on geographical proximity
 * Starting from school location
 */
export async function generateOptimizedDropOrder(
  driverId: number,
  schoolId: number
): Promise<number[]> {
  const route = await getDriverSchoolStudents(driverId, schoolId);
  if (!route) throw new Error("Route not found");

  const studentsWithCoords = route.students.filter(
    (s) => s.drop_latitude && s.drop_longitude
  );

  if (studentsWithCoords.length === 0) {
    return route.students.map((s) => s.student_id);
  }

  // Start from school location
  const startPoint =
    route.school_latitude && route.school_longitude
      ? { lat: route.school_latitude, lng: route.school_longitude }
      : {
          lat: studentsWithCoords[0].drop_latitude!,
          lng: studentsWithCoords[0].drop_longitude!,
        };

  const ordered: number[] = [];
  const remaining = [...studentsWithCoords];

  let currentPoint = startPoint;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((student, idx) => {
      const dist = haversineDistance(
        currentPoint.lat,
        currentPoint.lng,
        student.drop_latitude!,
        student.drop_longitude!
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    const nearest = remaining.splice(nearestIdx, 1)[0];
    ordered.push(nearest.student_id);
    currentPoint = { lat: nearest.drop_latitude!, lng: nearest.drop_longitude! };
  }

  // Add students without coordinates at the end
  const studentsWithoutCoords = route.students.filter(
    (s) => !s.drop_latitude || !s.drop_longitude
  );
  ordered.push(...studentsWithoutCoords.map((s) => s.student_id));

  return ordered;
}
