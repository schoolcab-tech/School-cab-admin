import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://wusekilmebfbikwspiic.supabase.co";

export type CreateUserAccountResponse = {
  success: boolean;
  user_id: string;
  email: string;
  phone: string;
  user_type: string;
  message: string;
};

/**
 * Creates a Supabase auth account + phone_users mapping + user_roles entry
 * via the admin-create-user Edge Function. Does NOT create the profile
 * (student/driver) — caller must do that separately with the returned user_id.
 */
export async function createUserAccount(
  phoneNumber: string,
  userType: "user" | "driver"
): Promise<CreateUserAccountResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated. Please log in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/admin-create-user`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: session.access_token,
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        user_type: userType,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create user account");
  }

  return data as CreateUserAccountResponse;
}

/**
 * Marks phone_users.profile_completed = true after the profile
 * (student/driver record) has been created successfully.
 */
export async function markProfileCompleted(
  phoneNumber: string
): Promise<void> {
  // Normalize phone
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, "").replace(/^\+?91/, "");
  const normalizedPhone = `+91${cleaned}`;

  const { error } = await supabase
    .from("phone_users")
    .update({ profile_completed: true, updated_at: new Date().toISOString() })
    .eq("phone_number", normalizedPhone);

  if (error) {
    console.error("Failed to mark profile completed:", error);
    // Non-fatal — the account still works, profile_completed is just a flag
  }
}
