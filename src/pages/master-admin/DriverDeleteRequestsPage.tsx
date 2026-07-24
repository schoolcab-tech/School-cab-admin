import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  useAllDriverDeleteRequests,
  useApproveAndDeleteDriver,
  usePendingDriverDeleteRequests,
  useRejectDriverDeleteRequest,
} from "@/hooks/useDriverDeleteRequests";
import type { DriverDeleteRequestWithDetails } from "@/services/driverDeleteRequestService";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export default function DriverDeleteRequestsPage() {
  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}

function Content() {
  const {
    data: pending = [],
    isLoading: loadingPending,
    refetch: refetchPending,
  } = usePendingDriverDeleteRequests();
  const {
    data: all = [],
    isLoading: loadingAll,
    refetch: refetchAll,
  } = useAllDriverDeleteRequests();

  const approveMutation = useApproveAndDeleteDriver();
  const rejectMutation = useRejectDriverDeleteRequest();

  const [review, setReview] = useState<{
    open: boolean;
    request: DriverDeleteRequestWithDetails | null;
    action: "approve" | "reject" | null;
  }>({ open: false, request: null, action: null });
  const [adminNotes, setAdminNotes] = useState("");

  const approvedCount = all.filter((r) => r.status === "approved").length;
  const rejectedCount = all.filter((r) => r.status === "rejected").length;

  const openReview = (
    request: DriverDeleteRequestWithDetails,
    action: "approve" | "reject"
  ) => {
    setAdminNotes("");
    setReview({ open: true, request, action });
  };

  const refresh = async () => {
    await Promise.all([refetchPending(), refetchAll()]);
  };

  const handleConfirm = async () => {
    if (!review.request || !review.action) return;

    try {
      if (review.action === "approve") {
        await approveMutation.mutateAsync({
          requestId: review.request.request_id,
          adminNotes: adminNotes.trim() || undefined,
        });
        toast({
          title: "Driver deleted",
          description: "Request approved and driver removed.",
        });
      } else {
        await rejectMutation.mutateAsync({
          requestId: review.request.request_id,
          adminNotes: adminNotes.trim() || undefined,
        });
        toast({ title: "Request rejected" });
      }
      setReview({ open: false, request: null, action: null });
      await refresh();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const isPending =
    approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Driver Delete Requests
        </h1>
        <p className="text-muted-foreground">
          Review deletion requests from school admins. Approving deletes the
          driver.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{all.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <RequestsTable
            requests={pending}
            loading={loadingPending}
            showActions
            onApprove={(r) => openReview(r, "approve")}
            onReject={(r) => openReview(r, "reject")}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <RequestsTable
            requests={all}
            loading={loadingAll}
            showActions={false}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={review.open}
        onOpenChange={(open) => {
          if (!open) setReview({ open: false, request: null, action: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {review.action === "approve"
                ? "Approve & Delete Driver"
                : "Reject Delete Request"}
            </DialogTitle>
            <DialogDescription>
              {review.action === "approve"
                ? `This will permanently delete ${
                    review.request?.driver?.name ||
                    review.request?.driver_name_snapshot ||
                    "this driver"
                  }. This cannot be undone.`
                : "The school admin will see this request as rejected."}
            </DialogDescription>
          </DialogHeader>

          {review.request && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Driver: </span>
                <span className="font-medium">
                  {review.request.driver?.name ||
                    review.request.driver_name_snapshot ||
                    "—"}{" "}
                  ({review.request.driver?.cab_number ||
                    review.request.cab_number_snapshot ||
                    "—"})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">School: </span>
                <span className="font-medium">
                  {review.request.school?.name || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Requested by: </span>
                <span className="font-medium">
                  {review.request.school_admin?.contact_person || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Reason: </span>
                <p className="mt-1 rounded-md border bg-muted/40 p-3">
                  {review.request.reason}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin notes (optional)</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add a note for the record..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setReview({ open: false, request: null, action: null })
              }
            >
              Cancel
            </Button>
            <Button
              variant={review.action === "approve" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : review.action === "approve" ? (
                <Trash2 className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {review.action === "approve" ? "Delete Driver" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestsTable({
  requests,
  loading,
  showActions,
  onApprove,
  onReject,
}: {
  requests: DriverDeleteRequestWithDetails[];
  loading: boolean;
  showActions: boolean;
  onApprove?: (r: DriverDeleteRequestWithDetails) => void;
  onReject?: (r: DriverDeleteRequestWithDetails) => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No requests found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              {showActions && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.request_id}>
                <TableCell>
                  <div className="font-medium">
                    {r.driver?.name ||
                      r.driver_name_snapshot ||
                      `Driver ${r.driver_id ?? ""}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.driver?.cab_number || r.cab_number_snapshot || "—"}
                  </div>
                </TableCell>
                <TableCell>{r.school?.name || "—"}</TableCell>
                <TableCell>
                  <div>{r.school_admin?.contact_person || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.school_admin?.email}
                  </div>
                </TableCell>
                <TableCell className="max-w-[220px] truncate" title={r.reason}>
                  {r.reason}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(r.created_at), {
                    addSuffix: true,
                  })}
                </TableCell>
                {showActions && r.status === "pending" && (
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject?.(r)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onApprove?.(r)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Pending
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}
