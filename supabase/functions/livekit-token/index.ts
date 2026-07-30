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

  const reqId = crypto.randomUUID().slice(0, 8);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY");
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET");

    console.log(`[livekit-token][${reqId}] ▶ request received`);

    if (!livekitApiKey || !livekitApiSecret) {
      console.error(`[livekit-token][${reqId}] ✗ LIVEKIT_API_KEY or LIVEKIT_API_SECRET env var is missing`);
      return jsonResponse({ error: "LiveKit is not configured on the server" }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn(`[livekit-token][${reqId}] ✗ no Authorization header`);
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
      console.warn(`[livekit-token][${reqId}] ✗ auth failed:`, userError?.message);
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    console.log(`[livekit-token][${reqId}] ✓ user authenticated: ${user.id}`);

    const body = (await req.json()) as TokenRequest;
    const role = body.role;
    const driverId = Number(body.driverId);
    const schoolId = Number(body.schoolId);
    const studentId =
      body.studentId != null ? Number(body.studentId) : undefined;

    console.log(`[livekit-token][${reqId}] ▶ params — role=${role} driverId=${driverId} schoolId=${schoolId} studentId=${studentId ?? "n/a"}`);

    if (!role || !Number.isFinite(driverId) || !Number.isFinite(schoolId)) {
      console.warn(`[livekit-token][${reqId}] ✗ missing/invalid params`);
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
      console.error(`[livekit-token][${reqId}] ✗ school ${schoolId} not found — db error:`, schoolError?.message);
      return jsonResponse({ error: "School not found" }, 404);
    }

    console.log(`[livekit-token][${reqId}] ✓ school found — livestream_enabled=${school.livestream_enabled} quality=${school.livestream_quality}`);

    if (!school.livestream_enabled) {
      console.warn(`[livekit-token][${reqId}] ✗ livestreaming is DISABLED for school ${schoolId} — set livestream_enabled=true in the schools table to fix`);
      return jsonResponse({ error: "Live streaming is disabled for this school" }, 403);
    }

    const quality = (school.livestream_quality as string) || "720p";
    const room = roomNameForDriver(driverId);
    let identity = "";
    let canPublish = false;
    let canSubscribe = false;

    if (role === "driver") {
      const { data: driver, error: driverError } = await adminClient
        .from("drivers")
        .select("driver_id, user_id")
        .eq("driver_id", driverId)
        .maybeSingle();

      console.log(`[livekit-token][${reqId}] driver lookup — found=${!!driver} db_user_id=${driver?.user_id} auth_user_id=${user.id} match=${driver?.user_id === user.id}`);

      if (driverError) {
        console.error(`[livekit-token][${reqId}] ✗ driver DB error:`, driverError.message);
      }

      if (!driver || driver.user_id !== user.id) {
        console.warn(`[livekit-token][${reqId}] ✗ driver auth mismatch — driver row found=${!!driver} user_id in DB=${driver?.user_id} logged-in user=${user.id}`);
        return jsonResponse({ error: "Not authorized as this driver" }, 403);
      }

      identity = `driver-${driverId}`;
      canPublish = true;
      console.log(`[livekit-token][${reqId}] ✓ driver authorised — will PUBLISH to room=${room}`);
    } else if (role === "parent") {
      if (!studentId) {
        console.warn(`[livekit-token][${reqId}] ✗ parent role but studentId missing`);
        return jsonResponse({ error: "studentId is required for parent role" }, 400);
      }

      // School has streaming enabled (already checked above).
      // Just verify this student has a booking with this driver.
      const { data: booking, error: bookingError } = await adminClient
        .from("bookings")
        .select("booking_id")
        .eq("student_id", studentId)
        .eq("driver_id", driverId)
        .in("status", ["confirmed", "in_progress", "completed"])
        .limit(1)
        .maybeSingle();

      console.log(`[livekit-token][${reqId}] parent booking lookup — studentId=${studentId} driverId=${driverId} found=${!!booking} db_error=${bookingError?.message ?? "none"}`);

      if (!booking) {
        console.warn(`[livekit-token][${reqId}] ✗ no confirmed/in_progress booking for student ${studentId} with driver ${driverId}`);
        return jsonResponse({ error: "No booking found for this student and driver" }, 403);
      }

      identity = `parent-${user.id}-${studentId}`;
      canSubscribe = true;
      console.log(`[livekit-token][${reqId}] ✓ parent authorised — will SUBSCRIBE to room=${room}`);
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

      console.log(`[livekit-token][${reqId}] admin check — user_roles allowed=${roleAllowed} platform_admin allowed=${!!platformAllowed}`);

      if (!roleAllowed && !platformAllowed) {
        console.warn(`[livekit-token][${reqId}] ✗ user ${user.id} has no admin/master_admin role`);
        return jsonResponse({ error: "Admin access required" }, 403);
      }

      identity = `admin-${user.id}`;
      canSubscribe = true;
      console.log(`[livekit-token][${reqId}] ✓ admin authorised — will SUBSCRIBE to room=${room}`);
    } else if (role === "sub_admin") {
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasSubAdminRole = (roles || []).some((r) => r.role === "sub_admin");
      console.log(`[livekit-token][${reqId}] sub_admin role check — has sub_admin role=${hasSubAdminRole}`);

      if (!hasSubAdminRole) {
        console.warn(`[livekit-token][${reqId}] ✗ user ${user.id} does not have sub_admin role`);
        return jsonResponse({ error: "Fleet owner access required" }, 403);
      }

      const { data: owner } = await adminClient
        .from("fleet_owners")
        .select("owner_id, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log(`[livekit-token][${reqId}] fleet owner lookup — found=${!!owner} is_active=${owner?.is_active}`);

      if (!owner || owner.is_active === false) {
        console.warn(`[livekit-token][${reqId}] ✗ fleet owner profile missing or inactive for user ${user.id}`);
        return jsonResponse({ error: "Fleet owner profile not found" }, 403);
      }

      const { data: mapping } = await adminClient
        .from("fleet_cab_mappings")
        .select("mapping_id")
        .eq("owner_id", owner.owner_id)
        .eq("driver_id", driverId)
        .eq("is_active", true)
        .maybeSingle();

      console.log(`[livekit-token][${reqId}] fleet mapping — owner_id=${owner.owner_id} driver_id=${driverId} mapped=${!!mapping}`);

      if (!mapping) {
        console.warn(`[livekit-token][${reqId}] ✗ driver ${driverId} is not in fleet of owner ${owner.owner_id}`);
        return jsonResponse({ error: "Driver is not in your fleet" }, 403);
      }

      identity = `subadmin-${user.id}`;
      canSubscribe = true;
      console.log(`[livekit-token][${reqId}] ✓ sub_admin authorised — will SUBSCRIBE to room=${room}`);
    } else if (role === "school_admin") {
      const { data: schoolAdmin } = await adminClient
        .from("school_admins")
        .select("school_id, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log(`[livekit-token][${reqId}] school_admin lookup — found=${!!schoolAdmin} is_active=${schoolAdmin?.is_active} school_id_in_db=${schoolAdmin?.school_id} requested_school_id=${schoolId}`);

      if (!schoolAdmin || schoolAdmin.is_active === false) {
        console.warn(`[livekit-token][${reqId}] ✗ school admin profile missing or inactive for user ${user.id}`);
        return jsonResponse({ error: "School admin profile not found" }, 403);
      }

      if (Number(schoolAdmin.school_id) !== schoolId) {
        console.warn(`[livekit-token][${reqId}] ✗ school_id mismatch — admin belongs to school ${schoolAdmin.school_id} but requested school ${schoolId}`);
        return jsonResponse({ error: "Driver is not serving your school" }, 403);
      }

      const { data: booking, error: bErr } = await adminClient
        .from("bookings")
        .select("booking_id")
        .eq("driver_id", driverId)
        .eq("school_id", schoolId)
        .eq("status", "confirmed")
        .limit(1)
        .maybeSingle();

      console.log(`[livekit-token][${reqId}] school_admin booking check — driver=${driverId} school=${schoolId} found=${!!booking} db_error=${bErr?.message ?? "none"}`);

      if (!booking) {
        console.warn(`[livekit-token][${reqId}] ✗ no CONFIRMED booking for driver ${driverId} in school ${schoolId} — booking may be in_progress or missing entirely`);
        return jsonResponse({ error: "Driver is not assigned to your school" }, 403);
      }

      identity = `schooladmin-${user.id}`;
      canSubscribe = true;
      console.log(`[livekit-token][${reqId}] ✓ school_admin authorised — will SUBSCRIBE to room=${room}`);
    } else {
      console.warn(`[livekit-token][${reqId}] ✗ invalid role: ${role}`);
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

    console.log(`[livekit-token][${reqId}] ✅ token issued — identity=${identity} room=${room} canPublish=${canPublish} canSubscribe=${canSubscribe} quality=${quality}`);

    return jsonResponse({ token, room, identity, quality });
  } catch (err) {
    console.error(`[livekit-token][${reqId}] 💥 unhandled error:`, err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
});
