import { supabase } from "@/integrations/supabase/client";

export type ParentCallingOutcome =
  | "hot_link_sent"
  | "warm"
  | "callback"
  | "human_callback"
  | "not_serviceable"
  | "cold"
  | "invalid"
  | "do_not_call";

export type ParentCallingFollowUp =
  | "open"
  | "link_sent"
  | "reminded"
  | "converted"
  | "closed";

export type ParentCallingLeadStatus =
  | "new"
  | "interested"
  | "price_objection"
  | "callback"
  | "not_interested"
  | "flagged"
  | "do_not_call";

export interface ParentCallingCall {
  id: string;
  attempt_id: string | null;
  campaign_id: string | null;
  cohort_id: string | null;
  app_id: string | null;
  phone: string | null;
  user_identifier: string | null;
  parent_name: string | null;
  child_name: string | null;
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
  whatsapp_number: string | null;
  child_class: string | null;
  child_count: number | null;
  school_name: string | null;
  pickup_area: string | null;
  direction: string | null;
  current_mode: string | null;
  main_pain: string | null;
  route_status: string | null;
  distance_km: number | null;
  fee_quoted: number | null;
  prebook_explained: string | null;
  link_agreed: string | null;
  objection_codes: string | null;
  unanswered_questions: string | null;
  callback_time: string | null;
  lead_score: number | null;
  outcome_tag: string | null;
  needs_human: string | null;
  call_summary: string | null;
  agent_variables: Record<string, unknown> | null;
  transcript: Array<{ role?: string; en_text?: string; indic_text?: string }> | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  lead_id: string | null;
  follow_up_status: ParentCallingFollowUp;
  lead_status: ParentCallingLeadStatus;
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
  "parent_name",
  "child_name",
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
  "whatsapp_number",
  "child_class",
  "child_count",
  "school_name",
  "pickup_area",
  "direction",
  "current_mode",
  "main_pain",
  "route_status",
  "distance_km",
  "fee_quoted",
  "prebook_explained",
  "link_agreed",
  "objection_codes",
  "unanswered_questions",
  "callback_time",
  "lead_score",
  "outcome_tag",
  "needs_human",
  "call_summary",
  "created_at",
].join(", ");

async function fetchAllPages(
  loadPage: (
    from: number,
    to: number,
  ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>,
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

export async function getParentCallingCalls(): Promise<ParentCallingCall[]> {
  const [callRows, leadRows] = await Promise.all([
    fetchAllPages((from, to) =>
      (supabase as any)
        .from("parent_calling_calls")
        .select(CALL_LIST_COLUMNS)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    ),
    fetchAllPages((from, to) =>
      (supabase as any)
        .from("parent_calling_leads")
        .select("id, phone, follow_up_status, lead_status")
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, to)
    ),
  ]);

  const leadByPhone = new Map<
    string,
    {
      id: string;
      follow_up_status: ParentCallingFollowUp;
      lead_status: ParentCallingLeadStatus;
    }
  >();
  for (const lead of leadRows as Array<{
    id: string;
    phone: string | null;
    follow_up_status: ParentCallingFollowUp;
    lead_status: ParentCallingLeadStatus | null;
  }>) {
    if (lead.phone) {
      leadByPhone.set(lead.phone, {
        id: lead.id,
        follow_up_status: lead.follow_up_status,
        lead_status: lead.lead_status ?? "new",
      });
    }
  }

  return (callRows as ParentCallingCall[]).map((call) => {
    const lead = call.phone ? leadByPhone.get(call.phone) : undefined;
    return {
      ...call,
      lead_id: lead?.id ?? null,
      follow_up_status: lead?.follow_up_status ?? "open",
      lead_status: lead?.lead_status ?? "new",
    };
  });
}

export async function getParentCallingCallDetail(id: string): Promise<
  Pick<ParentCallingCall, "transcript" | "agent_variables" | "raw_payload">
> {
  const { data, error } = await (supabase as any)
    .from("parent_calling_calls")
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

export async function updateParentCallingFollowUp(
  id: string,
  followUpStatus: ParentCallingFollowUp,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("parent_calling_leads")
    .update({ follow_up_status: followUpStatus })
    .eq("id", id);

  if (error) throw error;
}

export async function updateParentCallingLeadStatus(
  id: string,
  leadStatus: ParentCallingLeadStatus,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("parent_calling_leads")
    .update({ lead_status: leadStatus })
    .eq("id", id);

  if (error) throw error;
}

export async function softDeleteParentCallingCall(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("parent_calling_calls")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
