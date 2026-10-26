import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  proxyTraqcare,
  TraqcareProxyError,
  type TraqcareRequest,
} from "./proxy.ts";

const TRAQCARE_SCHOOL_ID = 121;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST required" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("TRAQCARE_API_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      return jsonResponse(
        { error: userError?.message || "Unauthorized" },
        401
      );
    }

    const body = (await req.json()) as TraqcareRequest & { schoolId?: number };
    if (Number(body.schoolId) !== TRAQCARE_SCHOOL_ID) {
      return jsonResponse(
        { error: "Dashcams are only enabled for Test School - Bangalore" },
        403
      );
    }

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleAllowed = (roles || []).some((row) =>
      ["admin", "master_admin"].includes(row.role)
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

    const isModerator = (roles || []).some((row) => row.role === "moderator");
    let moderatorAllowed = false;
    if (isModerator) {
      const { data: moderator } = await adminClient
        .from("moderators")
        .select("moderator_id, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (moderator && moderator.is_active !== false) {
        const { data: school } = await adminClient
          .from("schools")
          .select("school_id")
          .eq("school_id", TRAQCARE_SCHOOL_ID)
          .eq("moderator_id", moderator.moderator_id)
          .maybeSingle();
        moderatorAllowed = Boolean(school);
      }
    }

    if (!roleAllowed && !platformAllowed && !moderatorAllowed) {
      return jsonResponse(
        { error: "Admin or Test School - Bangalore moderator access required" },
        403
      );
    }
    const result = await proxyTraqcare(apiKey, body);
    return jsonResponse(result.body, result.status);
  } catch (err) {
    if (err instanceof TraqcareProxyError) {
      return jsonResponse({ error: err.message }, err.status);
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
