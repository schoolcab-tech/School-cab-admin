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
  useDeleteDriverHiringCall,
  useDriverHiringCalls,
  useUpdateDriverHiringVisitStatus,
} from "@/hooks/useDriverHiringLeads";
import {
  getDriverHiringCallDetail,
  type DriverHiringCall,
  type DriverHiringLeadTag,
  type DriverHiringVisitStatus,
} from "@/services/driverHiringLeadsService";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const TAG_LABELS: Record<string, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  objecting: "Objecting",
  not_fit: "Not fit",
};

const TAG_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  hot: "default",
  warm: "secondary",
  cold: "outline",
  objecting: "secondary",
  not_fit: "destructive",
};

const VISIT_OPTIONS: { value: DriverHiringVisitStatus; label: string }[] = [
  { value: "none", label: "No visit" },
  { value: "pending", label: "Visit pending" },
  { value: "visited", label: "Visited" },
  { value: "no_show", label: "No-show" },
  { value: "joined", label: "Joined" },
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="break-words">{value}</div>
    </div>
  );
}

export default function DriverHiringLeadsPage() {
  const { data: calls = [], isLoading, error, refetch } = useDriverHiringCalls();
  const updateVisit = useUpdateDriverHiringVisitStatus();
  const deleteCall = useDeleteDriverHiringCall();
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selected, setSelected] = useState<DriverHiringCall | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(() => {
    if (tagFilter === "all") return calls;
    return calls.filter((call) => call.lead_tag === tagFilter);
  }, [calls, tagFilter]);

  const stats = useMemo(() => {
    const byTag = (tag: DriverHiringLeadTag) =>
      calls.filter((call) => call.lead_tag === tag).length;
    return {
      total: calls.length,
      connected: calls.filter((call) => call.connectivity_status === "connected").length,
      hot: byTag("hot"),
      pendingVisits: calls.filter((call) => call.visit_status === "pending").length,
    };
  }, [calls]);

  const handleVisitStatus = async (
    leadId: string | null,
    visitStatus: DriverHiringVisitStatus
  ) => {
    if (!leadId) {
      toast.error("No lead row for this number yet");
      return;
    }
    try {
      await updateVisit.mutateAsync({ id: leadId, visitStatus });
      await refetch();
      toast.success("Visit status updated");
    } catch {
      toast.error("Failed to update visit status");
    }
  };

  const openDetails = async (call: DriverHiringCall) => {
    setSelected(call);
    setDetailLoading(true);
    try {
      const detail = await getDriverHiringCallDetail(call.id);
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
            <h1 className="text-3xl font-bold tracking-tight">Driver hiring</h1>
            <p className="text-muted-foreground">
              Every Sarvam hiring call, saved in the database.
            </p>
          </div>
          <ExportButton
            headers={[
              "Received",
              "Phone",
              "Name",
              "Connected",
              "Completion",
              "Failure reason",
              "Duration sec",
              "Lead tag",
              "Lead score",
              "Interest",
              "Hub",
              "Visit",
              "Visit status",
              "Valid licence",
              "Address proof",
              "Deposit",
              "Callback",
              "Not fit reason",
              "Needs human",
              "Summary",
              "Agent number",
              "Attempt id",
              "Campaign id",
              "Interaction id",
              "Retry",
              "Call start",
              "Call end",
            ]}
            rows={filtered.map((call) => [
              formatWhen(call.executed_at || call.created_at),
              call.phone ?? "",
              call.name ?? "",
              call.connectivity_status ?? "",
              call.completion_status ?? "",
              call.failure_reason ?? "",
              call.duration_sec != null ? String(call.duration_sec) : "",
              call.lead_tag ?? "",
              call.lead_score != null ? String(call.lead_score) : "",
              call.interest_type ?? "",
              call.preferred_hub ?? "",
              call.visit_datetime_text ?? "",
              call.visit_status,
              call.has_valid_licence ?? "",
              call.has_address_proof ?? "",
              call.deposit_path ?? "",
              call.callback_datetime_text ?? "",
              call.not_fit_reason ?? "",
              call.needs_human_escalation ?? "",
              call.call_summary ?? "",
              call.agent_phone_number ?? "",
              call.attempt_id ?? "",
              call.campaign_id ?? "",
              call.interaction_id ?? "",
              call.retry_attempt != null ? String(call.retry_attempt) : "",
              formatWhen(call.started_at),
              formatWhen(call.ended_at),
            ])}
            filename={`driver-hiring-calls-${new Date().toISOString().split("T")[0]}`}
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
              <div className="text-2xl font-bold">
                {isLoading ? "…" : stats.connected}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "…" : stats.hot}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Visits pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "…" : stats.pendingVisits}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Calls</CardTitle>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="objecting">Objecting</SelectItem>
                <SelectItem value="not_fit">Not fit</SelectItem>
              </SelectContent>
            </Select>
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
                No calls yet. They appear here after Sarvam posts the campaign
                webhook.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Call</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Visit</TableHead>
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
                        <div className="font-medium">{call.name || "Unknown"}</div>
                        <div className="text-sm text-muted-foreground">
                          {call.phone || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{text(call.connectivity_status)}</div>
                        <div className="text-sm text-muted-foreground">
                          {call.duration_sec != null
                            ? `${call.duration_sec}s`
                            : text(call.failure_reason)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {call.lead_tag ? (
                          <Badge variant={TAG_VARIANT[call.lead_tag] ?? "outline"}>
                            {TAG_LABELS[call.lead_tag] ?? call.lead_tag}
                            {call.lead_score != null ? ` · ${call.lead_score}` : ""}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{text(call.preferred_hub)}</div>
                        <div className="text-sm text-muted-foreground">
                          {text(call.visit_datetime_text)}
                        </div>
                        <Select
                          value={call.visit_status}
                          onValueChange={(value) =>
                            handleVisitStatus(
                              call.lead_id,
                              value as DriverHiringVisitStatus
                            )
                          }
                          disabled={!call.lead_id || updateVisit.isPending}
                        >
                          <SelectTrigger className="w-[140px] h-8 mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VISIT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm line-clamp-3">
                          {call.call_summary || call.not_fit_reason || "—"}
                        </p>
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
                                  This hides the call from the list. A later attempt
                                  to the same number is saved as a new row.
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
              {selected?.name || "Call"} · {selected?.phone || "No phone"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Detail label="Connected" value={text(selected.connectivity_status)} />
              <Detail label="Completion" value={text(selected.completion_status)} />
              <Detail label="Failure" value={text(selected.failure_reason)} />
              <Detail label="Next action" value={text(selected.next_action_status)} />
              <Detail label="Duration" value={text(selected.duration_sec)} />
              <Detail label="Interest" value={text(selected.interest_type)} />
              <Detail label="Hub" value={text(selected.preferred_hub)} />
              <Detail label="Visit" value={text(selected.visit_datetime_text)} />
              <Detail label="Licence" value={text(selected.has_valid_licence)} />
              <Detail label="Address proof" value={text(selected.has_address_proof)} />
              <Detail label="Deposit" value={text(selected.deposit_path)} />
              <Detail label="Callback" value={text(selected.callback_datetime_text)} />
              <Detail label="Not fit" value={text(selected.not_fit_reason)} />
              <Detail label="Needs human" value={text(selected.needs_human_escalation)} />
              <Detail label="Summary" value={text(selected.call_summary)} />
              <Detail label="Agent number" value={text(selected.agent_phone_number)} />
              <Detail label="Attempt" value={text(selected.attempt_id)} />
              <Detail label="Campaign" value={text(selected.campaign_id)} />
              <Detail label="Cohort" value={text(selected.cohort_id)} />
              <Detail label="Interaction" value={text(selected.interaction_id)} />
              <Detail label="Retry" value={text(selected.retry_attempt)} />
              <Detail label="Started" value={formatWhen(selected.started_at)} />
              <Detail label="Ended" value={formatWhen(selected.ended_at)} />
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
              <div>
                <div className="text-sm font-medium mb-2">Raw payload</div>
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <pre className="text-xs whitespace-pre-wrap break-words bg-muted rounded-md p-3">
                    {JSON.stringify(selected.raw_payload ?? {}, null, 2)}
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
