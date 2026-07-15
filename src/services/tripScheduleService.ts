import { supabase } from "@/integrations/supabase/client";

export interface TripSchedule {
  schedule_id: number;
  driver_id: number;
  driver_name: string;
  school_id: number;
  school_name: string;
  morning_start_time: string | null;
  evening_start_time: string | null;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripStartAlert {
  alert_id: number;
  driver_id: number;
  driver_name: string;
  school_id: number;
  school_name: string;
  alert_type: "morning" | "evening";
  expected_start_time: string;
  alert_date: string;
  alert_sent_at: string;
  status: "pending" | "acknowledged" | "resolved";
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface UpsertScheduleInput {
  driver_id: number;
  school_id: number;
  morning_start_time: string | null;
  evening_start_time: string | null;
}

/**
 * Get all trip schedules with driver and school names
 */
export async function getAllTripSchedules(options?: {
  schoolId?: number;
}): Promise<TripSchedule[]> {
  let query = supabase
    .from("driver_trip_schedules")
    .select(
      `
      *,
      drivers!inner (
        driver_id,
        name
      ),
      schools!inner (
        school_id,
        name
      )
    `
    );

  if (options?.schoolId != null) {
    query = query.eq("school_id", options.schoolId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    schedule_id: row.schedule_id,
    driver_id: row.driver_id,
    driver_name: row.drivers?.name || "Unknown Driver",
    school_id: row.school_id,
    school_name: row.schools?.name || "Unknown School",
    morning_start_time: row.morning_start_time,
    evening_start_time: row.evening_start_time,
    is_active: row.is_active,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Get all drivers with their schools_serving for the schedule form dropdown
 */
export async function getDriversForSchedule(): Promise<
  Array<{ driver_id: number; name: string; schools_serving: number[] }>
> {
  const { data, error } = await supabase
    .from("drivers")
    .select("driver_id, name, schools_serving")
    .order("name");

  if (error) throw error;
  return (data || []).map((d: any) => ({
    driver_id: d.driver_id,
    name: d.name || "Unknown",
    schools_serving: d.schools_serving || [],
  }));
}

/**
 * Get schools by IDs (for populating school dropdown based on driver's schools_serving)
 */
export async function getSchoolsByIds(
  schoolIds: number[]
): Promise<Array<{ school_id: number; name: string }>> {
  if (schoolIds.length === 0) return [];

  const { data, error } = await supabase
    .from("schools")
    .select("school_id, name")
    .in("school_id", schoolIds)
    .order("name");

  if (error) throw error;
  return data || [];
}

/**
 * Upsert a trip schedule (create or update)
 */
export async function upsertTripSchedule(
  input: UpsertScheduleInput,
  adminUserId: string
): Promise<void> {
  const { error } = await supabase
    .from("driver_trip_schedules")
    .upsert(
      {
        driver_id: input.driver_id,
        school_id: input.school_id,
        morning_start_time: input.morning_start_time,
        evening_start_time: input.evening_start_time,
        is_active: true,
        updated_by: adminUserId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "driver_id,school_id",
        ignoreDuplicates: false,
      }
    );

  if (error) throw error;
}

/**
 * Soft-delete a trip schedule (set is_active = false)
 */
export async function deleteTripSchedule(
  driverId: number,
  schoolId: number
): Promise<void> {
  const { error } = await supabase
    .from("driver_trip_schedules")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("driver_id", driverId)
    .eq("school_id", schoolId);

  if (error) throw error;
}

/**
 * Re-activate a trip schedule
 */
export async function activateTripSchedule(
  driverId: number,
  schoolId: number
): Promise<void> {
  const { error } = await supabase
    .from("driver_trip_schedules")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("driver_id", driverId)
    .eq("school_id", schoolId);

  if (error) throw error;
}

/**
 * Get today's trip start alerts with driver and school names
 */
export async function getTodayAlerts(): Promise<TripStartAlert[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("trip_start_alerts")
    .select(
      `
      *,
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
    .eq("alert_date", today)
    .order("alert_sent_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    alert_id: row.alert_id,
    driver_id: row.driver_id,
    driver_name: row.drivers?.name || "Unknown Driver",
    school_id: row.school_id,
    school_name: row.schools?.name || "Unknown School",
    alert_type: row.alert_type,
    expected_start_time: row.expected_start_time,
    alert_date: row.alert_date,
    alert_sent_at: row.alert_sent_at,
    status: row.status,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    notes: row.notes,
    created_at: row.created_at,
  }));
}

/**
 * Get alerts by date range
 */
export async function getAlertsByDateRange(
  startDate: string,
  endDate: string
): Promise<TripStartAlert[]> {
  const { data, error } = await supabase
    .from("trip_start_alerts")
    .select(
      `
      *,
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
    .gte("alert_date", startDate)
    .lte("alert_date", endDate)
    .order("alert_sent_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    alert_id: row.alert_id,
    driver_id: row.driver_id,
    driver_name: row.drivers?.name || "Unknown Driver",
    school_id: row.school_id,
    school_name: row.schools?.name || "Unknown School",
    alert_type: row.alert_type,
    expected_start_time: row.expected_start_time,
    alert_date: row.alert_date,
    alert_sent_at: row.alert_sent_at,
    status: row.status,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    notes: row.notes,
    created_at: row.created_at,
  }));
}

/**
 * Get alerts for a specific date
 */
export async function getAlertsByDate(
  date: string,
  options?: { schoolId?: number }
): Promise<TripStartAlert[]> {
  let query = supabase
    .from("trip_start_alerts")
    .select(
      `
      *,
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
    .eq("alert_date", date);

  if (options?.schoolId != null) {
    query = query.eq("school_id", options.schoolId);
  }

  const { data, error } = await query.order("alert_sent_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    alert_id: row.alert_id,
    driver_id: row.driver_id,
    driver_name: row.drivers?.name || "Unknown Driver",
    school_id: row.school_id,
    school_name: row.schools?.name || "Unknown School",
    alert_type: row.alert_type,
    expected_start_time: row.expected_start_time,
    alert_date: row.alert_date,
    alert_sent_at: row.alert_sent_at,
    status: row.status,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    notes: row.notes,
    created_at: row.created_at,
  }));
}

/**
 * Get all alerts for a specific driver (for history/tracking)
 */
export async function getDriverAlertHistory(
  driverId: number
): Promise<TripStartAlert[]> {
  const { data, error } = await supabase
    .from("trip_start_alerts")
    .select(
      `
      *,
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
    .eq("driver_id", driverId)
    .order("alert_date", { ascending: false })
    .order("alert_sent_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    alert_id: row.alert_id,
    driver_id: row.driver_id,
    driver_name: row.drivers?.name || "Unknown Driver",
    school_id: row.school_id,
    school_name: row.schools?.name || "Unknown School",
    alert_type: row.alert_type,
    expected_start_time: row.expected_start_time,
    alert_date: row.alert_date,
    alert_sent_at: row.alert_sent_at,
    status: row.status,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    notes: row.notes,
    created_at: row.created_at,
  }));
}

/**
 * Update alert status (acknowledge or resolve)
 */
export async function updateAlertStatus(
  alertId: number,
  status: "acknowledged" | "resolved",
  userId: string,
  notes?: string
): Promise<void> {
  const updateData: Record<string, any> = { status };

  if (status === "resolved") {
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = userId;
  }

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const { error } = await supabase
    .from("trip_start_alerts")
    .update(updateData)
    .eq("alert_id", alertId);

  if (error) throw error;
}
