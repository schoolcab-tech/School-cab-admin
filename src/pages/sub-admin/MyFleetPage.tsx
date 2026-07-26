import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportButton } from "@/components/ExportButton";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useOwnerDrivers } from "@/hooks/useFleetMappings";
import { useState, useEffect } from "react";
import {
  Car,
  Loader2,
  Route,
  Star,
  User,
  UserCog,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type DriverRoute = {
  school_id: number;
  school_name: string;
};

export default function MyFleetPage() {
  return (
    <DashboardLayout>
      <MyFleetContent />
    </DashboardLayout>
  );
}

function MyFleetContent() {
  const navigate = useNavigate();
  const { data: fleetOwner, isLoading: loadingOwner } = useMyFleetOwner();
  const { data: drivers, isLoading: loadingDrivers } = useOwnerDrivers(
    fleetOwner?.owner_id
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [driverStats, setDriverStats] = useState<
    Record<number, { students: number }>
  >({});
  const [driverRoutes, setDriverRoutes] = useState<
    Record<number, DriverRoute[]>
  >({});
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const fetchDriverStats = async () => {
      if (!drivers || drivers.length === 0) return;

      setLoadingStats(true);
      const stats: Record<number, { students: number }> = {};
      const routes: Record<number, DriverRoute[]> = {};

      for (const driver of drivers) {
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select(
            `
            student_id,
            school_id,
            schools!inner(name)
          `
          )
          .eq("driver_id", driver.driver_id)
          .eq("status", "confirmed")
          .eq("booking_type", "monthly");

        stats[driver.driver_id] = {
          students: bookingsData?.length || 0,
        };

        const schoolMap = new Map<number, string>();
        for (const booking of bookingsData || []) {
          const school = booking.schools as unknown as { name: string };
          schoolMap.set(booking.school_id, school?.name || "Unknown School");
        }
        routes[driver.driver_id] = Array.from(schoolMap.entries()).map(
          ([school_id, school_name]) => ({ school_id, school_name })
        );
      }

      setDriverStats(stats);
      setDriverRoutes(routes);
      setLoadingStats(false);
    };

    fetchDriverStats();
  }, [drivers]);

  const filteredDrivers = drivers?.filter((driver) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      driver.name?.toLowerCase().includes(search) ||
      driver.cab_number.toLowerCase().includes(search) ||
      driver.phone?.toLowerCase().includes(search) ||
      driver.vehicle_type.toLowerCase().includes(search)
    );
  });

  if (loadingOwner || loadingDrivers) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Car className="h-8 w-8" />
            My Fleet
          </h1>
          <p className="text-muted-foreground">
            View drivers, switch student assignments, and manage trip routes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={() => navigate("/sub-admin/students")}
          >
            <UserCog className="mr-2 h-4 w-4" />
            Switch Drivers
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/sub-admin/route-ordering")}
          >
            <Route className="mr-2 h-4 w-4" />
            Trip Order
          </Button>
          <ExportButton
            headers={[
              "Driver Name",
              "Cab Number",
              "Vehicle Type",
              "Capacity",
              "Phone",
              "Status",
              "Rating",
              "Active Students",
            ]}
            rows={(drivers || []).map((driver) => {
              const stats = driverStats[driver.driver_id] || { students: 0 };
              return [
                driver.name || "",
                driver.cab_number,
                driver.vehicle_type,
                driver.cab_capacity,
                driver.phone || "",
                driver.is_verified ? "Active" : "Pending",
                driver.avg_rating?.toFixed(1) || "N/A",
                stats.students,
              ];
            })}
            filename={`fleet-report-${new Date().toISOString().split("T")[0]}`}
            disabled={!drivers?.length}
            label="Export"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fleet Drivers ({drivers?.length || 0})</CardTitle>
            <div className="relative w-64">
              <Input
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDrivers && filteredDrivers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Cab Number</TableHead>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Active Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => {
                    const stats = driverStats[driver.driver_id] || {
                      students: 0,
                    };
                    const routes = driverRoutes[driver.driver_id] || [];

                    return (
                      <TableRow key={driver.driver_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {driver.name}
                          </div>
                        </TableCell>
                        <TableCell>{driver.cab_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{driver.vehicle_type}</Badge>
                        </TableCell>
                        <TableCell>{driver.cab_capacity} seats</TableCell>
                        <TableCell>
                          {driver.avg_rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              {driver.avg_rating.toFixed(1)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {loadingStats ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Badge variant="secondary">
                              {stats.students} students
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {driver.is_verified ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/sub-admin/students?driverId=${driver.driver_id}`
                                )
                              }
                            >
                              <UserCog className="mr-1 h-3 w-3" />
                              Switch
                            </Button>
                            {routes.length === 1 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate(
                                    `/sub-admin/route-ordering/${driver.driver_id}/${routes[0].school_id}`
                                  )
                                }
                              >
                                <Route className="mr-1 h-3 w-3" />
                                Trip Order
                              </Button>
                            ) : routes.length > 1 ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Route className="mr-1 h-3 w-3" />
                                    Trip Order
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {routes.map((route) => (
                                    <DropdownMenuItem
                                      key={route.school_id}
                                      onClick={() =>
                                        navigate(
                                          `/sub-admin/route-ordering/${driver.driver_id}/${route.school_id}`
                                        )
                                      }
                                    >
                                      {route.school_name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                title="No active student routes"
                              >
                                <Route className="mr-1 h-3 w-3" />
                                Trip Order
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm
                ? "No drivers found matching your search"
                : "No drivers assigned to your fleet yet"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
