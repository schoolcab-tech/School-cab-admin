import { supabase } from "@/integrations/supabase/client";
import { deleteDriver } from "./driverService";
import { createAuditLog } from "./auditLogService";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Table not yet in generated types
const db = supabase as any;

export type DriverDeleteRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type DriverDeleteRequest = {
  request_id: number;
  school_admin_id: number;
  school_id: number;
  driver_id: number | null;
  driver_name_snapshot: string | null;
  cab_number_snapshot: string | null;
  reason: string;
  status: DriverDeleteRequestStatus;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverDeleteRequestWithDetails = DriverDeleteRequest & {
  school_admin?: {
    school_admin_id: number;
    contact_person: string;
    email: string;
    phone: string;
  };
  school?: {
    school_id: number;
    name: string;
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

function mapRow(row: any): DriverDeleteRequestWithDetails {
  return {
    request_id: row.request_id,
    school_admin_id: row.school_admin_id,
    school_id: row.school_id,
    driver_id: row.driver_id,
    driver_name_snapshot: row.driver_name_snapshot ?? null,
    cab_number_snapshot: row.cab_number_snapshot ?? null,
    reason: row.reason,
    status: row.status,
    requested_by: row.requested_by,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    admin_notes: row.admin_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    school_admin: row.school_admin
      ? {
          school_admin_id: row.school_admin.school_admin_id,
          contact_person: row.school_admin.contact_person,
          email: row.school_admin.email,
          phone: row.school_admin.phone,
        }
      : undefined,
    school: row.school
      ? {
          school_id: row.school.school_id,
          name: row.school.name,
        }
      : undefined,
    driver: row.driver
      ? {
          driver_id: row.driver.driver_id,
          name: row.driver.name,
          phone: row.driver.phone,
          cab_number: row.driver.cab_number,
          vehicle_type: row.driver.vehicle_type,
          is_verified: row.driver.is_verified,
        }
      : undefined,
  };
}

const DETAIL_SELECT = `
  *,
  school_admin:school_admins!driver_delete_requests_school_admin_id_fkey(
    school_admin_id, contact_person, email, phone
  ),
  school:schools!driver_delete_requests_school_id_fkey(school_id, name),
  driver:drivers!driver_delete_requests_driver_id_fkey(
    driver_id, name, phone, cab_number, vehicle_type, is_verified
  )
`;

/** All delete requests (admin / master admin). */
export async function getAllDriverDeleteRequests(): Promise<
  DriverDeleteRequestWithDetails[]
> {
  const { data, error } = await db
    .from("driver_delete_requests")
    .select(DETAIL_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

/** Pending delete requests (admin / master admin). */
export async function getPendingDriverDeleteRequests(): Promise<
  DriverDeleteRequestWithDetails[]
> {
  const { data, error } = await db
    .from("driver_delete_requests")
    .select(DETAIL_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

/** Requests raised by a specific school admin. */
export async function getSchoolAdminDriverDeleteRequests(
  schoolAdminId: number
): Promise<DriverDeleteRequestWithDetails[]> {
  const { data, error } = await db
    .from("driver_delete_requests")
    .select(DETAIL_SELECT)
    .eq("school_admin_id", schoolAdminId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

/**
 * School admin raises a delete request for a driver serving their school.
 * Reason is required (min 5 chars).
 */
export async function createDriverDeleteRequest(input: {
  schoolAdminId: number;
  schoolId: number;
  driverId: number;
  reason: string;
  requestedBy: string;
}): Promise<DriverDeleteRequest> {
  const reason = input.reason.trim();
  if (reason.length < 5) {
    throw new Error("Please provide a reason (at least 5 characters).");
  }

  // Block duplicate pending requests
  const { data: existing, error: existingError } = await db
    .from("driver_delete_requests")
    .select("request_id")
    .eq("school_admin_id", input.schoolAdminId)
    .eq("driver_id", input.driverId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    throw new Error(
      "A pending delete request already exists for this driver."
    );
  }

  // Snapshot driver details for history after the driver row is deleted
  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("driver_id, name, cab_number")
    .eq("driver_id", input.driverId)
    .single();

  if (driverError) throw driverError;
  if (!driver) throw new Error("Driver not found");

  const { data, error } = await db
    .from("driver_delete_requests")
    .insert({
      school_admin_id: input.schoolAdminId,
      school_id: input.schoolId,
      driver_id: input.driverId,
      driver_name_snapshot: driver.name,
      cab_number_snapshot: driver.cab_number,
      reason,
      requested_by: input.requestedBy,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as DriverDeleteRequest;
}

/** School admin cancels their own pending request. */
export async function cancelDriverDeleteRequest(
  requestId: number
): Promise<void> {
  const { data: request, error: fetchError } = await db
    .from("driver_delete_requests")
    .select("status")
    .eq("request_id", requestId)
    .single();

  if (fetchError) throw fetchError;
  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Only pending requests can be cancelled");
  }

  const { error } = await db
    .from("driver_delete_requests")
    .update({ status: "cancelled" })
    .eq("request_id", requestId);

  if (error) throw error;
}

/**
 * Admin rejects a pending request.
 */
export async function rejectDriverDeleteRequest(
  requestId: number,
  reviewerId: string,
  adminNotes?: string
): Promise<void> {
  const { data: request, error: fetchError } = await db
    .from("driver_delete_requests")
    .select("*")
    .eq("request_id", requestId)
    .single();

  if (fetchError) throw fetchError;
  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Only pending requests can be rejected");
  }

  const { error } = await db
    .from("driver_delete_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes?.trim() || null,
    })
    .eq("request_id", requestId);

  if (error) throw error;
}

/**
 * Admin approves the request and deletes the driver.
 */
export async function approveAndDeleteDriver(
  requestId: number,
  reviewerId: string,
  adminRole?: AppRole,
  adminNotes?: string
): Promise<void> {
  const { data: request, error: fetchError } = await db
    .from("driver_delete_requests")
    .select("*")
    .eq("request_id", requestId)
    .single();

  if (fetchError) throw fetchError;
  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Only pending requests can be approved");
  }

  // Mark approved first so cascade-on-driver-delete still leaves an audit trail
  // if the FK is SET NULL / CASCADE — we keep the row by deleting after update.
  const { error: updateError } = await db
    .from("driver_delete_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes?.trim() || null,
    })
    .eq("request_id", requestId);

  if (updateError) throw updateError;

  if (!request.driver_id) {
    throw new Error("Driver already removed for this request");
  }

  const driverId = request.driver_id;

  try {
    await deleteDriver(String(driverId));
  } catch (deleteError) {
    // Roll request back to pending if delete fails
    await db
      .from("driver_delete_requests")
      .update({
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        admin_notes: null,
      })
      .eq("request_id", requestId);
    throw deleteError;
  }

  if (adminRole) {
    try {
      await createAuditLog(
        reviewerId,
        adminRole,
        "approve_driver_delete_request",
        "driver_delete_request",
        requestId,
        {
          request_id: requestId,
          driver_id: driverId,
          reason: request.reason,
        },
        { status: "approved", driver_deleted: true },
        `Approved delete request #${requestId} and deleted driver ${driverId}`
      );
    } catch (auditError) {
      console.error("Failed to audit driver delete approval:", auditError);
    }
  }
}
