import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/auth-context";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { getAllVehicles, type Vehicle } from "@/services/vehicleService";
import {
  Car,
  Eye,
  Loader2,
  Search,
  Truck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface VehiclesPageProps {
  /** If set, only show vehicles for drivers serving this school. */
  schoolId?: number;
}

export default function VehiclesPage(_props: VehiclesPageProps) {
  return (
    <DashboardLayout>
      <VehiclesContent />
    </DashboardLayout>
  );
}

/** Wrapper for the school-admin variant — passes the linkedSchoolId. */
export function SchoolAdminVehiclesPage() {
  return (
    <DashboardLayout>
      <SchoolAdminVehiclesContent />
    </DashboardLayout>
  );
}

function SchoolAdminVehiclesContent() {
  const { linkedSchoolId } = useAuth();
  return <VehiclesContent schoolId={linkedSchoolId ?? undefined} />;
}

function VehiclesContent({ schoolId }: VehiclesPageProps = {}) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Query drivers as the primary source (so vehicles without location still show
  // up as "Inactive"). Live status is LEFT-joined from driver_locations.
  const {
    data: vehicles = [],
    isLoading,
    error,
  } = useSimpleQuery<Vehicle[]>(
    () => getAllVehicles(schoolId != null ? { schoolId } : undefined),
    [schoolId],
    { refetchInterval: 30000 }
  );

  // Distinct vehicle types for the filter dropdown
  const vehicleTypes = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => v.vehicle_type && set.add(v.vehicle_type));
    return Array.from(set).sort();
  }, [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match =
          v.cab_number.toLowerCase().includes(s) ||
          v.driver_name.toLowerCase().includes(s) ||
          v.vehicle_type.toLowerCase().includes(s) ||
          (v.phone || "").toLowerCase().includes(s);
        if (!match) return false;
      }
      // Vehicle type
      if (typeFilter !== "all" && v.vehicle_type !== typeFilter) return false;
      // Status
      if (statusFilter === "active" && !v.is_live) return false;
      if (statusFilter === "inactive" && v.is_live) return false;
      return true;
    });
  }, [vehicles, searchTerm, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    const active = vehicles.filter((v) => v.is_live).length;
    return { total: vehicles.length, active, inactive: vehicles.length - active };
  }, [vehicles]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Truck className="h-7 w-7" />
          Vehicles
        </h1>
        <p className="text-muted-foreground">
          {schoolId != null
            ? "All vehicles serving your school. Status auto-refreshes every 30 seconds."
            : "All registered vehicles in the fleet. Status auto-refreshes every 30 seconds."}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-xs text-muted-foreground">Total Vehicles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.active}</div>
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-base flex-1">Vehicle Directory</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cab, driver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {vehicleTypes.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && vehicles.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Error: {error.message}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cab Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Assigned Driver</TableHead>
                  <TableHead>Driver Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.driver_id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        {v.cab_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {v.vehicle_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {v.cab_capacity || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{v.driver_name}</TableCell>
                    <TableCell className="text-sm">{v.phone || "—"}</TableCell>
                    <TableCell>
                      {v.is_live ? (
                        v.status === "on_trip" ? (
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
                      {v.last_seen_at ? formatRelative(v.last_seen_at) : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/drivers/${v.driver_id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No vehicles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
