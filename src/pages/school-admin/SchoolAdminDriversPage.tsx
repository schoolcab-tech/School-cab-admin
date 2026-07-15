import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
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
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  getLiveDriverLocations,
  type DriverLiveLocation,
} from "@/services/liveTrackingService";
import {
  Car,
  CheckCircle,
  Loader2,
  Phone,
  Search,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function SchoolAdminDriversPage() {
  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}

function Content() {
  const { linkedSchoolId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: drivers = [],
    isLoading,
    error,
  } = useSimpleQuery<DriverLiveLocation[]>(
    () =>
      linkedSchoolId
        ? getLiveDriverLocations({ schoolId: linkedSchoolId })
        : Promise.resolve([]),
    [linkedSchoolId],
    { enabled: !!linkedSchoolId, refetchInterval: 30000 }
  );

  const filtered = useMemo(() => {
    if (!searchTerm) return drivers;
    const s = searchTerm.toLowerCase();
    return drivers.filter(
      (d) =>
        d.driver_name.toLowerCase().includes(s) ||
        d.cab_number.toLowerCase().includes(s) ||
        d.phone?.toLowerCase().includes(s)
    );
  }, [drivers, searchTerm]);

  const summary = useMemo(() => {
    const live = drivers.filter((d) => d.is_live).length;
    return { total: drivers.length, live, inactive: drivers.length - live };
  }, [drivers]);

  if (!linkedSchoolId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          School not linked to your account. Contact the master admin.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Car className="h-7 w-7" />
          Drivers Serving Your School
        </h1>
        <p className="text-muted-foreground">
          All drivers who have opted to serve this school via the driver app. Status auto-refreshes every 30 seconds.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-xs text-muted-foreground">Total Drivers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.live}</div>
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
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Driver Directory</CardTitle>
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && drivers.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error: {error.message}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Vehicle Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.driver_id}>
                    <TableCell className="font-medium">{d.driver_name}</TableCell>
                    <TableCell>{d.cab_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {d.vehicle_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {d.phone ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {d.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.is_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {d.is_live ? (
                        d.status === "on_trip" ? (
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
                      {formatRelative(d.last_seen_at)}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No drivers found{searchTerm ? " matching your search" : ""}.
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
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
