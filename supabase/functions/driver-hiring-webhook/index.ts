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
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
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

function deriveVisitStatus(
  leadTag: string | null,
  visitText: string | null,
  hub: string | null,
): string {
  if (leadTag === "hot" && (visitText || hub)) return "pending";
  return "none";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("DRIVER_HIRING_WEBHOOK_SECRET") ?? "";
  if (!secret) {
    console.error("DRIVER_HIRING_WEBHOOK_SECRET is not set");
    return jsonResponse({ ok: false, error: "Server misconfigured" }, 500);
  }

  const provided =
    req.headers.get("x-api-key") ??
    req.headers.get("x-webhook-secret") ??
    new URL(req.url).searchParams.get("key") ??
    "";

  if (provided !== secret) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  let payload: SarvamCampaignWebhook;
  try {
    payload = JSON.parse(await req.text());
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const phoneRaw = str(payload.user_phone_number);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const vars = pickAgentVars(payload);

  const applicantName =
    str(vars.applicant_name) ??
    str(vars.user_name) ??
    str(vars.customer_name);

  const interestType = str(vars.interest_type);
  const allowedInterest = new Set(["full_time", "office", "school", "none"]);
  const hubRaw = str(vars.preferred_hub)?.toLowerCase() ?? null;
  const preferredHub =
    hubRaw === "chhawla" || hubRaw === "najafgarh" ? hubRaw : null;

  const visitText = str(vars.visit_datetime_text);
  const depositRaw = str(vars.deposit_path);
  const allowedDeposit = new Set([
    "full_6000",
    "split_3000",
    "cannot_pay",
    "not_discussed",
  ]);

  const leadTagRaw = str(vars.lead_tag)?.toLowerCase() ?? null;
  const allowedTags = new Set(["hot", "warm", "cold", "objecting", "not_fit"]);
  const leadScore = intOrNull(vars.lead_score);
  const leadTag = leadTagRaw && allowedTags.has(leadTagRaw) ? leadTagRaw : null;

  const callRow = {
    attempt_id: str(payload.attempt_id),
    campaign_id: str(payload.campaign_id),
    cohort_id: str(payload.cohort_id),
    app_id: str(payload.app_id),
    app_version: intOrNull(payload.app_version),
    phone,
    user_identifier: str(payload.user_identifier),
    name: applicantName,
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
    interest_type: interestType,
    preferred_hub: str(vars.preferred_hub),
    visit_datetime_text: visitText,
    has_valid_licence: str(vars.has_valid_licence),
    has_address_proof: str(vars.has_address_proof),
    deposit_path: depositRaw,
    lead_score: leadScore,
    lead_tag: leadTagRaw,
    callback_datetime_text: str(vars.callback_datetime_text),
    not_fit_reason: str(vars.not_fit_reason),
    needs_human_escalation: str(vars.needs_human_escalation),
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
      .from("driver_hiring_calls")
      .upsert(callRow, { onConflict: "attempt_id" })
      .select("id, attempt_id, phone")
      .single()
    : await supabase
      .from("driver_hiring_calls")
      .insert(callRow)
      .select("id, attempt_id, phone")
      .single();

  if (callWrite.error) {
    console.error("Call insert failed", callWrite.error);
    return jsonResponse({ ok: false, error: callWrite.error.message }, 500);
  }

  let lead: { id: string; phone: string; lead_tag: string | null; visit_status: string } | null =
    null;
  if (phone) {
    const visitStatus = deriveVisitStatus(leadTag, visitText, preferredHub);
    const leadRow = {
      phone,
      name: applicantName,
      interest_type:
        interestType && allowedInterest.has(interestType) ? interestType : null,
      preferred_hub: preferredHub,
      visit_datetime_text: visitText,
      has_valid_licence: yesNoToBool(vars.has_valid_licence),
      has_address_proof: yesNoToBool(vars.has_address_proof),
      deposit_path:
        depositRaw && allowedDeposit.has(depositRaw) ? depositRaw : null,
      lead_score: leadScore,
      lead_tag: leadTag,
      callback_datetime_text: str(vars.callback_datetime_text),
      not_fit_reason: str(vars.not_fit_reason),
      needs_human_escalation: yesNoToBool(vars.needs_human_escalation) ?? false,
      visit_status: visitStatus,
      sarvam_attempt_id: str(payload.attempt_id),
      sarvam_campaign_id: str(payload.campaign_id),
      sarvam_interaction_id: str(payload.interaction_id),
      connectivity_status: str(payload.connectivity_status),
      call_duration_sec: numOrNull(payload.duration),
      call_summary: str(vars.call_summary),
      transcript: payload.interaction_transcript ?? null,
      last_called_at: isoOrNull(payload.executed_at) ?? new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("driver_hiring_leads")
      .select("id, visit_status")
      .eq("phone", phone)
      .maybeSingle();

    if (existing?.visit_status && existing.visit_status !== "none" && visitStatus === "none") {
      leadRow.visit_status = existing.visit_status;
    }

    const { data, error } = await supabase
      .from("driver_hiring_leads")
      .upsert(leadRow, { onConflict: "phone" })
      .select("id, phone, lead_tag, visit_status")
      .single();

    if (error) {
      console.error("Lead upsert failed", error);
    } else {
      lead = data;
    }
  }

  return jsonResponse({ ok: true, call: callWrite.data, lead });
});
