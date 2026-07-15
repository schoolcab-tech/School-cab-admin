import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FleetOwner = Database["public"]["Tables"]["fleet_owners"]["Row"];
type FleetOwnerInsert = Database["public"]["Tables"]["fleet_owners"]["Insert"];
type FleetOwnerUpdate = Database["public"]["Tables"]["fleet_owners"]["Update"];

export type FleetOwnerWithStats = FleetOwner & {
  active_drivers_count?: number;
  total_students?: number;
  monthly_revenue?: number;
};

export type CreateFleetOwnerInput = {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  pan_number?: string;
  password: string; // For creating auth user
};

export type UpdateFleetOwnerInput = Partial<Omit<CreateFleetOwnerInput, 'password' | 'email'>>;

/**
 * Get all fleet owners - Master admin only
 */
export const getAllFleetOwners = async (): Promise<FleetOwnerWithStats[]> => {
  const { data, error } = await supabase
    .from("fleet_owners")
    .select(`
      *,
      fleet_cab_mappings!fleet_cab_mappings_owner_id_fkey(
        mapping_id,
        is_active
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Calculate stats for each owner
  const ownersWithStats = data.map((owner) => {
    const activeMappings = owner.fleet_cab_mappings?.filter((m) => m.is_active) || [];
    return {
      ...owner,
      active_drivers_count: activeMappings.length,
      fleet_cab_mappings: undefined, // Remove the join data
    };
  });

  return ownersWithStats;
};

/**
 * Get fleet owner by ID
 */
export const getFleetOwnerById = async (ownerId: number): Promise<FleetOwner> => {
  const { data, error } = await supabase
    .from("fleet_owners")
    .select("*")
    .eq("owner_id", ownerId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get fleet owner by user ID - For sub-admin's own data
 */
export const getFleetOwnerByUserId = async (userId: string): Promise<FleetOwner> => {
  const { data, error } = await supabase
    .from("fleet_owners")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create a new fleet owner - Master admin only
 * Creates user in auth.users, adds to fleet_owners, and sets role to 'sub_admin' in user_roles
 */
export const createFleetOwner = async (
  input: CreateFleetOwnerInput,
  adminUserId: string
): Promise<FleetOwner> => {
  // Call the Postgres function to create the fleet owner
  const { data, error } = await supabase.rpc('create_fleet_owner_user', {
    p_email: input.email,
    p_password: input.password,
    p_company_name: input.company_name,
    p_contact_person: input.contact_person,
    p_phone: input.phone,
    p_address: input.address || null,
    p_city: input.city || null,
    p_state: input.state || null,
    p_pincode: input.pincode || null,
    p_gst_number: input.gst_number || null,
    p_pan_number: input.pan_number || null,
    p_admin_user_id: adminUserId,
  });

  if (error) throw error;
  if (!data || !data.owner_id) throw new Error("Failed to create fleet owner");

  // Fetch and return the created fleet owner
  const { data: fleetOwner, error: fetchError } = await supabase
    .from("fleet_owners")
    .select("*")
    .eq("owner_id", data.owner_id)
    .single();

  if (fetchError) throw fetchError;
  return fleetOwner;
};

/**
 * Update fleet owner - Master admin or the sub-admin themselves
 */
export const updateFleetOwner = async (
  ownerId: number,
  input: UpdateFleetOwnerInput
): Promise<FleetOwner> => {
  const updateData: FleetOwnerUpdate = {
    company_name: input.company_name,
    contact_person: input.contact_person,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    gst_number: input.gst_number,
    pan_number: input.pan_number,
  };

  const { data, error } = await supabase
    .from("fleet_owners")
    .update(updateData)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Suspend fleet owner - Master admin only
 */
export const suspendFleetOwner = async (ownerId: number): Promise<FleetOwner> => {
  const { data, error } = await supabase
    .from("fleet_owners")
    .update({ is_active: false })
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Activate fleet owner - Master admin only
 */
export const activateFleetOwner = async (ownerId: number): Promise<FleetOwner> => {
  const { data, error } = await supabase
    .from("fleet_owners")
    .update({ is_active: true })
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Verify fleet owner - Master admin only
 */
export const verifyFleetOwner = async (
  ownerId: number,
  verifiedBy: string
): Promise<FleetOwner> => {
  const { data, error } = await supabase
    .from("fleet_owners")
    .update({
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy,
    })
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete fleet owner - Master admin only
 * Also deletes the associated auth user
 */
export const deleteFleetOwner = async (ownerId: number, adminUserId?: string): Promise<void> => {
  const { data, error } = await supabase.rpc('delete_fleet_owner_user', {
    p_owner_id: ownerId,
    p_admin_user_id: adminUserId || null,
  });

  if (error) throw error;
  if (!data || !data.success) throw new Error("Failed to delete fleet owner");
};
