import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import {
  useDriverSchoolStudents,
  useOptimizeDropOrder,
  useOptimizePickupOrder,
  useReorderStudents,
} from "@/hooks/useRouteOrdering";
import { StudentRouteOrder } from "@/services/routeOrderingService";
import { getTripAssignmentsForDriver } from "@/services/driverTripService";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  ArrowLeft,
  Car,
  GraduationCap,
  GripVertical,
  Loader2,
  MapPin,
  Route,
  Sparkles,
  Sunrise,
  Sunset,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type OrderType = "pickup" | "drop";

export default function RouteOrderingDetailPage() {
  const { driverId, schoolId } = useParams<{
    driverId: string;
    schoolId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const driverIdNum = parseInt(driverId || "0");
  const schoolIdNum = parseInt(schoolId || "0");

  const {
    data: route,
    isLoading,
    error,
    refetch,
  } = useDriverSchoolStudents(driverIdNum, schoolIdNum);

  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [students, setStudents] = useState<StudentRouteOrder[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const reorderMutation = useReorderStudents();
  const optimizePickupMutation = useOptimizePickupOrder();
  const optimizeDropMutation = useOptimizeDropOrder();

  // Fetch trip assignments to show trip badge per student
  const { data: tripAssignments = {} } = useSimpleQuery<Record<number, string>>(
    () => getTripAssignmentsForDriver(driverIdNum, schoolIdNum),
    [driverIdNum, schoolIdNum],
    { enabled: !!driverIdNum && !!schoolIdNum }
  );

  // Update local students when route data changes
  useEffect(() => {
    if (route?.students) {
      const sorted = [...route.students].sort((a, b) => {
        if (orderType === "pickup") {
          return a.pickup_order - b.pickup_order;
        }
        return a.drop_order - b.drop_order;
      });
      setStudents(sorted);
    }
  }, [route, orderType]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !user?.id) return;

    const items = [...students];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for responsiveness
    const updatedStudents = items.map((s, idx) => ({
      ...s,
      [orderType === "pickup" ? "pickup_order" : "drop_order"]: idx + 1,
    }));
    setStudents(updatedStudents);

    // Save to database
    setIsSaving(true);
    try {
      await reorderMutation.mutateAsync({
        driverId: driverIdNum,
        schoolId: schoolIdNum,
        studentIds: items.map((s) => s.student_id),
        type: orderType,
        adminUserId: user.id,
      });
      toast.success("Order saved successfully");
    } catch (err) {
      console.error("Failed to save order:", err);
      toast.error("Failed to save order");
      refetch(); // Reload on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoOptimize = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      let optimizedOrder: number[];

      if (orderType === "pickup") {
        optimizedOrder = await optimizePickupMutation.mutateAsync({
          driverId: driverIdNum,
          schoolId: schoolIdNum,
        });
      } else {
        optimizedOrder = await optimizeDropMutation.mutateAsync({
          driverId: driverIdNum,
          schoolId: schoolIdNum,
        });
      }

      // Apply the optimized order
      await reorderMutation.mutateAsync({
        driverId: driverIdNum,
        schoolId: schoolIdNum,
        studentIds: optimizedOrder,
        type: orderType,
        adminUserId: user.id,
      });

      await refetch();
      toast.success(`${orderType === "pickup" ? "Pickup" : "Drop-off"} order optimized!`);
    } catch (err) {
      console.error("Failed to optimize:", err);
      toast.error("Failed to optimize route");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !route) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="outline" onClick={() => navigate("/route-ordering")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Routes
          </Button>
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-destructive">
                {error?.message || "Route not found"}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/route-ordering")}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Routes
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Route Ordering</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Car className="h-4 w-4" />
                <span>{route.driver_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                <span>{route.school_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Type Toggle & Auto Optimize */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-2">
                <Button
                  variant={orderType === "pickup" ? "default" : "outline"}
                  onClick={() => setOrderType("pickup")}
                >
                  <Sunrise className="mr-2 h-4 w-4" />
                  Pickup Order
                </Button>
                <Button
                  variant={orderType === "drop" ? "default" : "outline"}
                  onClick={() => setOrderType("drop")}
                >
                  <Sunset className="mr-2 h-4 w-4" />
                  Drop-off Order
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={handleAutoOptimize}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Auto-Optimize Route
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {orderType === "pickup"
                  ? "Drag and drop to set the order students will be picked up in the morning"
                  : "Drag and drop to set the order students will be dropped off after school"}
              </span>
              {isSaving && (
                <Badge variant="secondary" className="ml-2">
                  Saving...
                </Badge>
              )}
            </div>

            {/* Draggable Student List */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="students">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {students.map((student, index) => (
                      <Draggable
                        key={student.student_id}
                        draggableId={String(student.student_id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 rounded-lg border bg-card transition-colors ${
                              snapshot.isDragging
                                ? "border-primary bg-primary/5 shadow-lg"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {student.student_name}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {student.student_class && (
                                    <span>Class {student.student_class}</span>
                                  )}
                                  {student.student_section && (
                                    <span>- {student.student_section}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">
                                    {orderType === "pickup"
                                      ? student.pickup_address
                                      : student.drop_address}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {tripAssignments[student.student_id] && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {tripAssignments[student.student_id]}
                                  </Badge>
                                )}
                                <Badge
                                  variant={
                                    (orderType === "pickup"
                                      ? student.pickup_latitude
                                      : student.drop_latitude)
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {(orderType === "pickup"
                                    ? student.pickup_latitude
                                    : student.drop_latitude)
                                    ? "GPS Available"
                                    : "No GPS"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {students.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No students found for this route.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Route Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Route Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Driver</div>
                  <div className="font-medium">{route.driver_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">School</div>
                  <div className="font-medium">{route.school_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Route className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Students</div>
                  <div className="font-medium">{students.length} students</div>
                </div>
              </div>
            </div>
            {route.school_address && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">School Address</div>
                    <div className="text-sm text-muted-foreground">
                      {route.school_address}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
