import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type PerformanceStats = {
  tripsToday: number;
  tripsThisWeek: number;
  tripsThisMonth: number;
  activeDriversNow: number;
  registeredDrivers: number;
  morningTripsToday: number;
  dropTripsToday: number;
  avgDurationMinutes: number | null;
};

export type HourlyTripBar = {
  hour: string; // "00", "01", ...
  pickup: number;
  drop: number;
  total: number;
};

const fiveMinAgo = () => new Date(Date.now() - 5 * 60 * 1000).toISOString();
const startOfDay = (offsetDays = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

async function driverIdsForSchool(schoolId: number): Promise<number[]> {
  const { data } = await db.from("drivers").select("driver_id, schools_serving");
  return (data || [])
    .filter((d: any) => Array.isArray(d.schools_serving) && d.schools_serving.includes(schoolId))
    .map((d: any) => d.driver_id);
}

export async function getPerformanceStats(opts?: { schoolId?: number }): Promise<PerformanceStats> {
  const filterDriverIds: number[] | null =
    opts?.schoolId != null ? await driverIdsForSchool(opts.schoolId) : null;

  // helper to apply driver filter
  const applyDriverFilter = (q: any) =>
    filterDriverIds != null && filterDriverIds.length > 0 ? q.in("driver_id", filterDriverIds) : q;

  const todayStart = startOfDay(0);
  const weekStart = startOfDay(-6);
  const monthStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 29);
    return d.toISOString();
  })();

  // If filtering by school and no drivers serve it, short-circuit
  if (filterDriverIds != null && filterDriverIds.length === 0) {
    return {
      tripsToday: 0,
      tripsThisWeek: 0,
      tripsThisMonth: 0,
      activeDriversNow: 0,
      registeredDrivers: 0,
      morningTripsToday: 0,
      dropTripsToday: 0,
      avgDurationMinutes: null,
    };
  }

  // Trips today
  const tripsTodayQ = applyDriverFilter(
    db.from("trip_sessions")
      .select("trip_session_id, trip_type, actual_duration_minutes", { count: "exact" })
      .gte("actual_start_time", todayStart)
  );
  const tripsToday = await tripsTodayQ;
  if (tripsToday.error) throw tripsToday.error;

  // Trips this week
  const tripsWeek = await applyDriverFilter(
    db.from("trip_sessions")
      .select("trip_session_id", { count: "exact", head: true })
      .gte("actual_start_time", weekStart)
  );
  if (tripsWeek.error) throw tripsWeek.error;

  // Trips this month
  const tripsMonth = await applyDriverFilter(
    db.from("trip_sessions")
      .select("trip_session_id", { count: "exact", head: true })
      .gte("actual_start_time", monthStart)
  );
  if (tripsMonth.error) throw tripsMonth.error;

  // Active drivers now
  let activeDriversNow = 0;
  const activeQ = applyDriverFilter(
    db.from("driver_locations")
      .select("driver_id, status, is_tracking_enabled, last_seen_at")
      .gte("last_seen_at", fiveMinAgo())
  );
  const activeRes = await activeQ;
  if (!activeRes.error) {
    activeDriversNow = (activeRes.data || []).filter(
      (l: any) =>
        l.is_tracking_enabled !== false && (l.status === "online" || l.status === "on_trip")
    ).length;
  }

  // Total registered drivers (in scope)
  let registeredDrivers = 0;
  if (filterDriverIds != null) {
    registeredDrivers = filterDriverIds.length;
  } else {
    const { count } = await db
      .from("drivers")
      .select("driver_id", { count: "exact", head: true });
    registeredDrivers = count || 0;
  }

  const todays = tripsToday.data || [];
  const morningTripsToday = todays.filter(
    (t: any) => t.trip_type === "pickup" || t.trip_type === "round_trip"
  ).length;
  const dropTripsToday = todays.filter((t: any) => t.trip_type === "drop").length;

  const durations = todays
    .map((t: any) => t.actual_duration_minutes)
    .filter((d: any): d is number => typeof d === "number");
  const avgDurationMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((s: number, d: number) => s + d, 0) / durations.length)
      : null;

  return {
    tripsToday: tripsToday.count || 0,
    tripsThisWeek: tripsWeek.count || 0,
    tripsThisMonth: tripsMonth.count || 0,
    activeDriversNow,
    registeredDrivers,
    morningTripsToday,
    dropTripsToday,
    avgDurationMinutes,
  };
}

/**
 * Hourly trip distribution for the selected date.
 * Returns 24 rows (one per hour) with pickup/drop counts.
 */
export async function getHourlyTripDistribution(
  date: string,
  opts?: { schoolId?: number }
): Promise<HourlyTripBar[]> {
  const filterDriverIds: number[] | null =
    opts?.schoolId != null ? await driverIdsForSchool(opts.schoolId) : null;

  if (filterDriverIds != null && filterDriverIds.length === 0) {
    return buildEmpty();
  }

  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;

  let query = db
    .from("trip_sessions")
    .select("actual_start_time, trip_type, driver_id")
    .gte("actual_start_time", dayStart)
    .lte("actual_start_time", dayEnd);

  if (filterDriverIds != null) {
    query = query.in("driver_id", filterDriverIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  const buckets = buildEmpty();
  for (const row of data || []) {
    if (!row.actual_start_time) continue;
    const hour = new Date(row.actual_start_time).getHours();
    const slot = buckets[hour];
    if (row.trip_type === "pickup" || row.trip_type === "round_trip") slot.pickup += 1;
    else if (row.trip_type === "drop") slot.drop += 1;
    slot.total = slot.pickup + slot.drop;
  }
  return buckets;
}

function buildEmpty(): HourlyTripBar[] {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i.toString().padStart(2, "0"),
    pickup: 0,
    drop: 0,
    total: 0,
  }));
}
