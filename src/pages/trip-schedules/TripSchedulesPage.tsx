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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import {
  useActivateTripSchedule,
  useAlertsByDate,
  useDeleteTripSchedule,
  useDriverAlertHistory,
  useDriversForSchedule,
  useSchoolsByIds,
  useTripSchedules,
  useUpdateAlertStatus,
  useUpsertTripSchedule,
} from "@/hooks/useTripSchedules";
import type { TripSchedule, TripStartAlert } from "@/services/tripScheduleService";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function TripSchedulesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("schedules");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Trip Schedules & Alerts
          </h1>
          <p className="text-muted-foreground">
            Configure expected trip start times and monitor driver compliance.
          </p>
        </div>

        <StatsCards />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="mt-4">
            <SchedulesTab userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <AlertsTab userId={user?.id || ""} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ── Stats Cards ──────────────────────────────────────────────────────

function StatsCards() {
  const { data: schedules = [], isLoading: schedulesLoading } = useTripSchedules();
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: alerts = [], isLoading: alertsLoading } = useAlertsByDate(todayStr);

  const activeSchedules = schedules.filter((s) => s.is_active).length;
  const inactiveSchedules = schedules.filter((s) => !s.is_active).length;
  const pendingAlerts = alerts.filter((a) => a.status === "pending").length;
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved").length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {schedulesLoading ? "..." : activeSchedules}
          </div>
          <p className="text-xs text-muted-foreground">
            Configured driver-school pairs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <PowerOff className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {schedulesLoading ? "..." : inactiveSchedules}
          </div>
          <p className="text-xs text-muted-foreground">
            Deactivated schedules
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Pending Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {alertsLoading ? "..." : pendingAlerts}
          </div>
          <p className="text-xs text-muted-foreground">
            Unresolved today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {alertsLoading ? "..." : resolvedAlerts}
          </div>
          <p className="text-xs text-muted-foreground">
            Alerts resolved today
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Schedules Tab ────────────────────────────────────────────────────

