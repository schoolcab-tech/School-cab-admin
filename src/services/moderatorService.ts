import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type Moderator = {
  moderator_id: number;
  user_id: string;
  contact_person: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ModeratorWithSchoolCount = Moderator & {
  school_count?: number;
};

export type CreateModeratorInput = {
  email: string;
  password: string;
  contact_person: string;
  phone: string;
};

export type UpdateModeratorInput = {
  contact_person?: string;
  phone?: string;
};

export const getAllModerators = async (): Promise<ModeratorWithSchoolCount[]> => {
  const { data, error } = await db
    .from("moderators")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const moderators: Moderator[] = data || [];
  if (moderators.length === 0) return [];

  const { data: schools, error: schoolsError } = await db
    .from("schools")
    .select("school_id, moderator_id")
    .not("moderator_id", "is", null);

  if (schoolsError) throw schoolsError;

  const counts = new Map<number, number>();
  for (const row of schools || []) {
    const mid = row.moderator_id as number;
    counts.set(mid, (counts.get(mid) || 0) + 1);
  }

  return moderators.map((m) => ({
    ...m,
    school_count: counts.get(m.moderator_id) || 0,
  }));
};

export const getMyModerator = async (userId: string): Promise<Moderator | null> => {
  const { data, error } = await db
    .from("moderators")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const getModeratorSchools = async (moderatorId: number) => {
  const { data, error } = await db
    .from("schools")
    .select("school_id, name, locality, pincode, status")
    .eq("moderator_id", moderatorId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data || [];
};

export const createModerator = async (
  input: CreateModeratorInput,
  adminUserId: string
): Promise<Moderator> => {
  const { data, error } = await db.rpc("create_moderator_user", {
    p_email: input.email,
    p_password: input.password,
    p_contact_person: input.contact_person,
    p_phone: input.phone,
    p_admin_user_id: adminUserId,
  });

  if (error) throw error;
  if (!data?.moderator_id) throw new Error("Failed to create moderator");

  const { data: row, error: fetchError } = await db
    .from("moderators")
    .select("*")
    .eq("moderator_id", data.moderator_id)
    .single();
  if (fetchError) throw fetchError;
  return row;
};

export const updateModerator = async (
  moderatorId: number,
  input: UpdateModeratorInput
): Promise<Moderator> => {
  const { data, error } = await db
    .from("moderators")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("moderator_id", moderatorId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const suspendModerator = async (moderatorId: number): Promise<void> => {
  const { error } = await db
    .from("moderators")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("moderator_id", moderatorId);
  if (error) throw error;
};

export const activateModerator = async (moderatorId: number): Promise<void> => {
  const { error } = await db
    .from("moderators")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("moderator_id", moderatorId);
  if (error) throw error;
};

export const deleteModerator = async (
  moderatorId: number,
  adminUserId?: string
): Promise<void> => {
  const { error } = await db.rpc("delete_moderator_user", {
    p_moderator_id: moderatorId,
    p_admin_user_id: adminUserId ?? null,
  });
  if (error) throw error;
};

export const assignSchoolToModerator = async (
  schoolId: number,
  moderatorId: number | null
): Promise<void> => {
  const { error } = await db
    .from("schools")
    .update({ moderator_id: moderatorId, updated_at: new Date().toISOString() })
    .eq("school_id", schoolId);
  if (error) throw error;
};
