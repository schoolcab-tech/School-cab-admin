import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useOwnerDrivers } from "@/hooks/useFleetMappings";
import {
  useMyAssignmentRequests,
  useCreateAssignmentRequest,
  useCancelAssignmentRequest,
  useAvailableDrivers,
} from "@/hooks/useDriverAssignmentRequests";
import { useState } from "react";
import { Loader2, Plus, UserPlus, UserMinus, Clock, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { downloadCSV } from "@/lib/csvExport";
import { toast } from "sonner";

export default function RequestDriversPage() {
  return (
    <DashboardLayout>
      <RequestDriversContent />
    </DashboardLayout>
  );
}

function RequestDriversContent() {
  const { data: fleetOwner, isLoading: loadingOwner } = useMyFleetOwner();
  const { data: currentDrivers } = useOwnerDrivers(fleetOwner?.owner_id);
  const { data: requests, isLoading: loadingRequests } = useMyAssignmentRequests(fleetOwner?.owner_id);
  const { data: availableDrivers, isLoading: loadingDrivers } = useAvailableDrivers();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;

  const handleExportRequests = () => {
    if (!requests || requests.length === 0) {
      toast.error("No requests to export");
      return;
    }
    downloadCSV(
      ["Type", "Driver", "Cab Number", "Reason", "Status", "Requested At", "Admin Notes"],
      requests.map((request) => [
        request.request_type,
        request.driver?.name || "Any available",
        request.driver?.cab_number || "",
        request.reason,
        request.status,
        format(new Date(request.requested_at), "MMM dd, yyyy HH:mm"),
        request.admin_notes || "",
      ]),
      `driver-requests-${new Date().toISOString().split("T")[0]}`
    );
    toast.success("Requests exported successfully");
  };

  if (loadingOwner || loadingRequests) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Driver Requests</h1>
          <p className="text-muted-foreground">
            Request driver assignments or unassignments
          </p>
        </div>
        <div className="flex gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <RequestForm
              ownerId={fleetOwner?.owner_id}
              currentDrivers={currentDrivers || []}
              availableDrivers={availableDrivers || []}
              loadingDrivers={loadingDrivers}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={handleExportRequests} disabled={!requests?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting admin approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Drivers</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentDrivers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active in your fleet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Drivers</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableDrivers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Not assigned to any fleet
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>
            View all your driver assignment requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <RequestsTable requests={requests} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No requests yet. Create your first request to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestForm({
  ownerId,
  currentDrivers,
  availableDrivers,
  loadingDrivers,
  onSuccess,
}: {
  ownerId?: number;
  currentDrivers: any[];
  availableDrivers: any[];
  loadingDrivers: boolean;
  onSuccess: () => void;
}) {
  const [requestType, setRequestType] = useState<'assign' | 'unassign'>('assign');
  const [driverId, setDriverId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const createRequest = useCreateAssignmentRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownerId) {
      return;
    }

    await createRequest.mutateAsync({
      ownerId,
      input: {
        driver_id: driverId && driverId !== 'any' ? parseInt(driverId) : null,
        request_type: requestType,
        reason,
        notes,
      },
    });

    // Reset form
    setDriverId('');
    setReason('');
    setNotes('');
    onSuccess();
  };

  const driversToShow = requestType === 'assign' ? availableDrivers : currentDrivers;

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>New Driver Request</DialogTitle>
        <DialogDescription>
          Request to assign a new driver or unassign an existing one
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="requestType">Request Type</Label>
          <Select
            value={requestType}
            onValueChange={(value: 'assign' | 'unassign') => {
              setRequestType(value);
              setDriverId(''); // Reset driver selection
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assign">Assign New Driver</SelectItem>
              <SelectItem value="unassign">Unassign Current Driver</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="driver">
            {requestType === 'assign' ? 'Select Driver (Optional)' : 'Select Driver'}
          </Label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger>
              <SelectValue placeholder={loadingDrivers ? "Loading..." : "Select a driver"} />
            </SelectTrigger>
            <SelectContent>
              {requestType === 'assign' && (
                <SelectItem value="any">Any Available Driver</SelectItem>
              )}
              {driversToShow?.map((driver) => (
                <SelectItem key={driver.driver_id} value={driver.driver_id.toString()}>
                  {driver.name || driver.cab_number} - {driver.cab_number} ({driver.vehicle_type})
                  {!driver.is_verified && ' [Unverified]'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {requestType === 'assign'
              ? "Leave empty to request any available driver"
              : "Select which driver you want to unassign"}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="reason">Reason *</Label>
          <Textarea
            id="reason"
            placeholder="Why do you need this assignment/unassignment?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any additional information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={!reason || createRequest.isPending}
        >
          {createRequest.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RequestsTable({ requests }: { requests: any[] }) {
  const cancelRequest = useCancelAssignmentRequest();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
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
          <TableHead>Type</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Admin Notes</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.request_id}>
            <TableCell>
              <Badge variant={request.request_type === 'assign' ? 'default' : 'secondary'}>
                {request.request_type === 'assign' ? 'Assign' : 'Unassign'}
              </Badge>
            </TableCell>
            <TableCell>
              {request.driver ? (
                <div>
                  <div className="font-medium">{request.driver.name || request.driver.cab_number}</div>
                  <div className="text-sm text-muted-foreground">{request.driver.cab_number}</div>
                </div>
              ) : (
                <span className="text-muted-foreground">Any available</span>
              )}
            </TableCell>
            <TableCell className="max-w-xs">
              <div className="truncate" title={request.reason}>
                {request.reason}
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(request.status)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
            </TableCell>
            <TableCell>
              {request.admin_notes && (
                <div className="text-sm max-w-xs truncate" title={request.admin_notes}>
                  {request.admin_notes}
                </div>
              )}
            </TableCell>
            <TableCell>
              {request.status === 'pending' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => cancelRequest.mutate(request.request_id)}
                  disabled={cancelRequest.isPending}
                >
                  Cancel
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
