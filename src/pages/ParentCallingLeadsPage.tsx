import { DashboardLayout } from "@/components/DashboardLayout";
import { ExportButton } from "@/components/ExportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useDeleteParentCallingCall,
  useParentCallingCalls,
  useUpdateParentCallingFollowUp,
  useUpdateParentCallingLeadStatus,
} from "@/hooks/useParentCallingLeads";
import {
  getParentCallingCallDetail,
  type ParentCallingCall,
  type ParentCallingFollowUp,
  type ParentCallingLeadStatus,
  type ParentCallingOutcome,
} from "@/services/parentCallingLeadsService";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const TAG_LABELS: Record<string, string> = {
  hot_link_sent: "Hot — link agreed",
  warm: "Warm",
  callback: "Callback",
  human_callback: "Human callback",
  not_serviceable: "Not serviceable",
  cold: "Cold",
  invalid: "Invalid",
  do_not_call: "Do not call",
};

const TAG_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  hot_link_sent: "default",
  warm: "secondary",
  callback: "outline",
  human_callback: "secondary",
  not_serviceable: "outline",
  cold: "outline",
  invalid: "destructive",
  do_not_call: "destructive",
};

const TAG_HELP: Record<string, string> = {
  hot_link_sent: "WhatsApp the official link after 4 hours, then call after 24 hours.",
  warm: "Call again in 2–3 days.",
  human_callback: "A person calls within 24 hours.",
  do_not_call: "Drop this number from the next cohort.",
};

const FOLLOW_UP_OPTIONS: { value: ParentCallingFollowUp; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "link_sent", label: "Link sent" },
  { value: "reminded", label: "Reminded" },
  { value: "converted", label: "Paid" },
  { value: "closed", label: "Closed" },
];

const LEAD_STATUS_OPTIONS: { value: ParentCallingLeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "interested", label: "Interested" },
  { value: "price_objection", label: "Price objection" },
  { value: "callback", label: "Callback" },
  { value: "not_interested", label: "Not interested" },
  { value: "flagged", label: "Flagged" },
  { value: "do_not_call", label: "Do not call" },
];

const LEAD_STATUS_LABELS: Record<ParentCallingLeadStatus, string> = {
  new: "New",
  interested: "Interested",
  price_objection: "Price objection",
  callback: "Callback",
  not_interested: "Not interested",
  flagged: "Flagged",
  do_not_call: "Do not call",
};

const OUTCOME_FILTERS: ParentCallingOutcome[] = [
  "hot_link_sent",
  "warm",
  "callback",
  "human_callback",
  "not_serviceable",
  "cold",
  "invalid",
  "do_not_call",
];

function formatWhen(dateString: string | null) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "MMM dd, yyyy hh:mm a");
  } catch {
    return dateString;
  }
}

function text(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function money(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="break-words">{value}</div>
    </div>
  );
}

