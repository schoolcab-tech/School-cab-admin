import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context"
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useOwnerDrivers } from "@/hooks/useFleetMappings";
import { useDriverSchoolRoutes } from "@/hooks/useRouteOrdering";
import { downloadCSV } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Bus,
  Car,
  Download,
  GraduationCap,
  Eye,
  Loader2,
  Route,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type FleetDriverRef = {
  driver_id: number;
  name?: string | null;
  schools_serving?: number[] | null;
};

export interface RouteOrderingContentProps {
  schoolId?: number;
  driverIds?: number[];
  /** Fleet drivers used to build fallback routes when bookings query returns empty */
  fleetDrivers?: FleetDriverRef[];
  readOnly?: boolean;
  basePath?: string;
  /** When true, renders as a dashboard section (no page-level h1). */
  embedded?: boolean;
}

export function RouteOrderingContent({
  schoolId,
  driverIds,
  fleetDrivers,
  readOnly = false,
  basePath = "/route-ordering",
  embedded = false,
}: RouteOrderingContentProps) {
  const { data: routes = [], isLoading, error } = useDriverSchoolRoutes(
    schoolId,
    driverIds
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolNames, setSchoolNames] = useState<Record<number, string>>({});
  const navigate = useNavigate();

  // Load school names for fleet driver fallback routes
  useEffect(() => {
    if (!fleetDrivers?.length) return;
    const ids = [
      ...new Set(
        fleetDrivers.flatMap((d) => d.schools_serving || []).filter(Boolean)
      ),
    ] as number[];
    if (ids.length === 0) return;

    let cancelled = false;
    supabase
      .from("schools")
      .select("school_id, name")
      .in("school_id", ids)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<number, string> = {};
        for (const s of data || []) map[s.school_id] = s.name;
        setSchoolNames(map);
      });
    return () => {
      cancelled = true;
    };
  }, [fleetDrivers]);

  const displayRoutes = useMemo(() => {
    if (routes.length > 0) return routes;
    if (!fleetDrivers?.length) return [];

    const fallback: typeof routes = [];
    for (const driver of fleetDrivers) {
      for (const schoolId of driver.schools_serving || []) {
        if (typeof schoolId !== "number") continue;
        fallback.push({
          driver_id: driver.driver_id,
          driver_name: driver.name || "Unknown Driver",
          school_id: schoolId,
          school_name: schoolNames[schoolId] || `School #${schoolId}`,
          student_count: 0,
          has_custom_order: false,
        });
      }
    }
    return fallback;
  }, [routes, fleetDrivers, schoolNames]);

  const filteredRoutes = displayRoutes.filter(
    (route) =>
      route.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.school_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const routesWithCustomOrder = displayRoutes.filter((r) => r.has_custom_order).length;
  const totalStudents = displayRoutes.reduce((sum, r) => sum + r.student_count, 0);

  const handleExport = () => {
    if (displayRoutes.length === 0) return;
    downloadCSV(
      ["Driver", "School", "Students", "Order Status"],
      displayRoutes.map((route) => [
        route.driver_name,
        route.school_name,
        route.student_count,
        route.has_custom_order ? "Custom Order" : "Default Order",
      ]),
      `route-ordering-${new Date().toISOString().split("T")[0]}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          {embedded ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Route className="h-6 w-6" />
                Route Ordering
              </h2>
              <p className="text-muted-foreground">
                Set pickup and drop-off order for students on each driver route.
                Click <strong>Configure Order</strong> to drag-and-drop stops, or{" "}
                <strong>Manage Trips</strong> to split students across trips.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Route Ordering</h1>
              <p className="text-muted-foreground">
                {readOnly
                  ? "View pickup and drop-off order for drivers serving your school."
                  : "Configure pickup and drop-off order for students per driver per school."}
              </p>
            </>
          )}
        </div>
        <Button variant="outline" onClick={handleExport} disabled={displayRoutes.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
              <Route className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : displayRoutes.length}</div>
            <p className="text-xs text-muted-foreground">Driver-school combinations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Custom Orders</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : routesWithCustomOrder}
            </div>
            <p className="text-xs text-muted-foreground">Routes with configured order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all routes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : displayRoutes.length - routesWithCustomOrder}
            </div>
            <p className="text-xs text-muted-foreground">Routes using default order</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Driver-School Routes</CardTitle>
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
              Error loading routes: {error.message || "Unknown error occurred"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  {!schoolId && <TableHead>School</TableHead>}
                  <TableHead>Students</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route) => (
                  <TableRow key={`${route.driver_id}-${route.school_id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>{route.driver_name}</span>
                      </div>
                    </TableCell>
                    {!schoolId && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span>{route.school_name}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{route.student_count} students</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {route.has_custom_order ? (
                        <Badge variant="default">Custom Order</Badge>
                      ) : (
                        <Badge variant="secondary">Default Order</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!readOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `${basePath}/${route.driver_id}/${route.school_id}/trips`
                              )
                            }
                          >
                            <Bus className="mr-2 h-4 w-4" />
                            Manage Trips
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `${basePath}/${route.driver_id}/${route.school_id}`
                            )
                          }
                        >
                          {readOnly ? (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              View Order
                            </>
                          ) : (
                            <>
                              Configure Order
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredRoutes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              {searchTerm ? (
                <p>No routes found matching your search</p>
              ) : (
                <>
                  <p>No routes found for your fleet drivers yet.</p>
                  <p className="text-sm">
                    Routes appear when drivers are assigned to schools. Contact the
                    admin if your drivers should have school assignments.
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RouteOrderingPage() {
  return (
    <DashboardLayout>
      <RouteOrderingContent />
    </DashboardLayout>
  );
}

export function SchoolAdminRouteOrderingPage() {
  const { isModerator } = useAuth();
  const activeSchoolId = useActiveSchoolId();
  const basePath = isModerator ? "/moderator/route-ordering" : "/school-admin/route-ordering";
  return (
    <DashboardLayout>
      {activeSchoolId ? (
        <RouteOrderingContent
          schoolId={activeSchoolId}
          basePath={basePath}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No school linked to your account.
        </div>
      )}
    </DashboardLayout>
  );
}

export function SubAdminRouteOrderingPage() {
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

  const driverIds = drivers?.map((d) => d.driver_id) ?? [];

  return (
    <DashboardLayout>
      {driverIds.length > 0 ? (
        <RouteOrderingContent
          driverIds={driverIds}
          fleetDrivers={drivers}
          basePath="/sub-admin/route-ordering"
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No drivers assigned to your fleet yet. Request drivers to manage route ordering.
        </div>
      )}
    </DashboardLayout>
  );
}
