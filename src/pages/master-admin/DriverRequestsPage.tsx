import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePendingAssignmentRequests,
  useAllAssignmentRequests,
  useApproveAssignmentRequest,
  useRejectAssignmentRequest,
  useAvailableDrivers,
} from "@/hooks/useDriverAssignmentRequests";
import { useState } from "react";
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle, UserPlus, UserMinus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DriverRequestsPage() {
  return (
    <DashboardLayout>
      <DriverRequestsContent />
    </DashboardLayout>
  );
}

function DriverRequestsContent() {
  const { data: pendingRequests, isLoading: loadingPending } = usePendingAssignmentRequests();
  const { data: allRequests, isLoading: loadingAll } = useAllAssignmentRequests();

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    request: any | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, request: null, action: null });

  const approvedCount = allRequests?.filter(r => r.status === 'approved').length || 0;
  const rejectedCount = allRequests?.filter(r => r.status === 'rejected').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Driver Assignment Requests</h1>
        <p className="text-muted-foreground">
          Review and approve driver assignment requests from fleet owners
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allRequests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>
                Review and take action on pending driver assignment requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : pendingRequests && pendingRequests.length > 0 ? (
                <RequestsTable
                  requests={pendingRequests}
                  showActions
                  onReview={(request, action) =>
                    setReviewDialog({ open: true, request, action })
                  }
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>
                Complete history of driver assignment requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAll ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : allRequests && allRequests.length > 0 ? (
                <RequestsTable requests={allRequests} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No requests yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReviewDialog
        open={reviewDialog.open}
        request={reviewDialog.request}
        action={reviewDialog.action}
        onClose={() => setReviewDialog({ open: false, request: null, action: null })}
      />
    </div>
  );
}

function RequestsTable({
  requests,
  showActions = false,
  onReview,
}: {
  requests: any[];
  showActions?: boolean;
  onReview?: (request: any, action: 'approve' | 'reject') => void;
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fleet Owner</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.request_id}>
            <TableCell>
              <div>
                <div className="font-medium">{request.fleet_owner?.company_name}</div>
                <div className="text-sm text-muted-foreground">{request.fleet_owner?.contact_person}</div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={request.request_type === 'assign' ? 'default' : 'secondary'}>
                {request.request_type === 'assign' ? (
                  <><UserPlus className="mr-1 h-3 w-3" />Assign</>
                ) : (
                  <><UserMinus className="mr-1 h-3 w-3" />Unassign</>
                )}
              </Badge>
            </TableCell>
            <TableCell>
              {request.driver ? (
                <div>
                  <div className="font-medium">{request.driver.name || request.driver.cab_number}</div>
                  <div className="text-sm text-muted-foreground">{request.driver.cab_number}</div>
                </div>
              ) : (
                <span className="text-muted-foreground italic">Any available driver</span>
              )}
            </TableCell>
            <TableCell className="max-w-xs">
              <div className="space-y-1">
                <div className="text-sm truncate" title={request.reason}>
                  {request.reason}
                </div>
                {request.notes && (
                  <div className="text-xs text-muted-foreground truncate" title={request.notes}>
                    {request.notes}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(request.status)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
            </TableCell>
            {showActions && (
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onReview?.(request, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReview?.(request, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReviewDialog({
  open,
  request,
  action,
  onClose,
}: {
  open: boolean;
  request: any | null;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
}) {
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const approveRequest = useApproveAssignmentRequest();
  const rejectRequest = useRejectAssignmentRequest();
  const { data: availableDrivers, isLoading: loadingDrivers } = useAvailableDrivers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!request) return;

    if (action === 'approve') {
      await approveRequest.mutateAsync({
        requestId: request.request_id,
        adminNotes,
        selectedDriverId: selectedDriverId ? parseInt(selectedDriverId) : undefined,
      });
    } else if (action === 'reject') {
      await rejectRequest.mutateAsync({
        requestId: request.request_id,
        adminNotes,
      });
    }

    setAdminNotes('');
    setSelectedDriverId('');
    onClose();
  };

  if (!request) return null;

  // Check if this is an "any available driver" request
  const isAnyDriverRequest = !request.driver_id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? 'This will assign the driver to the fleet owner'
                : 'Provide a reason for rejection'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fleet Owner</Label>
              <div className="text-sm font-medium">{request.fleet_owner?.company_name}</div>
            </div>

            <div className="grid gap-2">
              <Label>Request Type</Label>
              <Badge variant={request.request_type === 'assign' ? 'default' : 'secondary'} className="w-fit">
                {request.request_type === 'assign' ? 'Assign' : 'Unassign'}
              </Badge>
            </div>

            {request.driver && (
              <div className="grid gap-2">
                <Label>Driver</Label>
                <div className="text-sm">
                  {request.driver.name || request.driver.cab_number} - {request.driver.cab_number}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Owner's Reason</Label>
              <div className="text-sm bg-muted p-3 rounded-md">{request.reason}</div>
            </div>

            {action === 'approve' && isAnyDriverRequest && request.request_type === 'assign' && (
              <div className="grid gap-2">
                <Label htmlFor="driverSelect">
                  Assign Specific Driver *
                </Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDrivers ? "Loading..." : "Select a driver to assign"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDrivers?.map((driver) => (
                      <SelectItem key={driver.driver_id} value={driver.driver_id.toString()}>
                        {driver.name || driver.cab_number} - {driver.cab_number} ({driver.vehicle_type})
                        {!driver.is_verified && ' [Unverified]'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Fleet owner requested any available driver. Select which driver to assign.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="adminNotes">
                Admin Notes {action === 'reject' && '*'}
              </Label>
              <Textarea
                id="adminNotes"
                placeholder={
                  action === 'approve'
                    ? 'Optional notes for your records...'
                    : 'Explain why this request is being rejected...'
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                required={action === 'reject'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                (action === 'reject' && !adminNotes) ||
                (action === 'approve' && isAnyDriverRequest && request.request_type === 'assign' && !selectedDriverId) ||
                approveRequest.isPending ||
                rejectRequest.isPending
              }
              variant={action === 'approve' ? 'default' : 'destructive'}
            >
              {(approveRequest.isPending || rejectRequest.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : action === 'approve' ? (
                'Approve Request'
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
