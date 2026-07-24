import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  getDriverOperationsOverview,
  type DriverOperationRow,
  type DriverTripPhase,
} from "@/services/liveTrackingService";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { formatRelative, GpsBadge, PhaseBadge } from "./trackingShared";

type StatusFilter = "all" | DriverTripPhase;
type TripTypeFilter = "all" | "pickup" | "drop" | "no_trip";
type GpsFilter = "all" | "live" | "offline";
type PendingFilter = "all" | "has_next" | "no_pending";

export interface DriverOperationsViewProps {
  schoolId?: number;
  detailPathPrefix: string;
  refetchInterval?: number;
}

export function DriverOperationsView({
  schoolId,
  detailPathPrefix,
  refetchInterval = 15000,
}: DriverOperationsViewProps) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tripTypeFilter, setTripTypeFilter] = useState<TripTypeFilter>("all");
  const [gpsFilter, setGpsFilter] = useState<GpsFilter>("all");
  const [pendingFilter, setPendingFilter] = useState<PendingFilter>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: rows = [],
    isLoading,
    error,
    refetch,
  } = useSimpleQuery<DriverOperationRow[]>(
    () => getDriverOperationsOverview({ schoolId }),
    [schoolId],
    { refetchInterval }
  );

  const schoolOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) {
      if (r.school_id != null && r.school_name) {
        map.set(r.school_id, r.school_name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;

    if (statusFilter !== "all") {
      list = list.filter((r) => r.phase === statusFilter);
    }

    if (tripTypeFilter === "no_trip") {
      list = list.filter((r) => !r.trip_type);
    } else if (tripTypeFilter === "pickup") {
      list = list.filter((r) => (r.trip_type || "").toLowerCase().includes("pickup"));
    } else if (tripTypeFilter === "drop") {
      list = list.filter((r) => (r.trip_type || "").toLowerCase().includes("drop"));
    }

    if (gpsFilter === "live") {
      list = list.filter((r) => r.is_live);
    } else if (gpsFilter === "offline") {
      list = list.filter((r) => !r.is_live);
    }

    if (pendingFilter === "has_next") {
      list = list.filter((r) => r.next_student_name != null);
    } else if (pendingFilter === "no_pending") {
      list = list.filter((r) => r.next_student_name == null && r.active_trip != null);
    }

    if (schoolFilter !== "all") {
      const sid = Number(schoolFilter);
      list = list.filter((r) => r.school_id === sid);
    }

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.driver_name.toLowerCase().includes(s) ||
          r.cab_number.toLowerCase().includes(s) ||
          r.phone?.toLowerCase().includes(s) ||
          r.school_name?.toLowerCase().includes(s) ||
          r.vehicle_type.toLowerCase().includes(s) ||
          r.next_student_name?.toLowerCase().includes(s) ||
          r.last_pickup_student?.toLowerCase().includes(s)
      );
    }

    return list;
  }, [
    rows,
    statusFilter,
    tripTypeFilter,
    gpsFilter,
    pendingFilter,
    schoolFilter,
    searchTerm,
  ]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      on_trip: rows.filter((r) => r.phase === "on_trip").length,
      online: rows.filter((r) => r.phase === "online").length,
      inactive: rows.filter((r) => r.phase === "inactive").length,
      completed_today: rows.filter((r) => r.phase === "completed_today").length,
      live_gps: rows.filter((r) => r.is_live).length,
      has_next: rows.filter((r) => r.next_student_name != null).length,
    }),
    [rows]
  );

  const openDriver = (driverId: number) => {
    navigate(`${detailPathPrefix}/${driverId}`);
  };

  if (isLoading && rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading driver operations…</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          Failed to load drivers: {error.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <SummaryCard label="All Drivers" value={summary.total} />
        <SummaryCard label="On Trip" value={summary.on_trip} accent="text-blue-600" />
        <SummaryCard label="Active (Idle)" value={summary.online} accent="text-green-600" />
        <SummaryCard label="Live GPS" value={summary.live_gps} accent="text-emerald-600" />
        <SummaryCard label="Has Next Stop" value={summary.has_next} accent="text-orange-600" />
        <SummaryCard label="Completed Today" value={summary.completed_today} accent="text-purple-600" />
        <SummaryCard label="Inactive" value={summary.inactive} accent="text-muted-foreground" />
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All statuses</TabsTrigger>
          <TabsTrigger value="on_trip">On Trip</TabsTrigger>
          <TabsTrigger value="online">Active</TabsTrigger>
          <TabsTrigger value="completed_today">Completed</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <FilterSelect
          label="Trip type"
          value={tripTypeFilter}
          onChange={(v) => setTripTypeFilter(v as TripTypeFilter)}
          options={[
            { value: "all", label: "All trips" },
            { value: "pickup", label: "Pickup run" },
            { value: "drop", label: "Drop run" },
            { value: "no_trip", label: "No active trip" },
          ]}
        />
        <FilterSelect
          label="GPS"
          value={gpsFilter}
          onChange={(v) => setGpsFilter(v as GpsFilter)}
          options={[
            { value: "all", label: "All GPS" },
            { value: "live", label: "Live only" },
            { value: "offline", label: "Offline only" },
          ]}
        />
        <FilterSelect
          label="Next stop"
          value={pendingFilter}
          onChange={(v) => setPendingFilter(v as PendingFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "has_next", label: "Has next stop" },
            { value: "no_pending", label: "Trip, no pending" },
          ]}
        />
        {schoolId == null && schoolOptions.length > 0 && (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">School</label>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schools</SelectItem>
                {schoolOptions.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Search</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Driver, cab, school, student…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            Drivers ({filtered.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Click a row to open the full tracking page with map, timeline, and all stops. Refreshes
            every {Math.round(refetchInterval / 1000)}s.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[140px]">Driver</TableHead>
                  {!schoolId && <TableHead>School</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>GPS</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Pickups</TableHead>
                  <TableHead>Drops</TableHead>
                  <TableHead>Last Pickup</TableHead>
                  <TableHead>Next Stop</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Done Today</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.driver_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDriver(row.driver_id)}
                  >
                    <TableCell>
                      <div className="font-medium">{row.driver_name}</div>
                      <div className="text-xs text-muted-foreground">{row.cab_number}</div>
                      {row.phone && (
                        <div className="text-[10px] text-muted-foreground">{row.phone}</div>
                      )}
                    </TableCell>
                    {!schoolId && (
                      <TableCell className="text-xs max-w-[120px]">
                        {row.school_name ? (
                          <span className="truncate block">{row.school_name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <PhaseBadge phase={row.phase} />
                        {row.is_verified && (
                          <Badge variant="outline" className="text-[10px] w-fit">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <GpsBadge isLive={row.is_live} minutesSince={row.minutes_since_last_seen} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="capitalize">{row.vehicle_type || "—"}</div>
                      {row.cab_capacity > 0 && (
                        <div className="text-muted-foreground">{row.cab_capacity} seats</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.trip_type ? (
                        <>
                          <Badge variant="outline" className="capitalize text-[10px] mb-1">
                            {row.trip_type.replace(/_/g, " ")}
                          </Badge>
                          {row.trip_started_at && (
                            <div className="text-muted-foreground">
                              {format(new Date(row.trip_started_at), "h:mm a")}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">No trip</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">
                        {row.active_trip ? `${row.picked_up_count}/${row.total_students}` : "—"}
                      </div>
                      {row.pending_pickups > 0 && (
                        <div className="text-orange-600">{row.pending_pickups} pending</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">
                        {row.active_trip ? `${row.dropped_count}/${row.total_students}` : "—"}
                      </div>
                      {row.pending_drops > 0 && (
                        <div className="text-purple-600">{row.pending_drops} pending</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[130px]">
                      {row.last_pickup_student ? (
                        <>
                          <div className="font-medium truncate">{row.last_pickup_student}</div>
                          {row.last_pickup_at && (
                            <div className="text-muted-foreground">
                              {format(new Date(row.last_pickup_at), "h:mm a")}
                            </div>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[130px]">
                      {row.next_student_name ? (
                        <>
                          <div className="font-medium truncate">{row.next_student_name}</div>
                          {row.next_stop_type && (
                            <div className="text-muted-foreground capitalize">{row.next_stop_type}</div>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.next_eta_minutes != null ? (
                        <>
                          <div className="font-semibold text-blue-700">{row.next_eta_minutes} min</div>
                          {row.eta_distance_km != null && (
                            <div className="text-muted-foreground">
                              {row.eta_distance_km.toFixed(1)} km
                            </div>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {row.speed != null ? `${Math.round(row.speed)} km/h` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {row.completed_trips_today > 0 ? row.completed_trips_today : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.last_seen_at ? formatRelative(row.last_seen_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={schoolId ? 13 : 14}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No drivers match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3 px-2 text-center">
        <div className={`text-xl font-bold ${accent ?? ""}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
