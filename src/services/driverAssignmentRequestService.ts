import { supabase } from "@/integrations/supabase/client";

export type RequestType = 'assign' | 'unassign';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type DriverAssignmentRequest = {
  request_id: number;
  owner_id: number;
  driver_id: number | null;
  request_type: RequestType;
  status: RequestStatus;
  reason: string | null;
  notes: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverAssignmentRequestWithDetails = DriverAssignmentRequest & {
  fleet_owner?: {
    owner_id: number;
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
  };
  driver?: {
    driver_id: number;
    name: string | null;
    phone: string | null;
    cab_number: string;
    vehicle_type: string;
    is_verified: boolean | null;
  };
};

export type CreateAssignmentRequestInput = {
  driver_id?: number | null;
  request_type: RequestType;
  reason: string;
  notes?: string;
};

/**
 * Get all assignment requests (Master Admin)
 */
export const getAllAssignmentRequests = async (): Promise<DriverAssignmentRequestWithDetails[]> => {
  const { data, error } = await supabase
    .from("driver_assignment_requests")
    .select(`
      *,
      fleet_owner:fleet_owners!driver_assignment_requests_owner_id_fkey(
        owner_id,
        company_name,
        contact_person,
        email,
        phone
      ),
      driver:drivers(
        driver_id,
        name,
        phone,
        cab_number,
        vehicle_type,
        is_verified
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DriverAssignmentRequestWithDetails[];
};

/**
 * Get pending assignment requests (Master Admin)
 */
export const getPendingAssignmentRequests = async (): Promise<DriverAssignmentRequestWithDetails[]> => {
  const { data, error } = await supabase
    .from("driver_assignment_requests")
    .select(`
      *,
      fleet_owner:fleet_owners!driver_assignment_requests_owner_id_fkey(
        owner_id,
        company_name,
        contact_person,
        email,
        phone
      ),
      driver:drivers(
        driver_id,
        name,
        phone,
        cab_number,
        vehicle_type,
        is_verified
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DriverAssignmentRequestWithDetails[];
};

/**
 * Get assignment requests for a specific fleet owner (Sub-Admin)
 */
export const getOwnerAssignmentRequests = async (ownerId: number): Promise<DriverAssignmentRequestWithDetails[]> => {
  const { data, error } = await supabase
    .from("driver_assignment_requests")
    .select(`
      *,
      driver:drivers(
        driver_id,
        name,
        phone,
        cab_number,
        vehicle_type,
        is_verified
      )
    `)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DriverAssignmentRequestWithDetails[];
};

/**
 * Create a new assignment request (Sub-Admin)
 */
export const createAssignmentRequest = async (
  ownerId: number,
  input: CreateAssignmentRequestInput
): Promise<DriverAssignmentRequest> => {
  const { data, error } = await supabase
    .from("driver_assignment_requests")
    .insert({
      owner_id: ownerId,
      driver_id: input.driver_id || null,
      request_type: input.request_type,
      reason: input.reason,
      notes: input.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Approve an assignment request (Master Admin)
 * @param selectedDriverId - Optional driver ID to assign (overrides request.driver_id for "any available" requests)
 */
export const approveAssignmentRequest = async (
  requestId: number,
  reviewerId: string,
  adminNotes?: string,
  selectedDriverId?: number | null
): Promise<void> => {
  // Get the request details
  const { data: request, error: fetchError } = await supabase
    .from("driver_assignment_requests")
    .select("*")
    .eq("request_id", requestId)
    .single();

  if (fetchError) throw fetchError;
  if (!request) throw new Error("Request not found");

  // Determine which driver to assign
  // If master admin selected a specific driver during approval, use that
  // Otherwise, use the driver from the original request
  const driverToAssign = selectedDriverId !== undefined ? selectedDriverId : request.driver_id;

  // Update the request status (and driver_id if master admin selected one)
  const updateData: any = {
    status: 'approved',
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
    admin_notes: adminNotes || null,
  };

  // If master admin assigned a specific driver for an "any available" request, update the driver_id
  if (selectedDriverId !== undefined && request.driver_id === null) {
    updateData.driver_id = selectedDriverId;
  }

  const { error: updateError } = await supabase
    .from("driver_assignment_requests")
    .update(updateData)
    .eq("request_id", requestId);

  if (updateError) throw updateError;

  // If it's an assign request with a specific driver, create the mapping
  if (request.request_type === 'assign' && driverToAssign) {
    // Check if driver is already mapped to someone else
    const { data: existingMapping } = await supabase
      .from("fleet_cab_mappings")
      .select("*")
      .eq("driver_id", driverToAssign)
      .eq("is_active", true)
      .single();

    if (existingMapping) {
      throw new Error("Driver is already assigned to another fleet owner");
    }

    // Create new mapping
    const { error: mappingError } = await supabase
      .from("fleet_cab_mappings")
      .insert({
        owner_id: request.owner_id,
        driver_id: driverToAssign,
        assigned_by: reviewerId,
        is_active: true,
      });

    if (mappingError) throw mappingError;
  }

  // If it's an unassign request, deactivate the mapping
  if (request.request_type === 'unassign' && driverToAssign) {
    const { error: unmapError } = await supabase
      .from("fleet_cab_mappings")
      .update({
        is_active: false,
        unassigned_by: reviewerId,
        unassigned_at: new Date().toISOString(),
      })
      .eq("owner_id", request.owner_id)
      .eq("driver_id", driverToAssign)
      .eq("is_active", true);

    if (unmapError) throw unmapError;
  }
};

/**
 * Reject an assignment request (Master Admin)
 */
export const rejectAssignmentRequest = async (
  requestId: number,
  reviewerId: string,
  adminNotes: string
): Promise<void> => {
  const { error } = await supabase
    .from("driver_assignment_requests")
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes,
    })
    .eq("request_id", requestId);

  if (error) throw error;
};

/**
 * Cancel an assignment request (Sub-Admin - own requests only)
 */
export const cancelAssignmentRequest = async (requestId: number): Promise<void> => {
  const { error } = await supabase
    .from("driver_assignment_requests")
    .update({
      status: 'cancelled',
    })
    .eq("request_id", requestId)
    .eq("status", "pending"); // Only pending requests can be cancelled

  if (error) throw error;
};

/**
 * Get available drivers (not assigned to any fleet owner)
 * Note: Includes both verified and unverified drivers since master admin reviews all requests
 */
export const getAvailableDrivers = async () => {
  const { data, error } = await supabase
    .from("drivers")
    .select(`
      *,
      fleet_cab_mappings!left(
        mapping_id,
        is_active
      )
    `);

  if (error) throw error;

  // Filter drivers that don't have an active mapping
  const availableDrivers = data?.filter(driver => {
    const activeMappings = driver.fleet_cab_mappings?.filter((m: any) => m.is_active) || [];
    return activeMappings.length === 0;
  });

  return availableDrivers?.map(driver => ({
    ...driver,
    fleet_cab_mappings: undefined, // Remove the join data
  }));
};
