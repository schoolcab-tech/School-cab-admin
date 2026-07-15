import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const db = supabase as any;

export type PlatformAdminRole = Extract<AppRole, "admin" | "master_admin">;

export type PlatformAdmin = {
  platform_admin_id: number;
  user_id: string;
  contact_person: string;
  email: string;
  phone: string;
  role: PlatformAdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreatePlatformAdminInput = {
  email: string;
  password: string;
  contact_person: string;
  phone: string;
  role: PlatformAdminRole;
};

export type UpdatePlatformAdminInput = {
  contact_person?: string;
  phone?: string;
};

export const getAllPlatformAdmins = async (): Promise<PlatformAdmin[]> => {
  const { data, error } = await db
    .from("platform_admins")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createPlatformAdmin = async (
  input: CreatePlatformAdminInput,
  adminUserId: string
): Promise<PlatformAdmin> => {
  const { data, error } = await db.rpc("create_platform_admin_user", {
    p_email: input.email,
    p_password: input.password,
    p_contact_person: input.contact_person,
    p_phone: input.phone,
    p_role: input.role,
    p_admin_user_id: adminUserId,
  });

  if (error) throw error;
  if (!data?.platform_admin_id) throw new Error("Failed to create platform admin");

  const { data: row, error: fetchError } = await db
    .from("platform_admins")
    .select("*")
    .eq("platform_admin_id", data.platform_admin_id)
    .single();

  if (fetchError) throw fetchError;
  return row;
};

export const updatePlatformAdmin = async (
  platformAdminId: number,
  input: UpdatePlatformAdminInput
): Promise<PlatformAdmin> => {
  const { data, error } = await db
    .from("platform_admins")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("platform_admin_id", platformAdminId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const suspendPlatformAdmin = async (platformAdminId: number): Promise<void> => {
  const { error } = await db
    .from("platform_admins")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("platform_admin_id", platformAdminId);

  if (error) throw error;
};

export const activatePlatformAdmin = async (platformAdminId: number): Promise<void> => {
  const { error } = await db
    .from("platform_admins")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("platform_admin_id", platformAdminId);

  if (error) throw error;
};

export const deletePlatformAdmin = async (
  platformAdminId: number,
  adminUserId?: string
): Promise<void> => {
  const { error } = await db.rpc("delete_platform_admin_user", {
    p_platform_admin_id: platformAdminId,
    p_admin_user_id: adminUserId ?? null,
  });

  if (error) throw error;
};

export type BackfillPlatformAdminsResult = {
  success: boolean;
  inserted_count: number;
  total_platform_admins: number;
};

/** Import existing admin/master_admin users from user_roles into platform_admins. */
export const backfillPlatformAdmins = async (): Promise<BackfillPlatformAdminsResult> => {
  const { data, error } = await db.rpc("backfill_platform_admins");

  if (error) throw error;
  return data as BackfillPlatformAdminsResult;
};
