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

const computeLive = (lastSeenAt: string | null, status: string, isTrackingEnabled: boolean) => {
  if (!lastSeenAt) {
    return { minutesSince: Number.POSITIVE_INFINITY, isLive: false };
  }
  const minutesSince = (Date.now() - new Date(lastSeenAt).getTime()) / 60000;
  const isLive =
    isTrackingEnabled &&
    Number.isFinite(minutesSince) &&
    minutesSince >= 0 &&
    minutesSince <= INACTIVITY_THRESHOLD_MIN &&
    (status === "online" || status === "on_trip");
  return { minutesSince, isLive };
};

export function isGpsLive(driver: {
  is_live?: boolean;
  last_seen_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string | null;
  minutes_since_last_seen?: number | null;
}): boolean {
  if (driver.latitude == null || driver.longitude == null) return false;
  if (!driver.last_seen_at) return false;
  const status = driver.status || "";
  if (status !== "online" && status !== "on_trip") return false;
  const minutesSince =
    driver.minutes_since_last_seen != null
      ? driver.minutes_since_last_seen
      : (Date.now() - new Date(driver.last_seen_at).getTime()) / 60000;
  return (
    driver.is_live === true &&
    Number.isFinite(minutesSince) &&
    minutesSince >= 0 &&
    minutesSince <= INACTIVITY_THRESHOLD_MIN
  );
}

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
      const lastSeen = row.last_seen_at || null;
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
        last_seen_at: lastSeen || "",
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
    const id = Number(opts.schoolId);
    return all.filter((d) =>
      (d.schools_serving || []).some((schoolId) => Number(schoolId) === id)
    );
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
 * Falls back to student profile coordinates when trip_students coords are empty.
 */
