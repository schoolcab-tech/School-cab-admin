import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type DriverLiveLocation = {
  driver_id: number;
  driver_name: string;
  cab_number: string;
  phone: string | null;
  vehicle_type: string;
  is_verified: boolean;
  latitude: number;
  longitude: number;
  status: string; // "online" | "on_trip" | other
  battery_level: number | null;
  heading: number | null;
  speed: number | null;
  last_seen_at: string;
  is_tracking_enabled: boolean;
  schools_serving: number[];
  eta_minutes: number | null;
  eta_distance_km: number | null;
  student_etas: Record<string, number> | null;
  /** Derived field: is the driver considered "live" right now? */
  is_live: boolean;
  minutes_since_last_seen: number;
};

export type ActiveTripForTracking = {
  trip_session_id: number;
  driver_id: number;
  driver_name: string;
  cab_number: string;
  school_id: number | null;
  school_name: string | null;
  trip_type: string;
  status: string;
  total_students: number;
  picked_up_count: number;
  dropped_count: number;
  actual_start_time: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
};

export type TripStop = {
  trip_student_id: number;
  trip_session_id: number;
  driver_id: number;
  student_id: number;
  student_name: string;
  stop_type: "pickup" | "drop";
  latitude: number;
  longitude: number;
  order: number;
  status: string;
  completed_at: string | null;
};

const INACTIVITY_THRESHOLD_MIN = 5;

const computeLive = (lastSeenAt: string, status: string, isTrackingEnabled: boolean) => {
  const minutesSince = (Date.now() - new Date(lastSeenAt).getTime()) / 60000;
  const isLive =
    isTrackingEnabled &&
    minutesSince <= INACTIVITY_THRESHOLD_MIN &&
    (status === "online" || status === "on_trip");
  return { minutesSince, isLive };
};

export function formatCoordinates(lat: number, lng: number, precision = 6): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Fetch all drivers with a recent location entry.
 * Optionally filtered to drivers serving a specific school.
 */
