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
import { useAuth } from "@/contexts/auth-context";
import { useDriverSchoolRoutes } from "@/hooks/useRouteOrdering";
import {
  ArrowRight,
  Bus,
  Car,
  GraduationCap,
  Eye,
  Loader2,
  Route,
  Search,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface RouteOrderingContentProps {
  schoolId?: number;
  readOnly?: boolean;
  basePath?: string;
}

export function RouteOrderingContent({
  schoolId,
  readOnly = false,
  basePath = "/route-ordering",
}: RouteOrderingContentProps) {
  const { data: routes = [], isLoading, error } = useDriverSchoolRoutes(schoolId);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const filteredRoutes = routes.filter(
    (route) =>
      route.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.school_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const routesWithCustomOrder = routes.filter((r) => r.has_custom_order).length;
  const totalStudents = routes.reduce((sum, r) => sum + r.student_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Route Ordering</h1>
        <p className="text-muted-foreground">
          {readOnly
            ? "View pickup and drop-off order for drivers serving your school."
            : "Configure pickup and drop-off order for students per driver per school."}
        </p>
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
            <div className="text-2xl font-bold">{isLoading ? "..." : routes.length}</div>
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
              {isLoading ? "..." : routes.length - routesWithCustomOrder}
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
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No routes found matching your search"
                : "No active routes found. Routes are created when students have confirmed monthly bookings with drivers."}
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
  const { linkedSchoolId } = useAuth();
  return (
    <DashboardLayout>
      {linkedSchoolId ? (
        <RouteOrderingContent
          schoolId={linkedSchoolId}
          readOnly
          basePath="/school-admin/route-ordering"
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No school linked to your account.
        </div>
      )}
    </DashboardLayout>
  );
}