export async function getTripStopsForSessions(
  tripSessionIds: number[],
  opts?: { driverIds?: number[]; sessionDriverMap?: Map<number, number> }
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
      students!trip_students_student_id_fkey (
        name,
        pickup_latitude,
        pickup_longitude,
        drop_latitude,
        drop_longitude
      ),
      trip_sessions!trip_students_trip_session_id_fkey ( driver_id, trip_type )
    `
    )
    .in("trip_session_id", tripSessionIds);

  if (error) throw error;

  const driverIdSet = opts?.driverIds ? new Set(opts.driverIds) : null;
  const stops: TripStop[] = [];

  for (const row of data || []) {
    const driverId =
      row.trip_sessions?.driver_id ??
      opts?.sessionDriverMap?.get(row.trip_session_id) ??
      0;
    if (driverIdSet && driverId && !driverIdSet.has(driverId)) continue;

    const tripType = (row.trip_sessions?.trip_type || "").toLowerCase();
    const studentName = row.students?.name || `Student ${row.student_id}`;
    const student = row.students;

    const pickupLat = row.pickup_latitude ?? student?.pickup_latitude;
    const pickupLng = row.pickup_longitude ?? student?.pickup_longitude;
    const dropLat = row.drop_latitude ?? student?.drop_latitude;
    const dropLng = row.drop_longitude ?? student?.drop_longitude;

    if (pickupLat != null && pickupLng != null && isValidCoord(Number(pickupLat), Number(pickupLng))) {
      stops.push({
        trip_student_id: row.trip_student_id,
        trip_session_id: row.trip_session_id,
        driver_id: driverId,
        student_id: row.student_id,
        student_name: studentName,
        stop_type: "pickup",
        latitude: Number(pickupLat),
        longitude: Number(pickupLng),
        order: row.pickup_order ?? 0,
        status: row.pickup_status || "scheduled",
        completed_at: row.pickup_time,
      });
    }

    if (
      dropLat != null &&
      dropLng != null &&
      isValidCoord(Number(dropLat), Number(dropLng)) &&
      (tripType.includes("drop") || row.drop_order != null)
    ) {
      stops.push({
        trip_student_id: row.trip_student_id,
        trip_session_id: row.trip_session_id,
        driver_id: driverId,
        student_id: row.student_id,
        student_name: studentName,
        stop_type: "drop",
        latitude: Number(dropLat),
        longitude: Number(dropLng),
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

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Planned route from driver_trip_students when no live trip_students coords exist. */
async function getPlannedRouteStopsForDrivers(
  entries: Array<{ driver_id: number; school_id: number; trip_type: string | null }>
): Promise<Map<number, TripStop[]>> {
  const result = new Map<number, TripStop[]>();
  if (entries.length === 0) return result;

  const driverIds = [...new Set(entries.map((e) => e.driver_id))];
  const { data: trips, error: tripsError } = await db
    .from("driver_trips")
    .select("driver_trip_id, driver_id, school_id")
    .in("driver_id", driverIds)
    .eq("is_active", true);

  if (tripsError || !trips?.length) return result;

  const entryKey = (driverId: number, schoolId: number) => `${driverId}:${schoolId}`;
  const wanted = new Set(entries.map((e) => entryKey(e.driver_id, e.school_id)));

  const tripIds: number[] = [];
  const tripMeta = new Map<number, { driver_id: number; school_id: number }>();
  for (const trip of trips) {
    if (!wanted.has(entryKey(trip.driver_id, trip.school_id))) continue;
    tripIds.push(trip.driver_trip_id);
    tripMeta.set(trip.driver_trip_id, {
      driver_id: trip.driver_id,
      school_id: trip.school_id,
    });
  }

  if (tripIds.length === 0) return result;

  const { data: assignments, error: assignError } = await db
    .from("driver_trip_students")
    .select(
      `
      driver_trip_student_id,
      driver_trip_id,
      student_id,
      pickup_order,
      drop_order,
      students (
        name,
        pickup_latitude,
        pickup_longitude,
        drop_latitude,
        drop_longitude
      )
    `
    )
    .in("driver_trip_id", tripIds)
    .eq("is_active", true);

  if (assignError || !assignments?.length) return result;

  const tripTypeByDriver = new Map(entries.map((e) => [entryKey(e.driver_id, e.school_id), e.trip_type]));

  for (const row of assignments) {
    const meta = tripMeta.get(row.driver_trip_id);
    if (!meta) continue;
    const tripType = (
      tripTypeByDriver.get(entryKey(meta.driver_id, meta.school_id)) || ""
    ).toLowerCase();
    const student = row.students;
    const studentName = student?.name || `Student ${row.student_id}`;
    const list = result.get(meta.driver_id) || [];

    if (
      student?.pickup_latitude != null &&
      student?.pickup_longitude != null &&
      isValidCoord(Number(student.pickup_latitude), Number(student.pickup_longitude))
    ) {
      list.push({
        trip_student_id: row.driver_trip_student_id,
        trip_session_id: 0,
        driver_id: meta.driver_id,
        student_id: row.student_id,
        student_name: studentName,
        stop_type: "pickup",
        latitude: Number(student.pickup_latitude),
        longitude: Number(student.pickup_longitude),
        order: row.pickup_order ?? list.filter((s) => s.stop_type === "pickup").length + 1,
        status: "scheduled",
        completed_at: null,
      });
    }

    if (
      student?.drop_latitude != null &&
      student?.drop_longitude != null &&
      isValidCoord(Number(student.drop_latitude), Number(student.drop_longitude)) &&
      (tripType.includes("drop") || row.drop_order != null)
    ) {
      list.push({
        trip_student_id: row.driver_trip_student_id,
        trip_session_id: 0,
        driver_id: meta.driver_id,
        student_id: row.student_id,
        student_name: studentName,
        stop_type: "drop",
        latitude: Number(student.drop_latitude),
        longitude: Number(student.drop_longitude),
        order: row.drop_order ?? list.filter((s) => s.stop_type === "drop").length + 1,
        status: "scheduled",
        completed_at: null,
      });
    }

    result.set(meta.driver_id, list);
  }

  for (const [driverId, list] of result) {
    result.set(
      driverId,
      list.sort((a, b) => {
        if (a.stop_type !== b.stop_type) return a.stop_type === "pickup" ? -1 : 1;
        return a.order - b.order;
      })
    );
  }

  return result;
}

/** Order stops for map route line (pickups then drops, each by order). */
export function orderStopsForRoute(stops: TripStop[], tripType?: string | null): TripStop[] {
  const isDropTrip = (tripType || "").toLowerCase().includes("drop");
  if (isDropTrip) {
    const drops = stops.filter((s) => s.stop_type === "drop").sort((a, b) => a.order - b.order);
    if (drops.length > 0) return drops;
  }
  const pickups = stops.filter((s) => s.stop_type === "pickup").sort((a, b) => a.order - b.order);
  const drops = stops.filter((s) => s.stop_type === "drop").sort((a, b) => a.order - b.order);
  return [...pickups, ...drops];
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

export type DriverTripPhase =
  | "inactive"
  | "online"
  | "on_trip"
  | "completed_today";

export type DriverOperationRow = {
  driver_id: number;
  driver_name: string;
  cab_number: string;
  phone: string | null;
  vehicle_type: string;
  cab_capacity: number;
  is_verified: boolean;
  is_live: boolean;
  status: string;
  phase: DriverTripPhase;
  latitude: number | null;
  longitude: number | null;
  last_seen_at: string | null;
  minutes_since_last_seen: number | null;
  speed: number | null;
  battery_level: number | null;
  eta_minutes: number | null;
  eta_distance_km: number | null;
  student_etas: Record<string, number> | null;
  active_trip: ActiveTripForTracking | null;
  trip_type: string | null;
  trip_progress: string | null;
  trip_started_at: string | null;
  school_id: number | null;
  school_name: string | null;
  schools_serving: number[];
  livestream_enabled: boolean;
  picked_up_count: number;
  dropped_count: number;
  total_students: number;
  pending_pickups: number;
  pending_drops: number;
  last_pickup_student: string | null;
  last_pickup_at: string | null;
  next_student_name: string | null;
  next_stop_type: "pickup" | "drop" | null;
  next_eta_minutes: number | null;
  completed_trips_today: number;
  stops: TripStop[];
};

function countPendingStops(stops: TripStop[]): { pending_pickups: number; pending_drops: number } {
  const isPending = (s: TripStop) =>
    !["picked_up", "dropped", "completed", "cancelled", "absent"].includes(s.status);
  return {
    pending_pickups: stops.filter((s) => s.stop_type === "pickup" && isPending(s)).length,
    pending_drops: stops.filter((s) => s.stop_type === "drop" && isPending(s)).length,
  };
}

function buildDriverOperationRow(
  v: {
    driver_id: number;
    driver_name: string;
    cab_number: string;
    phone: string | null;
    vehicle_type: string;
    cab_capacity: number;
    is_verified: boolean;
    is_live: boolean;
    schools_serving?: number[];
    latitude: number | null;
    longitude: number | null;
    status: string | null;
    last_seen_at: string | null;
    battery_level: number | null;
  },
  live: DriverLiveLocation | undefined,
  trip: ActiveTripForTracking | null,
  stops: TripStop[],
  completedTripsToday: number,
  livestreamEnabled = false,
  etaEnabled = true
): DriverOperationRow {
  const isLive = live?.is_live ?? v.is_live;
  const status = live?.status || v.status || "offline";
  const phase = derivePhase(isLive, status, !!trip, completedTripsToday);
  const { name: lastPickupStudent, at: lastPickupAt } = findLastPickup(stops);
  const next = findNextStop(
    stops,
    trip?.trip_type ?? null,
    live?.student_etas ?? null,
    live?.eta_minutes ?? null
  );
  const { pending_pickups, pending_drops } = countPendingStops(stops);

  const picked = trip?.picked_up_count ?? 0;
  const dropped = trip?.dropped_count ?? 0;
  const total = trip?.total_students ?? 0;
  let tripProgress: string | null = null;
  if (trip) {
    tripProgress = `${picked}/${total} picked • ${dropped} dropped • ${pending_pickups} pending pickup`;
  } else if (completedTripsToday > 0) {
    tripProgress = `${completedTripsToday} trip(s) completed today`;
  }

  const lastSeen = live?.last_seen_at ?? v.last_seen_at;
  const minutesSince = lastSeen
    ? (Date.now() - new Date(lastSeen).getTime()) / 60000
    : live?.minutes_since_last_seen ?? null;

  return {
    driver_id: v.driver_id,
    driver_name: v.driver_name,
    cab_number: v.cab_number,
    phone: v.phone,
    vehicle_type: v.vehicle_type,
    cab_capacity: v.cab_capacity,
    is_verified: v.is_verified,
    is_live: isLive,
    status,
    phase,
    latitude: live?.latitude ?? v.latitude,
    longitude: live?.longitude ?? v.longitude,
    last_seen_at: lastSeen,
    minutes_since_last_seen: minutesSince,
    speed: live?.speed ?? null,
    battery_level: live?.battery_level ?? v.battery_level,
    eta_minutes: etaEnabled ? live?.eta_minutes ?? null : null,
    eta_distance_km: etaEnabled ? live?.eta_distance_km ?? null : null,
    student_etas: etaEnabled ? live?.student_etas ?? null : null,
    active_trip: trip,
    trip_type: trip?.trip_type ?? null,
    trip_progress: tripProgress,
    trip_started_at: trip?.actual_start_time ?? null,
    school_id: trip?.school_id ?? null,
    school_name: trip?.school_name ?? null,
    schools_serving: v.schools_serving || [],
    livestream_enabled: livestreamEnabled,
    picked_up_count: picked,
    dropped_count: dropped,
    total_students: total,
    pending_pickups,
    pending_drops,
    last_pickup_student: lastPickupStudent,
    last_pickup_at: lastPickupAt,
    next_student_name: next.name,
    next_stop_type: next.stop_type,
    next_eta_minutes: etaEnabled ? next.eta_minutes : null,
    completed_trips_today: completedTripsToday,
    stops,
  };
}
function derivePhase(
  isLive: boolean,
  status: string | null,
  hasActiveTrip: boolean,
  completedTripsToday: number
): DriverTripPhase {
  if (hasActiveTrip || (isLive && status === "on_trip")) return "on_trip";
  if (completedTripsToday > 0 && !hasActiveTrip) return "completed_today";
  if (isLive) return "online";
  return "inactive";
}

function findLastPickup(stops: TripStop[]): { name: string | null; at: string | null } {
  const pickups = stops
    .filter((s) => s.stop_type === "pickup" && s.status === "picked_up" && s.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
  if (pickups.length === 0) return { name: null, at: null };
  return { name: pickups[0].student_name, at: pickups[0].completed_at };
}

function findNextStop(
  stops: TripStop[],
  tripType: string | null,
  studentEtas: Record<string, number> | null,
  fallbackEta: number | null
): {
  name: string | null;
  stop_type: "pickup" | "drop" | null;
  eta_minutes: number | null;
} {
  const isDropTrip = (tripType || "").toLowerCase().includes("drop");
  const primaryType: "pickup" | "drop" = isDropTrip ? "drop" : "pickup";
  const pending = stops
    .filter(
      (s) =>
        s.stop_type === primaryType &&
        !["picked_up", "dropped", "completed", "cancelled", "absent"].includes(s.status)
    )
    .sort((a, b) => a.order - b.order);

  if (pending.length === 0) {
    const altType = primaryType === "pickup" ? "drop" : "pickup";
    const altPending = stops
      .filter(
        (s) =>
          s.stop_type === altType &&
          !["picked_up", "dropped", "completed", "cancelled", "absent"].includes(s.status)
      )
      .sort((a, b) => a.order - b.order);
    if (altPending.length === 0) {
      return { name: null, stop_type: null, eta_minutes: fallbackEta };
    }
    const next = altPending[0];
    const eta =
      studentEtas?.[String(next.student_id)] ??
      studentEtas?.[next.student_id] ??
      fallbackEta;
    return { name: next.student_name, stop_type: next.stop_type, eta_minutes: eta ?? null };
  }

  const next = pending[0];
  const eta =
    studentEtas?.[String(next.student_id)] ??
    studentEtas?.[next.student_id] ??
    fallbackEta;
  return { name: next.student_name, stop_type: next.stop_type, eta_minutes: eta ?? null };
}

async function getCompletedTripsTodayByDriver(opts?: {
  schoolId?: number;
}): Promise<Map<number, number>> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let query = db
    .from("trip_sessions")
    .select("driver_id, status, actual_end_time, updated_at")
    .eq("status", "completed")
    .gte("actual_end_time", todayStart.toISOString());

  if (opts?.schoolId != null) {
    query = query.eq("school_id", opts.schoolId);
  }

  const { data, error } = await query;
  if (error) {
    let fallback = db
      .from("trip_sessions")
      .select("driver_id, status, updated_at")
      .eq("status", "completed")
      .gte("updated_at", todayStart.toISOString());
    if (opts?.schoolId != null) fallback = fallback.eq("school_id", opts.schoolId);
    const { data: fbData, error: fbError } = await fallback;
    if (fbError) return new Map();
    const map = new Map<number, number>();
    for (const row of fbData || []) {
      if (row.driver_id == null) continue;
      map.set(row.driver_id, (map.get(row.driver_id) || 0) + 1);
    }
    return map;
  }

  const map = new Map<number, number>();
  for (const row of data || []) {
    if (row.driver_id == null) continue;
    map.set(row.driver_id, (map.get(row.driver_id) || 0) + 1);
  }
  return map;
}

/**
 * Unified driver operations rows: all fleet drivers + live trip/pickup/ETA context.
 */
export async function getDriverOperationsOverview(opts?: {
  schoolId?: number;
  driverIds?: number[];
}): Promise<DriverOperationRow[]> {
  const { getAllVehicles } = await import("./vehicleService");

  const [vehicles, liveLocations, activeTrips, completedTodayMap] = await Promise.all([
    getAllVehicles(opts?.schoolId != null ? { schoolId: opts.schoolId } : undefined),
    getLiveDriverLocations(opts),
    getActiveTripsForTracking(opts),
    getCompletedTripsTodayByDriver(opts),
  ]);

  const driverIdSet = opts?.driverIds?.length
    ? new Set(opts.driverIds)
    : null;
  const filteredVehicles = driverIdSet
    ? vehicles.filter((v) => driverIdSet.has(v.driver_id))
    : vehicles;

  const schoolIds = [
    ...new Set(
      activeTrips.map((t) => t.school_id).filter((id): id is number => id != null)
    ),
  ];
  const livestreamBySchool = new Map<number, boolean>();
  const etaBySchool = new Map<number, boolean>();
  if (schoolIds.length > 0) {
    const { data: schools } = await db
      .from("schools")
      .select("school_id, livestream_enabled, eta_enabled")
      .in("school_id", schoolIds);
    for (const s of schools || []) {
      livestreamBySchool.set(s.school_id, !!s.livestream_enabled);
      etaBySchool.set(s.school_id, s.eta_enabled !== false);
    }
  }

  const liveByDriver = new Map(liveLocations.map((d) => [d.driver_id, d]));
  const tripsByDriver = indexTripsByDriver(activeTrips);
  const tripSessionIds = activeTrips.map((t) => t.trip_session_id);
  const sessionDriverMap = new Map(
    activeTrips.map((t) => [t.trip_session_id, t.driver_id])
  );
  const allStops =
    tripSessionIds.length > 0
      ? await getTripStopsForSessions(tripSessionIds, { sessionDriverMap })
      : [];

  const stopsByDriver = new Map<number, TripStop[]>();
  for (const stop of allStops) {
    if (!stop.driver_id) continue;
    const list = stopsByDriver.get(stop.driver_id) || [];
    list.push(stop);
    stopsByDriver.set(stop.driver_id, list);
  }

  const needsPlanned: Array<{ driver_id: number; school_id: number; trip_type: string | null }> =
    [];
  for (const v of filteredVehicles) {
    const trip = tripsByDriver.get(v.driver_id) ?? null;
    const existing = stopsByDriver.get(v.driver_id) || [];
    if (existing.length === 0) {
      const schoolId = trip?.school_id ?? opts?.schoolId ?? null;
      if (schoolId != null) {
        needsPlanned.push({
          driver_id: v.driver_id,
          school_id: schoolId,
          trip_type: trip?.trip_type ?? null,
        });
      }
    }
  }

  const plannedStops = await getPlannedRouteStopsForDrivers(needsPlanned);
  for (const [driverId, planned] of plannedStops) {
    if (!stopsByDriver.has(driverId) || stopsByDriver.get(driverId)!.length === 0) {
      stopsByDriver.set(driverId, planned);
    }
  }

  return filteredVehicles.map((v) => {
    const live = liveByDriver.get(v.driver_id);
    const trip = tripsByDriver.get(v.driver_id) ?? null;
    const stops = stopsByDriver.get(v.driver_id) || [];
    const completedTripsToday = completedTodayMap.get(v.driver_id) || 0;
    const livestreamEnabled = trip?.school_id
      ? livestreamBySchool.get(trip.school_id) ?? false
      : false;
    const etaEnabled = trip?.school_id
      ? etaBySchool.get(trip.school_id) ?? true
      : true;
    return buildDriverOperationRow(
      v,
      live,
      trip,
      stops,
      completedTripsToday,
      livestreamEnabled,
      etaEnabled
    );
  });
}

export async function getDriverOperationById(
  driverId: number,
  opts?: { schoolId?: number; driverIds?: number[] }
): Promise<DriverOperationRow | null> {
  const rows = await getDriverOperationsOverview(opts);
  return rows.find((r) => r.driver_id === driverId) ?? null;
}
