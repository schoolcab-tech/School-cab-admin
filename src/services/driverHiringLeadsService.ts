import { supabase } from "@/integrations/supabase/client";

export type DriverHiringInterest =
  | "full_time"
  | "office"
  | "school"
  | "none";

export type DriverHiringLeadTag =
  | "hot"
  | "warm"
  | "cold"
  | "objecting"
  | "not_fit";

export type DriverHiringVisitStatus =
  | "none"
  | "pending"
  | "visited"
  | "no_show"
  | "joined";

export interface DriverHiringCall {
  id: string;
  attempt_id: string | null;
  campaign_id: string | null;
  cohort_id: string | null;
  app_id: string | null;
  phone: string | null;
  user_identifier: string | null;
  name: string | null;
  agent_phone_number: string | null;
  connectivity_status: string | null;
  completion_status: string | null;
  failure_reason: string | null;
  next_action_status: string | null;
  duration_sec: number | null;
  interaction_id: string | null;
  retry_attempt: number | null;
  executed_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  interest_type: string | null;
  preferred_hub: string | null;
  visit_datetime_text: string | null;
  has_valid_licence: string | null;
  has_address_proof: string | null;
  deposit_path: string | null;
  lead_score: number | null;
  lead_tag: string | null;
  callback_datetime_text: string | null;
  not_fit_reason: string | null;
  needs_human_escalation: string | null;
  call_summary: string | null;
  agent_variables: Record<string, unknown> | null;
  transcript: Array<{ role?: string; en_text?: string; indic_text?: string }> | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  lead_id: string | null;
  visit_status: DriverHiringVisitStatus;
}

export interface DriverHiringLead {
  id: string;
  phone: string;
  name: string | null;
  interest_type: DriverHiringInterest | null;
  preferred_hub: "chhawla" | "najafgarh" | null;
  visit_datetime_text: string | null;
  visit_at: string | null;
  has_valid_licence: boolean | null;
  has_address_proof: boolean | null;
  deposit_path: string | null;
  lead_score: number | null;
  lead_tag: DriverHiringLeadTag | null;
  callback_datetime_text: string | null;
  not_fit_reason: string | null;
  needs_human_escalation: boolean;
  visit_status: DriverHiringVisitStatus;
  sarvam_attempt_id: string | null;
  sarvam_campaign_id: string | null;
  call_summary: string | null;
  connectivity_status: string | null;
  call_duration_sec: number | null;
  last_called_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getDriverHiringLeads(): Promise<DriverHiringLead[]> {
  const { data, error } = await (supabase as any)
    .from("driver_hiring_leads")
    .select(
      "id, phone, name, interest_type, preferred_hub, visit_datetime_text, visit_at, has_valid_licence, has_address_proof, deposit_path, lead_score, lead_tag, callback_datetime_text, not_fit_reason, needs_human_escalation, visit_status, sarvam_attempt_id, sarvam_campaign_id, call_summary, connectivity_status, call_duration_sec, last_called_at, created_at, updated_at"
    )
    .is("deleted_at", null)
    .order("last_called_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function updateDriverHiringVisitStatus(
  id: string,
  visitStatus: DriverHiringVisitStatus
): Promise<void> {
  const { error } = await (supabase as any)
    .from("driver_hiring_leads")
    .update({ visit_status: visitStatus })
    .eq("id", id);

  if (error) throw error;
}

export async function softDeleteDriverHiringLead(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("driver_hiring_leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

const PAGE_SIZE = 1000;

const CALL_LIST_COLUMNS = [
  "id",
  "attempt_id",
  "campaign_id",
  "cohort_id",
  "app_id",
  "phone",
  "user_identifier",
  "name",
  "agent_phone_number",
  "connectivity_status",
  "completion_status",
  "failure_reason",
  "next_action_status",
  "duration_sec",
  "interaction_id",
  "retry_attempt",
  "executed_at",
  "started_at",
  "ended_at",
  "interest_type",
  "preferred_hub",
  "visit_datetime_text",
  "has_valid_licence",
  "has_address_proof",
  "deposit_path",
  "lead_score",
  "lead_tag",
  "callback_datetime_text",
  "not_fit_reason",
  "needs_human_escalation",
  "call_summary",
  "created_at",
].join(", ");

async function fetchAllPages(
  loadPage: (from: number, to: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function getDriverHiringCalls(): Promise<DriverHiringCall[]> {
  const [callRows, leadRows] = await Promise.all([
    fetchAllPages((from, to) =>
      (supabase as any)
        .from("driver_hiring_calls")
        .select(CALL_LIST_COLUMNS)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    ),
    fetchAllPages((from, to) =>
      (supabase as any)
        .from("driver_hiring_leads")
        .select("id, phone, visit_status")
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, to)
    ),
  ]);

  const leadByPhone = new Map<string, { id: string; visit_status: DriverHiringVisitStatus }>();
  for (const lead of leadRows as Array<{ id: string; phone: string | null; visit_status: DriverHiringVisitStatus }>) {
    if (lead.phone) {
      leadByPhone.set(lead.phone, {
        id: lead.id,
        visit_status: lead.visit_status,
      });
    }
  }

  return (callRows as DriverHiringCall[]).map((call) => {
    const lead = call.phone ? leadByPhone.get(call.phone) : undefined;
    return {
      ...call,
      lead_id: lead?.id ?? null,
      visit_status: lead?.visit_status ?? "none",
    };
  });
}

export async function getDriverHiringCallDetail(id: string): Promise<
  Pick<DriverHiringCall, "transcript" | "agent_variables" | "raw_payload">
> {
  const { data, error } = await (supabase as any)
    .from("driver_hiring_calls")
    .select("transcript, agent_variables, raw_payload")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return {
    transcript: data?.transcript ?? null,
    agent_variables: data?.agent_variables ?? null,
    raw_payload: data?.raw_payload ?? null,
  };
}

export async function softDeleteDriverHiringCall(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("driver_hiring_calls")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
