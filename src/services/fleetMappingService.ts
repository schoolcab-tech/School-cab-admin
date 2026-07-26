import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FleetCabMapping = Database["public"]["Tables"]["fleet_cab_mappings"]["Row"];
type FleetCabMappingInsert = Database["public"]["Tables"]["fleet_cab_mappings"]["Insert"];

export type DriverWithMapping = {
  driver_id: number;
  name: string | null;
  phone: string | null;
  cab_number: string;
  cab_capacity: number;
  vehicle_type: string;
  is_verified: boolean | null;
  avg_rating: number | null;
  schools_serving?: number[] | null;
  mapping?: FleetCabMapping;
};

export type MappingHistory = FleetCabMapping & {
  owner_name?: string;
  assigned_by_name?: string;
  unassigned_by_name?: string;
};

/**
 * Get all drivers mapped to a specific owner
 */
export const getDriversByOwnerId = async (
  ownerId: number
): Promise<DriverWithMapping[]> => {
  const { data, error } = await supabase
    .from("fleet_cab_mappings")
    .select(`
      *,
      drivers(
        driver_id,
        name,
        phone,
        cab_number,
        cab_capacity,
        vehicle_type,
        is_verified,
        avg_rating,
        schools_serving
      )
    `)
    .eq("owner_id", ownerId)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  // Transform to flat structure
  return data.map((mapping) => ({
    ...(mapping.drivers as any),
    mapping: {
      mapping_id: mapping.mapping_id,
      owner_id: mapping.owner_id,
      driver_id: mapping.driver_id,
      assigned_at: mapping.assigned_at,
      assigned_by: mapping.assigned_by,
      unassigned_at: mapping.unassigned_at,
      unassigned_by: mapping.unassigned_by,
      is_active: mapping.is_active,
      notes: mapping.notes,
      created_at: mapping.created_at,
      updated_at: mapping.updated_at,
    },
  }));
};

/**
 * Get all driver mappings - Master admin only
 */
export const getAllDriverMappings = async (): Promise<DriverWithMapping[]> => {
  const { data, error } = await supabase
    .from("fleet_cab_mappings")
    .select(`
      *,
      drivers(
        driver_id,
        name,
        phone,
        cab_number,
        cab_capacity,
        vehicle_type,
        is_verified,
        avg_rating
      ),
      fleet_owners(
        owner_id,
        company_name,
        contact_person
      )
    `)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  return data.map((mapping) => ({
    ...(mapping.drivers as any),
    mapping: {
      mapping_id: mapping.mapping_id,
      owner_id: mapping.owner_id,
      driver_id: mapping.driver_id,
      assigned_at: mapping.assigned_at,
      assigned_by: mapping.assigned_by,
      unassigned_at: mapping.unassigned_at,
      unassigned_by: mapping.unassigned_by,
      is_active: mapping.is_active,
      notes: mapping.notes,
      created_at: mapping.created_at,
      updated_at: mapping.updated_at,
    },
    owner_info: mapping.fleet_owners,
  }));
};

/**
 * Get unassigned drivers - Drivers not mapped to any owner
 */
