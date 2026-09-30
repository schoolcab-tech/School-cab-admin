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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context"
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import {
  useCancelDriverDeleteRequest,
  useCreateDriverDeleteRequest,
  useMyDriverDeleteRequests,
} from "@/hooks/useDriverDeleteRequests";
import { useMySchoolAdmin } from "@/hooks/useSchoolAdmins";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  getLiveDriverLocations,
  type DriverLiveLocation,
} from "@/services/liveTrackingService";
import { formatDistanceToNow } from "date-fns";
import {
  Car,
  CheckCircle,
  Eye,
  Loader2,
  Phone,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function SchoolAdminDriversPage() {
  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}

function Content() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const driversBase = location.pathname.startsWith("/moderator")
    ? "/moderator/drivers"
    : "/school-admin/drivers";
  const activeSchoolId = useActiveSchoolId();
  const { data: mySchoolAdmin } = useMySchoolAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [requestDialog, setRequestDialog] = useState<{
    open: boolean;
    driver: DriverLiveLocation | null;
  }>({ open: false, driver: null });
  const [reason, setReason] = useState("");

  const {
    data: drivers = [],
    isLoading,
    error,
  } = useSimpleQuery<DriverLiveLocation[]>(
    () =>
      activeSchoolId
        ? getLiveDriverLocations({ schoolId: activeSchoolId })
        : Promise.resolve([]),
    [activeSchoolId],
    { enabled: !!activeSchoolId, refetchInterval: 30000 }
  );

  const {
    data: myRequests = [],
    isLoading: loadingRequests,
    refetch: refetchRequests,
  } = useMyDriverDeleteRequests(mySchoolAdmin?.school_admin_id);

  const createRequest = useCreateDriverDeleteRequest();
  const cancelRequest = useCancelDriverDeleteRequest();

  const pendingByDriverId = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of myRequests) {
      if (r.status === "pending" && r.driver_id != null) {
        map.set(r.driver_id, r.request_id);
      }
    }
    return map;
  }, [myRequests]);

  const filtered = useMemo(() => {
    if (!searchTerm) return drivers;
    const s = searchTerm.toLowerCase();
    return drivers.filter(
      (d) =>
        d.driver_name.toLowerCase().includes(s) ||
        d.cab_number.toLowerCase().includes(s) ||
        d.phone?.toLowerCase().includes(s)
    );
  }, [drivers, searchTerm]);

  const summary = useMemo(() => {
    const live = drivers.filter((d) => d.is_live).length;
    return { total: drivers.length, live, inactive: drivers.length - live };
  }, [drivers]);

  const openRequestDialog = (driver: DriverLiveLocation) => {
    setReason("");
    setRequestDialog({ open: true, driver });
  };

  const handleSubmitRequest = async () => {
    if (!requestDialog.driver || !mySchoolAdmin || !activeSchoolId || !user) {
      return;
    }

    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      toast({
        title: "Reason required",
        description: "Please explain why this driver should be deleted (at least 5 characters).",
        variant: "destructive",
      });
      return;
    }

    try {
      await createRequest.mutateAsync({
        schoolAdminId: mySchoolAdmin.school_admin_id,
        schoolId: activeSchoolId,
        driverId: requestDialog.driver.driver_id,
        reason: trimmed,
      });
      toast({
        title: "Request submitted",
        description: "An admin will review your driver delete request.",
      });
      setRequestDialog({ open: false, driver: null });
      setReason("");
      await refetchRequests();
    } catch (err) {
      toast({
        title: "Failed to submit request",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (!window.confirm("Cancel this delete request?")) return;
    try {
      await cancelRequest.mutateAsync(requestId);
      toast({ title: "Request cancelled" });
      await refetchRequests();
    } catch (err) {
      toast({
        title: "Failed to cancel",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (!activeSchoolId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          School not linked to your account. Contact the master admin.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Car className="h-7 w-7" />
          Drivers Serving Your School
        </h1>
        <p className="text-muted-foreground">
          You can request deletion of a driver (with a reason). Admins review and
          delete after approval. Status auto-refreshes every 30 seconds.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-xs text-muted-foreground">Total Drivers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.live}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{summary.inactive}</div>
            <div className="text-xs text-muted-foreground">Inactive</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Driver Directory</CardTitle>
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && drivers.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error: {error.message}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Vehicle Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const pendingRequestId = pendingByDriverId.get(d.driver_id);
                  return (
                    <TableRow key={d.driver_id}>
                      <TableCell className="font-medium">{d.driver_name}</TableCell>
                      <TableCell>{d.cab_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {d.vehicle_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {d.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.is_verified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {d.is_live ? (
                          d.status === "on_trip" ? (
                            <Badge style={{ backgroundColor: "#2563eb", color: "white" }}>
                              On Trip
                            </Badge>
                          ) : (
                            <Badge style={{ backgroundColor: "#16a34a", color: "white" }}>
                              Active
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelative(d.last_seen_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`${driversBase}/${d.driver_id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Details
                          </Button>
                          {pendingRequestId ? (
                            <Badge variant="outline" className="text-amber-700 border-amber-300">
                              Delete requested
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/40 hover:bg-destructive/10"
                              onClick={() => openRequestDialog(d)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Request Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No drivers found{searchTerm ? " matching your search" : ""}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Delete Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : myRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No delete requests yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRequests.map((r) => (
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
                    <TableCell className="max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={cancelRequest.isPending}
                          onClick={() => handleCancelRequest(r.request_id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={requestDialog.open}
        onOpenChange={(open) => {
          if (!open) setRequestDialog({ open: false, driver: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Driver Deletion</DialogTitle>
            <DialogDescription>
              Submit a request to delete{" "}
              <strong>{requestDialog.driver?.driver_name}</strong>
              {requestDialog.driver?.cab_number
                ? ` (${requestDialog.driver.cab_number})`
                : ""}
              . An admin must approve before the driver is removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-reason">Reason (required)</Label>
            <Textarea
              id="delete-reason"
              placeholder="Explain why this driver should be deleted..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestDialog({ open: false, driver: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitRequest}
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
  }
  if (status === "approved") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
