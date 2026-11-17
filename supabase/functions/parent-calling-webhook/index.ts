import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-webhook-secret",
};

type SarvamCampaignWebhook = Record<string, unknown> & {
  attempt_id?: string;
  campaign_id?: string;
  cohort_id?: string;
  app_id?: string;
  app_version?: number;
  user_phone_number?: string;
  user_identifier?: string;
  agent_phone_number?: string | null;
  connectivity_status?: string | null;
  completion_status?: string | null;
  failure_reason?: string | null;
  next_action_status?: string | null;
  duration?: number | null;
  interaction_id?: string | null;
  retry_attempt?: number | null;
  executed_at?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  initial_agent_variables?: Record<string, unknown> | null;
  final_agent_variables?: Record<string, unknown> | null;
  output_agent_variables?: Record<string, unknown> | null;
  interaction_transcript?: Array<{ role?: string; en_text?: string }> | null;
};

const OUTCOMES = new Set([
  "hot_link_sent",
  "warm",
  "callback",
  "human_callback",
  "not_serviceable",
  "cold",
  "invalid",
  "do_not_call",
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (trimmed.startsWith("+")) return trimmed;
  return trimmed;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function isoOrNull(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function yesNoToBool(v: unknown): boolean | null {
  const s = str(v)?.toLowerCase();
  if (!s) return null;
  if (s === "yes" || s === "true" || s === "1") return true;
  if (s === "no" || s === "false" || s === "0") return false;
  return null;
}

function pickAgentVars(payload: SarvamCampaignWebhook): Record<string, unknown> {
  const finalVars = payload.final_agent_variables;
  const outputVars = payload.output_agent_variables;
  const initialVars = payload.initial_agent_variables;
  return {
    ...(initialVars && typeof initialVars === "object" ? initialVars : {}),
    ...(outputVars && typeof outputVars === "object" ? outputVars : {}),
    ...(finalVars && typeof finalVars === "object" ? finalVars : {}),
  };
}

function oneOf(v: unknown, allowed: Set<string>): string | null {
  const s = str(v)?.toLowerCase().replace(/[\s-]+/g, "_") ?? null;
  if (!s) return null;
  return allowed.has(s) ? s : null;
}

function normalizeOutcome(v: unknown): { tag: string | null; claimedPaid: boolean } {
  const raw = str(v)?.toLowerCase().replace(/[—–-]/g, " ").replace(/\s+/g, " ").trim() ?? "";
  if (!raw) return { tag: null, claimedPaid: false };
  const compact = raw.replace(/\s+/g, "_");
  if (compact === "converted" || raw === "converted") {
    return { tag: "hot_link_sent", claimedPaid: true };
  }
  const aliases: Record<string, string> = {
    hot: "hot_link_sent",
    hot_link_sent: "hot_link_sent",
    "hot link sent": "hot_link_sent",
    warm: "warm",
    callback: "callback",
    human_callback: "human_callback",
    "human callback": "human_callback",
    not_serviceable: "not_serviceable",
    "not serviceable": "not_serviceable",
    cold: "cold",
    invalid: "invalid",
    do_not_call: "do_not_call",
    "do not call": "do_not_call",
    dnc: "do_not_call",
  };
  const tag = aliases[compact] ?? aliases[raw] ?? null;
  return { tag: tag && OUTCOMES.has(tag) ? tag : null, claimedPaid: false };
}

function normalizeDirection(v: unknown): string | null {
  const s = str(v)?.toLowerCase() ?? "";
  if (!s) return null;
  if (s === "both" || s.includes("dono") || s.includes("two")) return "both";
  if (s === "one_way" || s === "one-way" || s === "one way" || s.includes("ek taraf")) {
    return "one_way";
  }
  return null;
}

async function forwardToSheet(payload: SarvamCampaignWebhook) {
  const url = Deno.env.get("PARENT_CALLING_SHEETS_WEBHOOK_URL");
  if (!url) return { forwarded: false };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual",
    });
    const ok = res.status >= 200 && res.status < 400;
    if (!ok) {
      console.error("Sheet forward failed", res.status);
    }
    return { forwarded: ok, status: res.status };
  } catch (err) {
    console.error("Sheet forward error", err);
    return { forwarded: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  // Sarvam's campaign wizard only has a URL field. It does not send a custom header.

  let payload: SarvamCampaignWebhook;
  try {
    payload = JSON.parse(await req.text());
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const phoneRaw = str(payload.user_phone_number);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const vars = pickAgentVars(payload);

  const parentName =
    str(vars.parent_name) ??
    str(vars.user_name) ??
    str(vars.customer_name);
  const childName = str(vars.child_name);
  const outcome = normalizeOutcome(vars.outcome_tag);
  const needsHuman =
    yesNoToBool(vars.needs_human) ??
    yesNoToBool(vars.needs_human_escalation) ??
    outcome.claimedPaid;

  const direction = normalizeDirection(vars.direction);
  const currentMode = oneOf(
    vars.current_mode,
    new Set(["bus", "van", "self", "new", "other"]),
  );
  const mainPain = oneOf(
    vars.main_pain,
    new Set(["time", "waiting", "safety", "routine", "price"]),
  );
  const routeStatus = oneOf(
    vars.route_status,
    new Set(["unknown", "seats", "full", "not_covered"]),
  );

  const callRow = {
    attempt_id: str(payload.attempt_id),
    campaign_id: str(payload.campaign_id),
    cohort_id: str(payload.cohort_id),
    app_id: str(payload.app_id),
    app_version: intOrNull(payload.app_version),
    phone,
    user_identifier: str(payload.user_identifier),
    parent_name: parentName,
    child_name: childName,
    agent_phone_number: str(payload.agent_phone_number),
    connectivity_status: str(payload.connectivity_status),
    completion_status: str(payload.completion_status),
    failure_reason: str(payload.failure_reason),
    next_action_status: str(payload.next_action_status),
    duration_sec: numOrNull(payload.duration),
    interaction_id: str(payload.interaction_id),
    retry_attempt: intOrNull(payload.retry_attempt),
    executed_at: isoOrNull(payload.executed_at),
    started_at: isoOrNull(payload.start_datetime),
    ended_at: isoOrNull(payload.end_datetime),
    whatsapp_number: str(vars.whatsapp_number),
    child_class: str(vars.child_class),
    child_count: intOrNull(vars.child_count),
    school_name: str(vars.school_name),
    pickup_area: str(vars.pickup_area),
    direction: str(vars.direction),
    current_mode: str(vars.current_mode),
    main_pain: str(vars.main_pain),
    route_status: str(vars.route_status),
    distance_km: numOrNull(vars.distance_km),
    fee_quoted: numOrNull(vars.fee_quoted),
    prebook_explained: str(vars.prebook_explained),
    link_agreed: str(vars.link_agreed),
    objection_codes: str(vars.objection_codes),
    unanswered_questions: str(vars.unanswered_questions),
    callback_time: str(vars.callback_time),
    lead_score: intOrNull(vars.lead_score),
    outcome_tag: outcome.tag ?? str(vars.outcome_tag),
    needs_human: needsHuman === null ? str(vars.needs_human) : needsHuman ? "yes" : "no",
    call_summary: str(vars.call_summary),
    agent_variables: vars,
    transcript: payload.interaction_transcript ?? null,
    raw_payload: payload,
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env");
    return jsonResponse({ ok: false, error: "Server misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const callWrite = callRow.attempt_id
    ? await supabase
      .from("parent_calling_calls")
      .upsert(callRow, { onConflict: "attempt_id" })
      .select("id, attempt_id, phone")
      .single()
    : await supabase
      .from("parent_calling_calls")
      .insert(callRow)
      .select("id, attempt_id, phone")
      .single();

  if (callWrite.error) {
    console.error("Call insert failed", callWrite.error);
    return jsonResponse({ ok: false, error: callWrite.error.message }, 500);
  }

  let lead: { id: string; phone: string; outcome_tag: string | null } | null = null;
  if (phone) {
    // lead_status and follow_up_status are team-owned and must stay out of this row.
    const leadRow = {
      phone,
      parent_name: parentName,
      child_name: childName,
      whatsapp_number: str(vars.whatsapp_number),
      child_class: str(vars.child_class),
      child_count: intOrNull(vars.child_count),
      school_name: str(vars.school_name),
      pickup_area: str(vars.pickup_area),
      direction,
      current_mode: currentMode,
      main_pain: mainPain,
      route_status: routeStatus,
      distance_km: numOrNull(vars.distance_km),
      fee_quoted: numOrNull(vars.fee_quoted),
      prebook_explained: yesNoToBool(vars.prebook_explained),
      link_agreed: yesNoToBool(vars.link_agreed),
      objection_codes: str(vars.objection_codes),
      unanswered_questions: str(vars.unanswered_questions),
      callback_time: str(vars.callback_time),
      lead_score: intOrNull(vars.lead_score),
      outcome_tag: outcome.tag,
      needs_human: needsHuman ?? false,
      sarvam_attempt_id: str(payload.attempt_id),
      sarvam_campaign_id: str(payload.campaign_id),
      sarvam_interaction_id: str(payload.interaction_id),
      connectivity_status: str(payload.connectivity_status),
      call_duration_sec: numOrNull(payload.duration),
      call_summary: str(vars.call_summary),
      transcript: payload.interaction_transcript ?? null,
      last_called_at: isoOrNull(payload.executed_at) ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("parent_calling_leads")
      .upsert(leadRow, { onConflict: "phone" })
      .select("id, phone, outcome_tag")
      .single();

    if (error) {
      console.error("Lead upsert failed", error);
    } else {
      lead = data;
    }
  }

  const sheet = await forwardToSheet(payload);

  return jsonResponse({ ok: true, call: callWrite.data, lead, sheet });
});