export async function getLiveDriverLocations(opts?: {
  schoolId?: number;
}): Promise<DriverLiveLocation[]> {
  const query = db
    .from("driver_locations")
    .select(
      `
      driver_id, latitude, longitude, status, battery_level, heading, speed,
      last_seen_at, is_tracking_enabled, eta_minutes, eta_distance_km, student_etas,
      drivers!driver_locations_driver_id_fkey (
        driver_id, name, cab_number, phone, vehicle_type, is_verified, schools_serving
      )
    `
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const { data, error } = await query;
  if (error) throw error;

  const all: DriverLiveLocation[] = (data || [])
    .filter((row: any) => row.drivers)
    .map((row: any) => {
      const lastSeen = row.last_seen_at || row.updated_at || new Date().toISOString();
      const { minutesSince, isLive } = computeLive(
        lastSeen,
        row.status || "",
        row.is_tracking_enabled !== false
      );
      return {
        driver_id: row.driver_id,
        driver_name: row.drivers?.name || `Driver ${row.driver_id}`,
        cab_number: row.drivers?.cab_number || "",
        phone: row.drivers?.phone || null,
        vehicle_type: row.drivers?.vehicle_type || "",
        is_verified: row.drivers?.is_verified ?? false,
        schools_serving: row.drivers?.schools_serving || [],
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        status: row.status || "",
        battery_level: row.battery_level != null ? Number(row.battery_level) : null,
        heading: row.heading != null ? Number(row.heading) : null,
        speed: row.speed != null ? Number(row.speed) : null,
        last_seen_at: lastSeen,
        is_tracking_enabled: row.is_tracking_enabled !== false,
        eta_minutes: row.eta_minutes != null ? Number(row.eta_minutes) : null,
        eta_distance_km: row.eta_distance_km != null ? Number(row.eta_distance_km) : null,
        student_etas:
          row.student_etas && typeof row.student_etas === "object"
            ? (row.student_etas as Record<string, number>)
            : null,
        is_live: isLive,
        minutes_since_last_seen: minutesSince,
      };
    });

  if (opts?.schoolId != null) {
    const id = opts.schoolId;
    return all.filter((d) => d.schools_serving.includes(id));
  }
  return all;
}

/**
 * Fetch active trip sessions for live tracking.
 * Uses active_trip_sessions view when available; falls back to trip_sessions query.
 */
export async function getActiveTripsForTracking(opts?: {
  schoolId?: number;
}): Promise<ActiveTripForTracking[]> {
  let query = db.from("active_trip_sessions").select("*");

  if (opts?.schoolId != null) {
    query = query.eq("school_id", opts.schoolId);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback if view is unavailable
    let fallback = db
      .from("trip_sessions")
      .select(
        `
        trip_session_id, driver_id, school_id, trip_type, status,
        total_students, students_dropped, actual_start_time,
        start_latitude, start_longitude,
        drivers!trip_sessions_driver_id_fkey ( name, cab_number ),
        schools ( name )
      `
      )
      .in("status", ["started", "in_progress"]);

    if (opts?.schoolId != null) {
      fallback = fallback.eq("school_id", opts.schoolId);
    }

    const { data: fallbackData, error: fallbackError } = await fallback;
    if (fallbackError) throw fallbackError;

    return (fallbackData || []).map((row: any) => ({
      trip_session_id: row.trip_session_id,
      driver_id: row.driver_id,
      driver_name: row.drivers?.name || `Driver ${row.driver_id}`,
      cab_number: row.drivers?.cab_number || "",
      school_id: row.school_id,
      school_name: row.schools?.name || null,
      trip_type: row.trip_type || "",
      status: row.status || "",
      total_students: row.total_students ?? 0,
      picked_up_count: 0,
      dropped_count: row.students_dropped ?? 0,
      actual_start_time: row.actual_start_time,
      start_latitude: row.start_latitude != null ? Number(row.start_latitude) : null,
      start_longitude: row.start_longitude != null ? Number(row.start_longitude) : null,
    }));
  }

  return (data || []).map((row: any) => ({
    trip_session_id: row.trip_session_id,
    driver_id: row.driver_id,
    driver_name: row.driver_name || `Driver ${row.driver_id}`,
    cab_number: row.cab_number || "",
    school_id: row.school_id,
    school_name: row.school_name || null,
    trip_type: row.trip_type || "",
    status: row.status || "",
    total_students: row.total_students ?? 0,
    picked_up_count: row.picked_up_count ?? 0,
    dropped_count: row.dropped_count ?? 0,
    actual_start_time: row.actual_start_time,
    start_latitude: row.start_latitude != null ? Number(row.start_latitude) : null,
    start_longitude: row.start_longitude != null ? Number(row.start_longitude) : null,
  }));
}

/**
 * Fetch pickup/drop stops for one or more active trip sessions.
 */
export async function getTripStopsForSessions(
  tripSessionIds: number[],
  opts?: { driverIds?: number[] }
): Promise<TripStop[]> {
  if (tripSessionIds.length === 0) return [];

  const { data, error } = await db
    .from("trip_students")
    .select(
      `
      trip_student_id, trip_session_id, student_id,
      pickup_latitude, pickup_longitude, drop_latitude, drop_longitude,
      pickup_order, drop_order, pickup_status, drop_status,
      pickup_time, drop_time,
      students!trip_students_student_id_fkey ( name ),
      trip_sessions!trip_students_trip_session_id_fkey ( driver_id, trip_type )
    `
    )
    .in("trip_session_id", tripSessionIds);

  if (error) throw error;

  const driverIdSet = opts?.driverIds ? new Set(opts.driverIds) : null;
  const stops: TripStop[] = [];

  for (const row of data || []) {
    const driverId = row.trip_sessions?.driver_id;
    if (driverIdSet && driverId != null && !driverIdSet.has(driverId)) continue;

    const tripType = (row.trip_sessions?.trip_type || "").toLowerCase();
    const studentName = row.students?.name || `Student ${row.student_id}`;

    if (row.pickup_latitude != null && row.pickup_longitude != null) {
      stops.push({
        trip_student_id: row.trip_student_id,
        trip_session_id: row.trip_session_id,
        driver_id: driverId,
        student_id: row.student_id,
        student_name: studentName,
        stop_type: "pickup",
        latitude: Number(row.pickup_latitude),
        longitude: Number(row.pickup_longitude),
        order: row.pickup_order ?? 0,
        status: row.pickup_status || "scheduled",
        completed_at: row.pickup_time,
      });
    }

    if (
      row.drop_latitude != null &&
      row.drop_longitude != null &&
      (tripType.includes("drop") || row.drop_order != null)
    ) {
      stops.push({
        trip_student_id: row.trip_student_id,
        trip_session_id: row.trip_session_id,
        driver_id: driverId,
        student_id: row.student_id,
        student_name: studentName,
        stop_type: "drop",
        latitude: Number(row.drop_latitude),
        longitude: Number(row.drop_longitude),
        order: row.drop_order ?? 0,
        status: row.drop_status || "scheduled",
        completed_at: row.drop_time,
      });
    }
  }

  return stops.sort((a, b) => {
    if (a.driver_id !== b.driver_id) return a.driver_id - b.driver_id;
    if (a.stop_type !== b.stop_type) return a.stop_type === "pickup" ? -1 : 1;
    return a.order - b.order;
  });
}

/** Convenience: active trips keyed by driver_id */
export function indexTripsByDriver(
  trips: ActiveTripForTracking[]
): Map<number, ActiveTripForTracking> {
  const map = new Map<number, ActiveTripForTracking>();
  for (const trip of trips) {
    if (trip.driver_id != null) map.set(trip.driver_id, trip);
  }
  return map;
}
