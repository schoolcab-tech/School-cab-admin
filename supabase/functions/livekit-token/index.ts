import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.6.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Role = "driver" | "parent" | "admin" | "sub_admin" | "school_admin";

interface TokenRequest {
  role: Role;
  driverId: number;
  schoolId: number;
  studentId?: number;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function roomNameForDriver(driverId: number) {
  return `driver-${driverId}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY");
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!livekitApiKey || !livekitApiSecret) {
      return jsonResponse({ error: "LiveKit is not configured on the server" }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as TokenRequest;
    const role = body.role;
    const driverId = Number(body.driverId);
    const schoolId = Number(body.schoolId);
    const studentId =
      body.studentId != null ? Number(body.studentId) : undefined;

    if (!role || !Number.isFinite(driverId) || !Number.isFinite(schoolId)) {
      return jsonResponse(
        { error: "role, driverId, and schoolId are required" },
        400
      );
    }

    const { data: school, error: schoolError } = await adminClient
      .from("schools")
      .select("school_id, livestream_enabled, livestream_quality")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (schoolError || !school) {
      return jsonResponse({ error: "School not found" }, 404);
    }

    if (!school.livestream_enabled) {
      return jsonResponse({ error: "Live streaming is disabled for this school" }, 403);
    }

    const quality = (school.livestream_quality as string) || "720p";
    const room = roomNameForDriver(driverId);
    let identity = "";
    let canPublish = false;
    let canSubscribe = false;

    if (role === "driver") {
      const { data: driver } = await adminClient
        .from("drivers")
        .select("driver_id, user_id")
        .eq("driver_id", driverId)
        .maybeSingle();

      if (!driver || driver.user_id !== user.id) {
        return jsonResponse({ error: "Not authorized as this driver" }, 403);
      }

      identity = `driver-${driverId}`;
      canPublish = true;
    } else if (role === "parent") {
      if (!studentId) {
        return jsonResponse({ error: "studentId is required for parent role" }, 400);
      }

      // Accept confirmed or in_progress bookings
      const { data: booking } = await adminClient
        .from("bookings")
        .select("booking_id, booking_type")
        .eq("student_id", studentId)
        .eq("driver_id", driverId)
        .in("status", ["confirmed", "in_progress"])
        .maybeSingle();

      if (!booking) {
        return jsonResponse({ error: "No active booking for this student and driver" }, 403);
      }

      // Subscription validity check only applies to monthly plans
      if (booking.booking_type === "monthly") {
        const { data: active, error: subError } = await adminClient.rpc(
          "is_subscription_active",
          { booking_id: booking.booking_id }
        );

        if (subError || !active) {
          return jsonResponse({ error: "Subscription is not active" }, 403);
        }
      }

      identity = `parent-${user.id}-${studentId}`;
      canSubscribe = true;
    } else if (role === "admin") {
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roleAllowed = (roles || []).some((r) =>
        ["admin", "master_admin"].includes(r.role)
      );

      const { data: platformAdmin } = await adminClient
        .from("platform_admins")
        .select("role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      const platformAllowed =
        platformAdmin &&
        ["admin", "master_admin"].includes(platformAdmin.role as string);

      if (!roleAllowed && !platformAllowed) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }

      identity = `admin-${user.id}`;
      canSubscribe = true;
    } else if (role === "sub_admin") {
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasSubAdminRole = (roles || []).some((r) => r.role === "sub_admin");
      if (!hasSubAdminRole) {
        return jsonResponse({ error: "Fleet owner access required" }, 403);
      }

      const { data: owner } = await adminClient
        .from("fleet_owners")
        .select("owner_id, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!owner || owner.is_active === false) {
        return jsonResponse({ error: "Fleet owner profile not found" }, 403);
      }

      const { data: mapping } = await adminClient
        .from("fleet_cab_mappings")
        .select("mapping_id")
        .eq("owner_id", owner.owner_id)
        .eq("driver_id", driverId)
        .eq("is_active", true)
        .maybeSingle();

      if (!mapping) {
        return jsonResponse({ error: "Driver is not in your fleet" }, 403);
      }

      identity = `subadmin-${user.id}`;
      canSubscribe = true;
    } else if (role === "school_admin") {
      const { data: schoolAdmin } = await adminClient
        .from("school_admins")
        .select("school_id, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!schoolAdmin || schoolAdmin.is_active === false) {
        return jsonResponse({ error: "School admin profile not found" }, 403);
      }

      if (Number(schoolAdmin.school_id) !== schoolId) {
        return jsonResponse({ error: "Driver is not serving your school" }, 403);
      }

      const { data: booking } = await adminClient
        .from("bookings")
        .select("booking_id")
        .eq("driver_id", driverId)
        .eq("school_id", schoolId)
        .eq("status", "confirmed")
        .limit(1)
        .maybeSingle();

      if (!booking) {
        return jsonResponse({ error: "Driver is not assigned to your school" }, 403);
      }

      identity = `schooladmin-${user.id}`;
      canSubscribe = true;
    } else {
      return jsonResponse({ error: "Invalid role" }, 400);
    }

    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity,
      ttl: "1h",
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish,
      canSubscribe,
      canPublishData: false,
    });

    const token = await at.toJwt();

    return jsonResponse({ token, room, identity, quality });
  } catch (err) {
    console.error("[livekit-token]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
});