export const getUnassignedDrivers = async (): Promise<DriverWithMapping[]> => {
  // First get all driver IDs that are currently assigned
  const { data: assignedMappings, error: mappingError } = await supabase
    .from("fleet_cab_mappings")
    .select("driver_id")
    .eq("is_active", true);

  if (mappingError) throw mappingError;

  const assignedDriverIds = assignedMappings?.map((m) => m.driver_id) || [];

  // Get all drivers
  let query = supabase
    .from("drivers")
    .select(`
      driver_id,
      name,
      phone,
      cab_number,
      cab_capacity,
      vehicle_type,
      is_verified,
      avg_rating
    `)
    .order("created_at", { ascending: false });

  // Exclude assigned drivers if there are any
  if (assignedDriverIds.length > 0) {
    query = query.not("driver_id", "in", `(${assignedDriverIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

/**
 * Assign a driver to a fleet owner
 */
export const assignDriverToOwner = async (
  driverId: number,
  ownerId: number,
  assignedBy: string,
  notes?: string
): Promise<FleetCabMapping> => {
  // Check if driver is already assigned to someone
  const { data: existingMapping, error: checkError } = await supabase
    .from("fleet_cab_mappings")
    .select("*")
    .eq("driver_id", driverId)
    .eq("is_active", true)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existingMapping) {
    throw new Error(
      `Driver is already assigned to fleet owner ID: ${existingMapping.owner_id}`
    );
  }

  const { data, error } = await supabase
    .from("fleet_cab_mappings")
    .insert({
      driver_id: driverId,
      owner_id: ownerId,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
      is_active: true,
      notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Update the total_cabs_assigned count for the owner
  await updateOwnerCabCount(ownerId);

  return data;
};

/**
 * Unassign a driver from a fleet owner
 */
export const unassignDriverFromOwner = async (
  mappingId: number,
  unassignedBy: string,
  notes?: string
): Promise<FleetCabMapping> => {
  // Get the mapping to find the owner_id
  const { data: mapping, error: fetchError } = await supabase
    .from("fleet_cab_mappings")
    .select("owner_id")
    .eq("mapping_id", mappingId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from("fleet_cab_mappings")
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString(),
      unassigned_by: unassignedBy,
      notes: notes || undefined,
    })
    .eq("mapping_id", mappingId)
    .select()
    .single();

  if (error) throw error;

  // Update the total_cabs_assigned count for the owner
  await updateOwnerCabCount(mapping.owner_id);

  return data;
};

/**
 * Get mapping history for a driver - Shows all assignments/unassignments
 */
export const getMappingHistory = async (driverId: number): Promise<MappingHistory[]> => {
  const { data, error } = await supabase
    .from("fleet_cab_mappings")
    .select(`
      *,
      fleet_owners(company_name, contact_person)
    `)
    .eq("driver_id", driverId)
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  return data.map((mapping) => ({
    ...mapping,
    owner_name: (mapping.fleet_owners as any)?.company_name,
  }));
};

/**
 * Helper function to update the total_cabs_assigned count for a fleet owner
 */
const updateOwnerCabCount = async (ownerId: number): Promise<void> => {
  // Count active mappings for this owner
  const { count, error } = await supabase
    .from("fleet_cab_mappings")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("is_active", true);

  if (error) throw error;

  // Update the fleet owner's total_cabs_assigned
  await supabase
    .from("fleet_owners")
    .update({ total_cabs_assigned: count || 0 })
    .eq("owner_id", ownerId);
};

/**
 * Reassign a driver from one owner to another
 */
export const reassignDriver = async (
  driverId: number,
  newOwnerId: number,
  assignedBy: string,
  notes?: string
): Promise<FleetCabMapping> => {
  // Find the current active mapping
  const { data: currentMapping, error: findError } = await supabase
    .from("fleet_cab_mappings")
    .select("mapping_id, owner_id")
    .eq("driver_id", driverId)
    .eq("is_active", true)
    .maybeSingle();

  if (findError) throw findError;

  if (currentMapping) {
    // Unassign from current owner
    await unassignDriverFromOwner(
      currentMapping.mapping_id,
      assignedBy,
      `Reassigned to owner ${newOwnerId}`
    );
  }

  // Assign to new owner
  return await assignDriverToOwner(driverId, newOwnerId, assignedBy, notes);
};

/**
 * Bulk assign multiple drivers to an owner
 */
export const bulkAssignDrivers = async (
  driverIds: number[],
  ownerId: number,
  assignedBy: string,
  notes?: string
): Promise<FleetCabMapping[]> => {
  const mappings: FleetCabMappingInsert[] = driverIds.map((driverId) => ({
    driver_id: driverId,
    owner_id: ownerId,
    assigned_by: assignedBy,
    assigned_at: new Date().toISOString(),
    is_active: true,
    notes,
  }));

  const { data, error } = await supabase
    .from("fleet_cab_mappings")
    .insert(mappings)
    .select();

  if (error) throw error;

  // Update the total_cabs_assigned count
  await updateOwnerCabCount(ownerId);

  return data;
};
