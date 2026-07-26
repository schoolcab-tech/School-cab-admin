import { supabase } from "@/integrations/supabase/client";

export type LiveKitQuality = "720p" | "480p" | "360p";
export type LiveKitViewerRole = "admin" | "sub_admin" | "school_admin";

/** Map panel auth role → livekit-token edge function role. */
export function resolveLiveKitViewerRole(
  userRole: string | null | undefined
): LiveKitViewerRole {
  if (userRole === "sub_admin") return "sub_admin";
  if (userRole === "school_admin") return "school_admin";
  return "admin";
}

export interface LiveKitTokenResult {
  token: string;
  room: string;
  identity: string;
  quality: LiveKitQuality;
}

/** LiveKit Cloud WSS URL — set VITE_LIVEKIT_URL in .env for your project. */
export const LIVEKIT_URL =
  import.meta.env.VITE_LIVEKIT_URL ?? "wss://schoolcab-u2y1gjen.livekit.cloud";

export async function getAdminLiveKitToken(
  driverId: number,
  schoolId: number,
  role: LiveKitViewerRole
): Promise<LiveKitTokenResult> {
  const { data, error } = await supabase.functions.invoke("livekit-token", {
    body: { role, driverId, schoolId },
  });

  if (error) {
    throw new Error(error.message ?? "Failed to get stream token");
  }

  if (data?.error) {
    const message = String(data.error);
    if (message === "Invalid role") {
      throw new Error(
        "Admin live streaming is not enabled on the server yet. Deploy the livekit-token edge function with admin/sub_admin support."
      );
    }
    throw new Error(message);
  }

  return data as LiveKitTokenResult;
}