function SchedulesTab({ userId }: { userId: string }) {
  const { data: schedules = [], isLoading, error } = useTripSchedules();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TripSchedule | null>(null);

  const deactivateMutation = useDeleteTripSchedule();
  const activateMutation = useActivateTripSchedule();

  const filteredSchedules = schedules.filter(
    (s) =>
      s.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.school_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (schedule: TripSchedule) => {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSchedule(null);
    setDialogOpen(true);
  };

  const handleToggleActive = async (schedule: TripSchedule) => {
    try {
      if (schedule.is_active) {
        await deactivateMutation.mutateAsync({
          driverId: schedule.driver_id,
          schoolId: schedule.school_id,
        });
        toast.success("Schedule deactivated");
      } else {
        await activateMutation.mutateAsync({
          driverId: schedule.driver_id,
          schoolId: schedule.school_id,
        });
        toast.success("Schedule activated");
      }
    } catch (err) {
      toast.error("Failed to update schedule status");
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${minutes} ${ampm}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Driver Trip Schedules</CardTitle>
          <Button onClick={handleAdd} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by driver or school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Error loading schedules: {(error as Error).message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Morning Time</TableHead>
                <TableHead>Evening Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.map((schedule) => (
                <TableRow key={schedule.schedule_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.driver_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.school_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatTime(schedule.morning_start_time)}</TableCell>
                  <TableCell>{formatTime(schedule.evening_start_time)}</TableCell>
                  <TableCell>
                    {schedule.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(schedule)}
                        className="h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(schedule)}
                        className="h-8 w-8 p-0"
                        title={schedule.is_active ? "Deactivate" : "Activate"}
                      >
                        {schedule.is_active ? (
                          <PowerOff className="h-4 w-4 text-destructive" />
                        ) : (
                          <Power className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!isLoading && filteredSchedules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? "No schedules found matching your search"
              : "No trip schedules configured yet. Click \"Add Schedule\" to get started."}
          </div>
        )}
      </CardContent>

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingSchedule={editingSchedule}
        userId={userId}
      />
    </Card>
  );
}

// ── Schedule Add/Edit Dialog ─────────────────────────────────────────

function ScheduleDialog({
  open,
  onOpenChange,
  editingSchedule,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSchedule: TripSchedule | null;
  userId: string;
}) {
  const { data: drivers = [] } = useDriversForSchedule();
  const upsertMutation = useUpsertTripSchedule();

  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [morningTime, setMorningTime] = useState("");
  const [eveningTime, setEveningTime] = useState("");

  const selectedDriver = drivers.find(
    (d) => d.driver_id === Number(selectedDriverId)
  );
  const { data: schools = [] } = useSchoolsByIds(
    selectedDriver?.schools_serving || []
  );

  useEffect(() => {
    if (editingSchedule) {
      setSelectedDriverId(String(editingSchedule.driver_id));
      setSelectedSchoolId(String(editingSchedule.school_id));
      setMorningTime(editingSchedule.morning_start_time?.slice(0, 5) || "");
      setEveningTime(editingSchedule.evening_start_time?.slice(0, 5) || "");
    } else {
      setSelectedDriverId("");
      setSelectedSchoolId("");
      setMorningTime("");
      setEveningTime("");
    }
  }, [editingSchedule, open]);

  const handleSubmit = async () => {
    if (!selectedDriverId || !selectedSchoolId) {
      toast.error("Please select a driver and school");
      return;
    }

    if (!morningTime && !eveningTime) {
      toast.error("Please set at least one time (morning or evening)");
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        input: {
          driver_id: Number(selectedDriverId),
          school_id: Number(selectedSchoolId),
          morning_start_time: morningTime || null,
          evening_start_time: eveningTime || null,
        },
        adminUserId: userId,
      });
      toast.success(editingSchedule ? "Schedule updated" : "Schedule created");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save schedule");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingSchedule ? "Edit Trip Schedule" : "Add Trip Schedule"}
          </DialogTitle>
          <DialogDescription>
            Set the expected morning and evening trip start times for a driver-school pair.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Driver</Label>
            <Select
              value={selectedDriverId}
              onValueChange={(val) => {
                setSelectedDriverId(val);
                setSelectedSchoolId("");
              }}
              disabled={!!editingSchedule}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.driver_id} value={String(driver.driver_id)}>
                    {driver.name} (ID: {driver.driver_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>School</Label>
            <Select
              value={selectedSchoolId}
              onValueChange={setSelectedSchoolId}
              disabled={!!editingSchedule || !selectedDriverId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedDriverId
                      ? "Select a driver first"
                      : schools.length === 0
                      ? "No schools assigned"
                      : "Select a school"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {schools.map((school) => (
                  <SelectItem key={school.school_id} value={String(school.school_id)}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Morning Start Time</Label>
              <Input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                placeholder="07:30"
              />
              <p className="text-xs text-muted-foreground">
                Expected pickup trip start
              </p>
            </div>

            <div className="space-y-2">
              <Label>Evening Start Time</Label>
              <Input
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                placeholder="14:00"
              />
              <p className="text-xs text-muted-foreground">
                Expected drop trip start
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {editingSchedule ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Alerts Tab ───────────────────────────────────────────────────────

interface DriverSummary {
  driver_id: number;
  driver_name: string;
  total: number;
  pending: number;
  acknowledged: number;
  resolved: number;
  schools: string[];
  alerts: TripStartAlert[];
}

function AlertsTab({ userId }: { userId: string }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const { data: alerts = [], isLoading, error } = useAlertsByDate(selectedDate);
  const updateStatusMutation = useUpdateAlertStatus();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolvingAlert, setResolvingAlert] = useState<TripStartAlert | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // Group alerts by driver
  const driverSummaries = useMemo(() => {
    const map = new Map<number, DriverSummary>();
    for (const alert of alerts) {
      let summary = map.get(alert.driver_id);
      if (!summary) {
        summary = {
          driver_id: alert.driver_id,
          driver_name: alert.driver_name,
          total: 0,
          pending: 0,
          acknowledged: 0,
          resolved: 0,
          schools: [],
          alerts: [],
        };
        map.set(alert.driver_id, summary);
      }
      summary.total++;
      if (alert.status === "pending") summary.pending++;
      else if (alert.status === "acknowledged") summary.acknowledged++;
      else if (alert.status === "resolved") summary.resolved++;
      if (!summary.schools.includes(alert.school_name)) {
        summary.schools.push(alert.school_name);
      }
      summary.alerts.push(alert);
    }
    // Sort by pending count descending
    return Array.from(map.values()).sort((a, b) => b.pending - a.pending);
  }, [alerts]);

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleAcknowledge = async (alert: TripStartAlert) => {
    try {
      await updateStatusMutation.mutateAsync({
        alertId: alert.alert_id,
        status: "acknowledged",
        userId,
      });
      toast.success("Alert acknowledged");
    } catch (err) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const handleOpenResolve = (alert: TripStartAlert) => {
    setResolvingAlert(alert);
    setResolveNotes("");
    setResolveDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!resolvingAlert) return;
    try {
      await updateStatusMutation.mutateAsync({
        alertId: resolvingAlert.alert_id,
        status: "resolved",
        userId,
        notes: resolveNotes || undefined,
      });
      toast.success("Alert resolved");
      setResolveDialogOpen(false);
    } catch (err) {
      toast.error("Failed to resolve alert");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="destructive">Pending</Badge>;
      case "acknowledged":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Acknowledged</Badge>;
      case "resolved":
        return <Badge className="bg-green-600 hover:bg-green-700">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${minutes} ${ampm}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              Trip Alerts
              {isToday && (
                <Badge variant="outline" className="text-xs font-normal">
                  Today
                </Badge>
              )}
            </CardTitle>

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateDate(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 w-[180px] h-8"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateDate(1)}
                disabled={isToday}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedDate(new Date().toISOString().split("T")[0])
                  }
                >
                  Today
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading alerts: {(error as Error).message}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No alerts for {format(new Date(selectedDate + "T00:00:00"), "dd MMM yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                {isToday
                  ? "All drivers are starting their trips on time"
                  : "No missed trips were recorded on this date"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Driver Summary Cards */}
              {driverSummaries.map((summary) => (
                <Card key={summary.driver_id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold text-base">
                            {summary.driver_name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {summary.schools.join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-sm">
                          {summary.pending > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {summary.pending} pending
                            </Badge>
                          )}
                          {summary.acknowledged > 0 && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">
                              {summary.acknowledged} ack
                            </Badge>
                          )}
                          {summary.resolved > 0 && (
                            <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                              {summary.resolved} resolved
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDriverId(summary.driver_id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          History
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>School</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Expected Time</TableHead>
                          <TableHead>Alert Sent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.alerts.map((alert) => (
                          <TableRow key={alert.alert_id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                <span>{alert.school_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {alert.alert_type === "morning" ? "Morning" : "Evening"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatTime(alert.expected_start_time)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(alert.alert_sent_at), {
                                addSuffix: true,
                              })}
                            </TableCell>
                            <TableCell>{getStatusBadge(alert.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {alert.status === "pending" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAcknowledge(alert)}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    Acknowledge
                                  </Button>
                                )}
                                {(alert.status === "pending" ||
                                  alert.status === "acknowledged") && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleOpenResolve(alert)}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    Resolve
                                  </Button>
                                )}
                                {alert.notes && (
                                  <span
                                    className="text-xs text-muted-foreground ml-2"
                                    title={alert.notes}
                                  >
                                    Note: {alert.notes.slice(0, 30)}
                                    {alert.notes.length > 30 ? "..." : ""}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              {resolvingAlert && (
                <>
                  Resolve the {resolvingAlert.alert_type} trip alert for{" "}
                  <strong>{resolvingAlert.driver_name}</strong> at{" "}
                  <strong>{resolvingAlert.school_name}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="e.g., Driver called in sick, substitute arranged..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Resolve Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver History Dialog */}
      {selectedDriverId && (
        <DriverHistoryDialog
          driverId={selectedDriverId}
          onClose={() => setSelectedDriverId(null)}
        />
      )}
    </>
  );
}

// ── Driver History Dialog ────────────────────────────────────────────

function DriverHistoryDialog({
  driverId,
  onClose,
}: {
  driverId: number;
  onClose: () => void;
}) {
  const { data: allAlerts = [], isLoading } = useDriverAlertHistory(driverId);

  const driverName = allAlerts[0]?.driver_name || "Driver";

  // Compute monthly breakdown
  const monthlyStats = useMemo(() => {
    const map = new Map<
      string,
      { month: string; total: number; pending: number; acknowledged: number; resolved: number }
    >();

    for (const alert of allAlerts) {
      const monthKey = alert.alert_date.slice(0, 7); // YYYY-MM
      let stat = map.get(monthKey);
      if (!stat) {
        const d = new Date(alert.alert_date + "T00:00:00");
        stat = {
          month: format(d, "MMMM yyyy"),
          total: 0,
          pending: 0,
          acknowledged: 0,
          resolved: 0,
        };
        map.set(monthKey, stat);
      }
      stat.total++;
      if (alert.status === "pending") stat.pending++;
      else if (alert.status === "acknowledged") stat.acknowledged++;
      else if (alert.status === "resolved") stat.resolved++;
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, stat]) => stat);
  }, [allAlerts]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="destructive">Pending</Badge>;
      case "acknowledged":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Acknowledged</Badge>;
      case "resolved":
        return <Badge className="bg-green-600 hover:bg-green-700">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {driverName} - Alert History
          </DialogTitle>
          <DialogDescription>
            Complete history of missed trip timeline alerts for this driver.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No alert history found for this driver.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Monthly Summary */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Monthly Summary</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {monthlyStats.map((stat) => (
                  <Card key={stat.month} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{stat.month}</span>
                        <span className="text-lg font-bold">{stat.total}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        {stat.pending > 0 && (
                          <span className="text-destructive font-medium">
                            {stat.pending} pending
                          </span>
                        )}
                        {stat.acknowledged > 0 && (
                          <span className="text-yellow-600 font-medium">
                            {stat.acknowledged} ack
                          </span>
                        )}
                        {stat.resolved > 0 && (
                          <span className="text-green-600 font-medium">
                            {stat.resolved} resolved
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Full Alert History Table */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                All Alerts ({allAlerts.length} total)
              </h3>
              <div className="rounded-md border overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expected Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allAlerts.map((alert) => (
                      <TableRow key={alert.alert_id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(
                            new Date(alert.alert_date + "T00:00:00"),
                            "dd MMM yyyy"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span>{alert.school_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {alert.alert_type === "morning" ? "Morning" : "Evening"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(alert.expected_start_time)}</TableCell>
                        <TableCell>{getStatusBadge(alert.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {alert.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
