import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type TripReportRow = {
  trip_session_id: number;
  driver_id: number;
  driver_name: string;
  cab_number: string;
  school_id: number | null;
  school_name: string | null;
  trip_type: string; // 'pickup' | 'drop' | 'round_trip'
  status: string; // 'started' | 'in_progress' | 'completed'
  scheduled_start_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  actual_duration_minutes: number | null;
  total_students: number | null;
  students_dropped: number | null;
  total_distance_km: number | null;
};

export interface ReportsFilter {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;
  driverId?: number;
  /**
   * Scope to drivers serving this school. Matches the school-admin's view in
   * every other page (Vehicles, Drivers, Live Tracking, Performance) — a driver
   * "serves" a school when school_id = ANY(drivers.schools_serving).
   */
  schoolId?: number;
  tripType?: "pickup" | "drop" | "round_trip" | "all";
  status?: "started" | "in_progress" | "completed" | "all";
}

/** Driver IDs whose `schools_serving` array contains the given school. */
async function driverIdsForSchool(schoolId: number): Promise<number[]> {
  const { data, error } = await db
    .from("drivers")
    .select("driver_id, schools_serving");
  if (error) throw error;
  return (data || [])
    .filter(
      (d: any) => Array.isArray(d.schools_serving) && d.schools_serving.includes(schoolId)
    )
    .map((d: any) => d.driver_id);
}

/**
 * Build a list of trip-session rows for the operational report.
 * If schoolId is provided, we filter to that specific school via trip_sessions.school_id.
 *
 * NOTE: trip_sessions has no formal FK to schools in the DB, so PostgREST can't
 * auto-join. We fetch schools separately and join in code.
 */
export async function getTripReports(filter: ReportsFilter = {}): Promise<TripReportRow[]> {
  // For school-admin scope: resolve "drivers serving this school" FIRST so we
  // can use `driver_id IN (...)` rather than the unreliable trip_sessions.school_id
  // column (which can be NULL or set inconsistently across older trips).
  let scopedDriverIds: number[] | null = null;
  if (filter.schoolId != null) {
    scopedDriverIds = await driverIdsForSchool(filter.schoolId);
    if (scopedDriverIds.length === 0) {
      // No drivers serve this school — nothing to report.
      return [];
    }
  }

  let query = db
    .from("trip_sessions")
    .select(
      `
      trip_session_id, driver_id, school_id, trip_type, status,
      scheduled_start_time, actual_start_time, actual_end_time,
      actual_duration_minutes, total_students, students_dropped, total_distance_km,
      drivers!trip_sessions_driver_id_fkey (driver_id, name, cab_number, schools_serving)
    `
    )
    .order("actual_start_time", { ascending: false, nullsFirst: false });

  if (filter.startDate) {
    query = query.gte("actual_start_time", `${filter.startDate}T00:00:00Z`);
  }
  if (filter.endDate) {
    query = query.lte("actual_start_time", `${filter.endDate}T23:59:59Z`);
  }
  if (filter.driverId) {
    query = query.eq("driver_id", filter.driverId);
  }
  if (scopedDriverIds) {
    query = query.in("driver_id", scopedDriverIds);
  }
  if (filter.tripType && filter.tripType !== "all") {
    query = query.eq("trip_type", filter.tripType);
  }
  if (filter.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  // Cap rows so a date-range catch-all doesn't blow up the page
  query = query.limit(2000);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];

  // Look up school names in one shot
  const schoolIds = Array.from(
    new Set(rows.map((r: any) => r.school_id).filter((id: any): id is number => id != null))
  );
  const schoolNameById = new Map<number, string>();
  if (schoolIds.length > 0) {
    const { data: schools } = await db
      .from("schools")
      .select("school_id, name")
      .in("school_id", schoolIds);
    for (const s of schools || []) {
      schoolNameById.set(s.school_id, s.name);
    }
  }

  return rows.map((row: any) => ({
    trip_session_id: row.trip_session_id,
    driver_id: row.driver_id,
    driver_name: row.drivers?.name || `Driver ${row.driver_id}`,
    cab_number: row.drivers?.cab_number || "",
    school_id: row.school_id,
    school_name: row.school_id != null ? schoolNameById.get(row.school_id) ?? null : null,
    trip_type: row.trip_type || "",
    status: row.status || "",
    scheduled_start_time: row.scheduled_start_time,
    actual_start_time: row.actual_start_time,
    actual_end_time: row.actual_end_time,
    actual_duration_minutes: row.actual_duration_minutes,
    total_students: row.total_students,
    students_dropped: row.students_dropped,
    total_distance_km: row.total_distance_km != null ? Number(row.total_distance_km) : null,
  }));
}
