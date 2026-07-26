import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useDriverTrips,
  useDriverTripStudents,
  useUnassignedStudents,
  useDriverCabCapacity,
  useCreateDriverTrip,
  useDeleteDriverTrip,
  useUpdateDriverTrip,
  useAssignStudent,
  useRemoveStudent,
  useAutoAssignStudents,
  useOptimizeTripRoute,
  useReorderTripStudents,
} from "@/hooks/useDriverTrips";
import { useAuth } from "@/contexts/auth-context";
import {
  ArrowLeft,
  Bus,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Wand2,
  Pencil,
  Check,
  X,
  AlertTriangle,
  GripVertical,
  Sunrise,
  Sunset,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { DriverTrip, TripStudent, UnassignedStudent } from "@/services/driverTripService";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useOwnerDrivers } from "@/hooks/useFleetMappings";

export interface DriverTripManagementContentProps {
  listBasePath?: string;
  allowedDriverIds?: number[];
}

export function DriverTripManagementContent({
  listBasePath = "/route-ordering",
  allowedDriverIds,
}: DriverTripManagementContentProps) {
  const { driverId: driverIdParam, schoolId: schoolIdParam } = useParams();
  const driverId = Number(driverIdParam);
  const schoolId = Number(schoolIdParam);
  const navigate = useNavigate();
  const { user } = useAuth();

  if (
    allowedDriverIds != null &&
    driverId > 0 &&
    !allowedDriverIds.includes(driverId)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  const {
    data: trips = [],
    isLoading: tripsLoading,
    error: tripsError,
    refetch: refetchTrips,
  } = useDriverTrips(driverId, schoolId);

  const {
    data: unassigned = [],
    isLoading: unassignedLoading,
    refetch: refetchUnassigned,
  } = useUnassignedStudents(driverId, schoolId);

  const { data: cabCapacity = 0 } = useDriverCabCapacity(driverId);

  const createTrip = useCreateDriverTrip();
  const deleteTrip = useDeleteDriverTrip();
  const updateTrip = useUpdateDriverTrip();
  const assignStudent = useAssignStudent();
  const removeStudent = useRemoveStudent();
  const autoAssign = useAutoAssignStudents();
  const optimizeRoute = useOptimizeTripRoute();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTripForAssign, setSelectedTripForAssign] = useState<number | null>(null);
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [schoolName, setSchoolName] = useState("");

  // Load driver and school names
  useEffect(() => {
    if (trips.length > 0) return;
    // Fetch from supabase directly for header display
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase
        .from("drivers")
        .select("name")
        .eq("driver_id", driverId)
        .single()
        .then(({ data }) => setDriverName(data?.name || `Driver ${driverId}`));
      supabase
        .from("schools")
        .select("name")
        .eq("school_id", schoolId)
        .single()
        .then(({ data }) => setSchoolName(data?.name || `School ${schoolId}`));
    });
  }, [driverId, schoolId]);

  const refetchAll = async () => {
    await Promise.all([refetchTrips(), refetchUnassigned()]);
  };

  const handleCreateTrip = async () => {
    const nextOrder = trips.length > 0
      ? Math.max(...trips.map((t) => t.trip_order)) + 1
      : 1;
    try {
      await createTrip.mutateAsync({
        driverId,
        schoolId,
        tripName: `Trip ${nextOrder}`,
        tripOrder: nextOrder,
      });
      toast.success("Trip created");
      await refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create trip");
    }
  };

  const handleDeleteTrip = async (driverTripId: number, tripName: string) => {
    if (!confirm(`Delete "${tripName}"? All student assignments in this trip will be removed.`)) return;
    try {
      await deleteTrip.mutateAsync({ driverTripId });
      toast.success(`"${tripName}" deleted`);
      await refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete trip");
    }
  };

  const handleRenameSave = async (driverTripId: number) => {
    if (!editingName.trim()) return;
    try {
      await updateTrip.mutateAsync({
        driverTripId,
        updates: { trip_name: editingName.trim() },
      });
      setEditingTripId(null);
      toast.success("Trip renamed");
      await refetchTrips();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename trip");
    }
  };

  const handleAssignStudent = async (studentId: number) => {
    if (!selectedTripForAssign || !user?.id) return;
    try {
      await assignStudent.mutateAsync({
        driverTripId: selectedTripForAssign,
        studentId,
        assignedBy: user.id,
      });
      toast.success("Student assigned");
      await refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign student");
    }
  };

  const handleRemoveStudent = async (
    driverTripId: number,
    studentId: number,
    studentName: string
  ) => {
    try {
      await removeStudent.mutateAsync({ driverTripId, studentId });
      toast.success(`${studentName} removed`);
      await refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove student");
    }
  };

  const handleAutoAssign = async () => {
    if (!user?.id) return;
    if (cabCapacity <= 0) {
      toast.error("Driver has no cab capacity set. Update driver profile first.");
      return;
    }
    try {
      const created = await autoAssign.mutateAsync({
        driverId,
        schoolId,
        cabCapacity,
        assignedBy: user.id,
      });
      toast.success(
        created.length > 0
          ? `Auto-assigned students into ${created.length} new trip(s)`
          : "All students assigned to existing trips"
      );
      await refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to auto-assign");
    }
  };

  const handleOptimizeTrip = async (driverTripId: number, tripName: string, orderType: "pickup" | "drop" = "pickup") => {
    try {
      await optimizeRoute.mutateAsync({ driverTripId, schoolId, orderType });
      toast.success(`"${tripName}" ${orderType} route optimized`);
      await refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to optimize route");
    }
  };

  const totalAssigned = trips.reduce((sum, t) => sum + (t.student_count || 0), 0);
  const totalStudents = totalAssigned + unassigned.length;

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`${listBasePath}/${driverId}/${schoolId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Manage Trips
            </h1>
            <p className="text-muted-foreground">
              {driverName} &middot; {schoolName} &middot; Cab Capacity:{" "}
              <span className="font-semibold">{cabCapacity} seats</span>
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trips.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalAssigned}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${unassigned.length > 0 ? "text-orange-500" : ""}`}>
                {unassigned.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleCreateTrip} disabled={createTrip.isPending}>
            {createTrip.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add New Trip
          </Button>
          <Button
            variant="outline"
            onClick={handleAutoAssign}
            disabled={autoAssign.isPending || unassigned.length === 0}
          >
            {autoAssign.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Auto-Assign by Capacity
          </Button>
        </div>

        {/* Loading / Error */}
        {tripsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {tripsError && (
          <div className="text-center py-8 text-destructive">
            Error: {tripsError.message}
          </div>
        )}

        {/* Trip Cards */}
        {!tripsLoading &&
          trips.map((trip) => (
            <TripCard
              key={trip.driver_trip_id}
              trip={trip}
              cabCapacity={cabCapacity}
              editingTripId={editingTripId}
              editingName={editingName}
              onStartRename={(t) => {
                setEditingTripId(t.driver_trip_id);
                setEditingName(t.trip_name);
              }}
              onCancelRename={() => setEditingTripId(null)}
              onSaveRename={() => handleRenameSave(trip.driver_trip_id)}
              onEditingNameChange={setEditingName}
              onDelete={() => handleDeleteTrip(trip.driver_trip_id, trip.trip_name)}
              onOpenAssign={() => {
                setSelectedTripForAssign(trip.driver_trip_id);
                setAssignDialogOpen(true);
              }}
              onRemoveStudent={(studentId, name) =>
                handleRemoveStudent(trip.driver_trip_id, studentId, name)
              }
              onOptimize={(orderType) => handleOptimizeTrip(trip.driver_trip_id, trip.trip_name, orderType)}
              isOptimizing={optimizeRoute.isPending}
            />
          ))}

        {/* No trips state */}
        {!tripsLoading && trips.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Bus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trips configured</h3>
              <p className="text-muted-foreground mb-4">
                Create trips to split {totalStudents} students into groups based
                on cab capacity ({cabCapacity} seats).
              </p>
              <Button onClick={handleCreateTrip}>
                <Plus className="mr-2 h-4 w-4" /> Create First Trip
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Unassigned Students */}
        {unassigned.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Unassigned Students ({unassigned.length})
              </CardTitle>
              <CardDescription>
                These students have confirmed bookings but are not assigned to any trip.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unassigned.map((student) => (
                  <div
                    key={student.student_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{student.name}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        {student.class} {student.section}
                      </span>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {student.pickup_address}
                      </p>
                    </div>
                    {trips.length > 0 && (
                      <div className="flex gap-2">
                        {trips.map((trip) => (
                          <Button
                            key={trip.driver_trip_id}
                            variant="outline"
                            size="sm"
                            disabled={assignStudent.isPending}
                            onClick={() => {
                              setSelectedTripForAssign(trip.driver_trip_id);
                              handleAssignStudent(student.student_id);
                            }}
                          >
                            <UserPlus className="mr-1 h-3 w-3" />
                            {trip.trip_name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Students to Trip</DialogTitle>
              <DialogDescription>
                Select students to add to this trip.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {unassignedLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : unassigned.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  All students are assigned to trips.
                </p>
              ) : (
                unassigned.map((student) => (
                  <div
                    key={student.student_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleAssignStudent(student.student_id)}
                  >
                    <div>
                      <span className="font-medium">{student.name}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        {student.class} {student.section}
                      </span>
                    </div>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}

export default function DriverTripManagement() {
  return (
    <DashboardLayout>
      <DriverTripManagementContent />
    </DashboardLayout>
  );
}

export function SubAdminDriverTripManagement() {
  const { data: fleetOwner, isLoading: loadingOwner } = useMyFleetOwner();
  const { data: drivers, isLoading: loadingDrivers } = useOwnerDrivers(
    fleetOwner?.owner_id
  );

  if (loadingOwner || loadingDrivers) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const allowedDriverIds = drivers?.map((d) => d.driver_id) ?? [];

  return (
    <DashboardLayout>
      <DriverTripManagementContent
        listBasePath="/sub-admin/route-ordering"
        allowedDriverIds={allowedDriverIds}
      />
    </DashboardLayout>
  );
}

/**
 * Individual Trip Card with inline student list
 */
function TripCard({
  trip,
  cabCapacity,
  editingTripId,
  editingName,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onEditingNameChange,
  onDelete,
  onOpenAssign,
  onRemoveStudent,
  onOptimize,
  isOptimizing,
}: {
  trip: DriverTrip;
  cabCapacity: number;
  editingTripId: number | null;
  editingName: string;
  onStartRename: (trip: DriverTrip) => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onEditingNameChange: (name: string) => void;
  onDelete: () => void;
  onOpenAssign: () => void;
  onRemoveStudent: (studentId: number, name: string) => void;
  onOptimize: (orderType: "pickup" | "drop") => void;
  isOptimizing: boolean;
}) {
  const { data: students = [], isLoading, refetch } = useDriverTripStudents(
    trip.driver_trip_id
  );
  const reorderMutation = useReorderTripStudents();

  const [orderType, setOrderType] = useState<"pickup" | "drop">("pickup");
  const [localStudents, setLocalStudents] = useState(students);
  useEffect(() => {
    const hasAnyPickupOrder = students.some((s) => s.pickup_order != null);
    const hasAnyDropOrder = students.some((s) => s.drop_order != null);

    const sorted = [...students].sort((a, b) => {
      if (orderType === "drop") {
        if (hasAnyDropOrder) {
          if (a.drop_order == null && b.drop_order == null) return a.student_name.localeCompare(b.student_name);
          if (a.drop_order == null) return 1;
          if (b.drop_order == null) return -1;
          return a.drop_order - b.drop_order;
        }
        // No drop_order saved yet — reverse of pickup order, or alphabetical
        if (hasAnyPickupOrder) {
          const pA = a.pickup_order ?? 999;
          const pB = b.pickup_order ?? 999;
          return pB - pA;
        }
        return a.student_name.localeCompare(b.student_name);
      }
      // Pickup mode
      if (hasAnyPickupOrder) {
        if (a.pickup_order == null && b.pickup_order == null) return a.student_name.localeCompare(b.student_name);
        if (a.pickup_order == null) return 1;
        if (b.pickup_order == null) return -1;
        return a.pickup_order - b.pickup_order;
      }
      // No pickup_order set — alphabetical
      return a.student_name.localeCompare(b.student_name);
    });
    setLocalStudents(sorted);
  }, [students, orderType]);

  const isEditing = editingTripId === trip.driver_trip_id;
  const isOverCapacity = localStudents.length > cabCapacity;
  const isAtCapacity = localStudents.length === cabCapacity;

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const reordered = [...localStudents];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setLocalStudents(reordered);

    try {
      await reorderMutation.mutateAsync({
        driverTripId: trip.driver_trip_id,
        orderedStudentIds: reordered.map((s) => s.student_id),
        orderType,
      });
      toast.success(`${orderType === "drop" ? "Drop-off" : "Pickup"} order saved`);
      refetch(); // Refetch so switching tabs shows fresh data
    } catch {
      toast.error("Failed to save order");
      refetch();
    }
  };

  return (
    <Card className={isOverCapacity ? "border-red-300" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bus className="h-5 w-5 text-primary" />
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => onEditingNameChange(e.target.value)}
                  className="h-8 w-48"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveRename();
                    if (e.key === "Escape") onCancelRename();
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onSaveRename}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCancelRename}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{trip.trip_name}</CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onStartRename(trip)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
            <Badge
              variant={
                isOverCapacity
                  ? "destructive"
                  : isAtCapacity
                  ? "default"
                  : "secondary"
              }
            >
              {localStudents.length}/{cabCapacity} students
            </Badge>
            {isOverCapacity && (
              <Badge variant="destructive">Over capacity!</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 border rounded-md p-0.5">
              <Button
                variant={orderType === "pickup" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setOrderType("pickup")}
              >
                <Sunrise className="mr-1 h-3 w-3" />
                Pickup
              </Button>
              <Button
                variant={orderType === "drop" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setOrderType("drop")}
              >
                <Sunset className="mr-1 h-3 w-3" />
                Drop-off
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOptimize(orderType)}
              disabled={isOptimizing || localStudents.length < 2}
            >
              {isOptimizing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              Optimize
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenAssign}>
              <UserPlus className="mr-1 h-4 w-4" />
              Add Students
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : localStudents.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No students assigned yet. Click "Add Students" to assign.
          </p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`trip-${trip.driver_trip_id}`}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {localStudents.map((student, idx) => (
                    <Draggable
                      key={student.student_id}
                      draggableId={`trip-student-${student.student_id}`}
                      index={idx}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-2 border rounded-md ${
                            snapshot.isDragging
                              ? "bg-accent shadow-lg"
                              : "hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-mono text-muted-foreground w-6">
                              {idx + 1}.
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{student.student_name}</span>
                                {student.student_class && (
                                  <span className="text-muted-foreground text-sm">
                                    {student.student_class} {student.student_section}
                                  </span>
                                )}
                                {student.pickup_latitude != null && student.pickup_longitude != null ? (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-green-600 border-green-300">
                                    <MapPin className="h-2.5 w-2.5 mr-0.5" />GPS
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-muted-foreground">
                                    No GPS
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate max-w-lg">
                                {orderType === "drop" ? student.drop_address : student.pickup_address}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              onRemoveStudent(student.student_id, student.student_name)
                            }
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </CardContent>
    </Card>
  );
}
