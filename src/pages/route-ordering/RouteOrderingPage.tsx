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
import { useDriverSchoolRoutes } from "@/hooks/useRouteOrdering";
import {
  ArrowRight,
  Bus,
  Car,
  GraduationCap,
  Loader2,
  Route,
  Search,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RouteOrderingPage() {
  const { data: routes = [], isLoading, error } = useDriverSchoolRoutes();
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
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Route Ordering</h1>
          <p className="text-muted-foreground">
            Configure pickup and drop-off order for students per driver per school.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
                <Route className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : routes.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Driver-school combinations
              </p>
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
              <p className="text-xs text-muted-foreground">
                Routes with configured order
              </p>
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
              <div className="text-2xl font-bold">
                {isLoading ? "..." : totalStudents}
              </div>
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

        {/* Routes Table */}
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
                    <TableHead>School</TableHead>
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
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span>{route.school_name}</span>
                        </div>
                      </TableCell>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/route-ordering/${route.driver_id}/${route.school_id}/trips`
                              )
                            }
                          >
                            <Bus className="mr-2 h-4 w-4" />
                            Manage Trips
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/route-ordering/${route.driver_id}/${route.school_id}`
                              )
                            }
                          >
                            Configure Order
                            <ArrowRight className="ml-2 h-4 w-4" />
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
    </DashboardLayout>
  );
}
