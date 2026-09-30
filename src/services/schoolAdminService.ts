import { supabase } from "@/integrations/supabase/client";

// `school_admins` is a new table; not yet in generated types. Cast as any where needed.
const db = supabase as any;

export type SchoolAdmin = {
  school_admin_id: number;
  user_id: string;
  school_id: number;
  contact_person: string;
  email: string;
  phone: string;
  is_active: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SchoolAdminWithSchool = SchoolAdmin & {
  school_name?: string;
};

export type CreateSchoolAdminInput = {
  email: string;
  password: string;
  school_id: number;
  contact_person: string;
  phone: string;
};

export type UpdateSchoolAdminInput = {
  contact_person?: string;
  phone?: string;
};

/**
 * Get all school admins — master admin / admin only.
 * Joins with schools for display.
 */
export const getAllSchoolAdmins = async (
  options?: { schoolIds?: number[] }
): Promise<SchoolAdminWithSchool[]> => {
  let query = db
    .from("school_admins")
    .select(
      `
      *,
      schools!school_admins_school_id_fkey(name)
    `
    )
    .order("created_at", { ascending: false });

  if (options?.schoolIds?.length) {
    query = query.in("school_id", options.schoolIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((row: any) => ({
    school_admin_id: row.school_admin_id,
    user_id: row.user_id,
    school_id: row.school_id,
    contact_person: row.contact_person,
    email: row.email,
    phone: row.phone,
    is_active: row.is_active,
    verified_at: row.verified_at,
    verified_by: row.verified_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    school_name: row.schools?.name ?? `School ${row.school_id}`,
  }));
};

export const getSchoolAdminById = async (id: number): Promise<SchoolAdminWithSchool | null> => {
  const { data, error } = await db
    .from("school_admins")
    .select(`*, schools!school_admins_school_id_fkey(name)`)
    .eq("school_admin_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    school_name: data.schools?.name ?? `School ${data.school_id}`,
  };
};

/**
 * Fetch the school admin row for the currently-logged-in user.
 * Used by the school-admin dashboard.
 */
export const getMySchoolAdmin = async (userId: string): Promise<SchoolAdminWithSchool | null> => {
  const { data, error } = await db
    .from("school_admins")
    .select(`*, schools!school_admins_school_id_fkey(name, address)`)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    school_name: data.schools?.name ?? `School ${data.school_id}`,
  };
};

/**
 * Create a school admin — uses RPC create_school_admin_user to atomically create
 * the auth user + school_admins row + set the user_roles.role to 'school_admin'.
 */
export const createSchoolAdmin = async (
  input: CreateSchoolAdminInput,
  adminUserId: string
): Promise<SchoolAdmin> => {
  const { data, error } = await db.rpc("create_school_admin_user", {
    p_email: input.email,
    p_password: input.password,
    p_school_id: input.school_id,
    p_contact_person: input.contact_person,
    p_phone: input.phone,
    p_admin_user_id: adminUserId,
  });

  if (error) throw error;
  if (!data || !data.school_admin_id) throw new Error("Failed to create school admin");

  const { data: row, error: fetchError } = await db
    .from("school_admins")
    .select("*")
    .eq("school_admin_id", data.school_admin_id)
    .single();
  if (fetchError) throw fetchError;
  return row;
};

export const updateSchoolAdmin = async (
  schoolAdminId: number,
  input: UpdateSchoolAdminInput
): Promise<SchoolAdmin> => {
  const { data, error } = await db
    .from("school_admins")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("school_admin_id", schoolAdminId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const suspendSchoolAdmin = async (schoolAdminId: number): Promise<void> => {
  const { error } = await db
    .from("school_admins")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("school_admin_id", schoolAdminId);
  if (error) throw error;
};

export const activateSchoolAdmin = async (schoolAdminId: number): Promise<void> => {
  const { error } = await db
    .from("school_admins")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("school_admin_id", schoolAdminId);
  if (error) throw error;
};

/**
 * Delete a school admin — uses RPC to atomically delete the auth user + row.
 */
export const deleteSchoolAdmin = async (
  schoolAdminId: number,
  adminUserId?: string
): Promise<void> => {
  const { error } = await db.rpc("delete_school_admin_user", {
    p_school_admin_id: schoolAdminId,
    p_admin_user_id: adminUserId ?? null,
  });
  if (error) throw error;
};