export default function ParentCallingLeadsPage() {
  const { data: calls = [], isLoading, error, refetch } = useParentCallingCalls();
  const updateFollowUp = useUpdateParentCallingFollowUp();
  const updateLeadStatus = useUpdateParentCallingLeadStatus();
  const deleteCall = useDeleteParentCallingCall();
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ParentCallingCall | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(() => {
    return calls.filter((call) => {
      const tagOk = tagFilter === "all" || call.outcome_tag === tagFilter;
      const statusOk = statusFilter === "all" || call.lead_status === statusFilter;
      return tagOk && statusOk;
    });
  }, [calls, tagFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: calls.length,
      connected: calls.filter((call) => call.connectivity_status === "connected").length,
      hot: calls.filter((call) => call.outcome_tag === "hot_link_sent").length,
      toSend: calls.filter((call) => call.follow_up_status === "open" && call.outcome_tag === "hot_link_sent").length,
    };
  }, [calls]);

  const handleFollowUp = async (
    leadId: string | null,
    followUpStatus: ParentCallingFollowUp,
  ) => {
    if (!leadId) {
      toast.error("No lead row for this number yet");
      return;
    }
    try {
      await updateFollowUp.mutateAsync({ id: leadId, followUpStatus });
      await refetch();
      toast.success("Follow-up updated");
    } catch {
      toast.error("Failed to update follow-up");
    }
  };

  const handleLeadStatus = async (
    leadId: string | null,
    leadStatus: ParentCallingLeadStatus,
  ) => {
    if (!leadId) {
      toast.error("No lead row for this number yet");
      return;
    }
    try {
      await updateLeadStatus.mutateAsync({ id: leadId, leadStatus });
      await refetch();
      toast.success("Lead status updated");
    } catch {
      toast.error("Failed to update lead status");
    }
  };

  const openDetails = async (call: ParentCallingCall) => {
    setSelected(call);
    setDetailLoading(true);
    try {
      const detail = await getParentCallingCallDetail(call.id);
      setSelected((current) =>
        current?.id === call.id ? { ...current, ...detail } : current
      );
    } catch {
      toast.error("Could not load the full call");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCall.mutateAsync(id);
      await refetch();
      toast.success("Call removed");
    } catch {
      toast.error("Failed to remove call");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parent calling</h1>
            <p className="text-muted-foreground">
              Every SchoolCab parent call. Hot means they agreed to the link — send it yourself.
              Warm: call in 2–3 days. Human callback: within 24 hours. Do not call: drop the number.
            </p>
          </div>
          <ExportButton
            headers={[
              "Received",
              "Phone",
              "Parent",
              "Child",
              "Class",
              "School",
              "Pickup",
              "Fee quoted",
              "Outcome",
              "Lead status",
              "Follow-up",
              "Callback",
              "Connected",
              "Duration sec",
              "Lead score",
              "Link agreed",
              "Needs human",
              "Summary",
              "WhatsApp",
              "Direction",
              "Current mode",
              "Main pain",
              "Attempt id",
              "Campaign id",
            ]}
            rows={filtered.map((call) => [
              formatWhen(call.executed_at || call.created_at),
              call.phone ?? "",
              call.parent_name ?? "",
              call.child_name ?? "",
              call.child_class ?? "",
              call.school_name ?? "",
              call.pickup_area ?? "",
              call.fee_quoted != null ? String(call.fee_quoted) : "",
              call.outcome_tag ?? "",
              call.lead_status,
              call.follow_up_status,
              call.callback_time ?? "",
              call.connectivity_status ?? "",
              call.duration_sec != null ? String(call.duration_sec) : "",
              call.lead_score != null ? String(call.lead_score) : "",
              call.link_agreed ?? "",
              call.needs_human ?? "",
              call.call_summary ?? "",
              call.whatsapp_number ?? "",
              call.direction ?? "",
              call.current_mode ?? "",
              call.main_pain ?? "",
              call.attempt_id ?? "",
              call.campaign_id ?? "",
            ])}
            filename={`parent-calling-${new Date().toISOString().split("T")[0]}`}
            disabled={filtered.length === 0}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "…" : stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "…" : stats.connected}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hot — link agreed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "…" : stats.hot}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Links still to send</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "…" : stats.toSend}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Calls</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lead status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All lead statuses</SelectItem>
                  {LEAD_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {OUTCOME_FILTERS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {TAG_LABELS[tag]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="text-center py-10 text-destructive">
                Could not load calls. {error.message}
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">
                No calls yet. They appear here after Sarvam posts the campaign webhook.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Child</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Lead status</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatWhen(call.executed_at || call.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{call.parent_name || "Unknown"}</div>
                        <div className="text-sm text-muted-foreground">
                          {call.phone || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{text(call.child_name)}</div>
                        <div className="text-sm text-muted-foreground">
                          {text(call.child_class)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{text(call.school_name)}</div>
                        <div className="text-sm text-muted-foreground">
                          {text(call.pickup_area)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {money(call.fee_quoted)}
                      </TableCell>
                      <TableCell>
                        {call.outcome_tag ? (
                          <Badge variant={TAG_VARIANT[call.outcome_tag] ?? "outline"}>
                            {TAG_LABELS[call.outcome_tag] ?? call.outcome_tag}
                            {call.lead_score != null ? ` · ${call.lead_score}` : ""}
                          </Badge>
                        ) : (
                          "—"
                        )}
                        {call.callback_time ? (
                          <div className="text-sm text-muted-foreground mt-1">
                            {call.callback_time}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={call.lead_status}
                          onValueChange={(value) =>
                            handleLeadStatus(call.lead_id, value as ParentCallingLeadStatus)
                          }
                          disabled={!call.lead_id || updateLeadStatus.isPending}
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={call.follow_up_status}
                          onValueChange={(value) =>
                            handleFollowUp(call.lead_id, value as ParentCallingFollowUp)
                          }
                          disabled={!call.lead_id || updateFollowUp.isPending}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FOLLOW_UP_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm line-clamp-3">{call.call_summary || "—"}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetails(call)}
                          >
                            Details
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove this call?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This hides the call from the list. A later attempt to the
                                  same number is saved as a new row.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(call.id)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected?.parent_name || "Call"} · {selected?.phone || "No phone"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.outcome_tag && TAG_HELP[selected.outcome_tag] ? (
                <p className="text-sm text-muted-foreground">
                  {TAG_HELP[selected.outcome_tag]}
                </p>
              ) : null}
              <Detail label="Child" value={text(selected.child_name)} />
              <Detail label="Class" value={text(selected.child_class)} />
              <Detail label="Children" value={text(selected.child_count)} />
              <Detail label="School" value={text(selected.school_name)} />
              <Detail label="Pickup" value={text(selected.pickup_area)} />
              <Detail label="Direction" value={text(selected.direction)} />
              <Detail label="Travels by" value={text(selected.current_mode)} />
              <Detail label="Main pain" value={text(selected.main_pain)} />
              <Detail label="Distance km" value={text(selected.distance_km)} />
              <Detail label="Fee quoted" value={money(selected.fee_quoted)} />
              <Detail label="Pre-book explained" value={text(selected.prebook_explained)} />
              <Detail label="Link agreed" value={text(selected.link_agreed)} />
              <Detail label="Outcome" value={text(selected.outcome_tag)} />
              <Detail label="Lead status" value={LEAD_STATUS_LABELS[selected.lead_status] ?? text(selected.lead_status)} />
              <Detail label="Follow-up" value={text(selected.follow_up_status)} />
              <Detail label="Callback" value={text(selected.callback_time)} />
              <Detail label="Needs human" value={text(selected.needs_human)} />
              <Detail label="Objections" value={text(selected.objection_codes)} />
              <Detail label="Unanswered" value={text(selected.unanswered_questions)} />
              <Detail label="Summary" value={text(selected.call_summary)} />
              <Detail label="Connected" value={text(selected.connectivity_status)} />
              <Detail label="Duration" value={text(selected.duration_sec)} />
              <Detail label="WhatsApp" value={text(selected.whatsapp_number)} />
              <Detail label="Agent number" value={text(selected.agent_phone_number)} />
              <Detail label="Attempt" value={text(selected.attempt_id)} />
              <Detail label="Campaign" value={text(selected.campaign_id)} />
              <div>
                <div className="text-sm font-medium mb-2">Transcript</div>
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Loading transcript…</p>
                ) : selected.transcript?.length ? (
                  <div className="space-y-2 text-sm">
                    {selected.transcript.map((turn, index) => (
                      <p key={index}>
                        <span className="font-medium">{turn.role || "turn"}:</span>{" "}
                        {turn.en_text || turn.indic_text || ""}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No transcript</p>
                )}
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Agent variables</div>
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <pre className="text-xs whitespace-pre-wrap break-words bg-muted rounded-md p-3">
                    {JSON.stringify(selected.agent_variables ?? {}, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
