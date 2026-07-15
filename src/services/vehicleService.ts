import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type Vehicle = {
  driver_id: number;
  cab_number: string;
  vehicle_type: string;
  cab_capacity: number;
  license_number: string | null;
  driver_name: string;
  phone: string | null;
  is_verified: boolean;
  schools_serving: number[];
  // Location-derived
  latitude: number | null;
  longitude: number | null;
  status: string | null; // "online" | "on_trip" | null
  last_seen_at: string | null;
  battery_level: number | null;
  is_tracking_enabled: boolean;
  // Derived
  is_live: boolean;
};

const INACTIVITY_THRESHOLD_MIN = 5;

/**
 * Get all vehicles in the fleet (one row per driver in the drivers table)
 * with the latest live status from driver_locations LEFT-joined.
 * Optionally filter to vehicles serving a specific school.
 */
export async function getAllVehicles(opts?: { schoolId?: number }): Promise<Vehicle[]> {
  // Step 1: load drivers (filtered by school if requested)
  let driversQuery = db
    .from("drivers")
    .select(
      "driver_id, name, phone, cab_number, vehicle_type, cab_capacity, license_number, is_verified, schools_serving"
    )
    .order("name", { ascending: true });

  const { data: drivers, error: driversError } = await driversQuery;
  if (driversError) throw driversError;

  const filteredDrivers = (drivers || []).filter((d: any) => {
    if (opts?.schoolId == null) return true;
    return Array.isArray(d.schools_serving) && d.schools_serving.includes(opts.schoolId);
  });

  if (filteredDrivers.length === 0) return [];

  // Step 2: fetch latest location for these drivers
  const driverIds = filteredDrivers.map((d: any) => d.driver_id);
  const { data: locations } = await db
    .from("driver_locations")
    .select("driver_id, latitude, longitude, status, last_seen_at, battery_level, is_tracking_enabled")
    .in("driver_id", driverIds);

  const locByDriver = new Map<number, any>();
  for (const loc of locations || []) {
    locByDriver.set(loc.driver_id, loc);
  }

  return filteredDrivers.map((d: any): Vehicle => {
    const loc = locByDriver.get(d.driver_id);
    const lastSeen: string | null = loc?.last_seen_at || null;
    const status: string | null = loc?.status || null;
    const trackingEnabled = loc?.is_tracking_enabled !== false;

    let isLive = false;
    if (lastSeen && trackingEnabled) {
      const minutesSince = (Date.now() - new Date(lastSeen).getTime()) / 60000;
      isLive =
        minutesSince <= INACTIVITY_THRESHOLD_MIN &&
        (status === "online" || status === "on_trip");
    }

    return {
      driver_id: d.driver_id,
      cab_number: d.cab_number || "",
      vehicle_type: d.vehicle_type || "",
      cab_capacity: d.cab_capacity || 0,
      license_number: d.license_number || null,
      driver_name: d.name || "Unknown",
      phone: d.phone || null,
      is_verified: !!d.is_verified,
      schools_serving: d.schools_serving || [],
      latitude: loc?.latitude != null ? Number(loc.latitude) : null,
      longitude: loc?.longitude != null ? Number(loc.longitude) : null,
      status,
      last_seen_at: lastSeen,
      battery_level: loc?.battery_level != null ? Number(loc.battery_level) : null,
      is_tracking_enabled: trackingEnabled,
      is_live: isLive,
    };
  });
}
