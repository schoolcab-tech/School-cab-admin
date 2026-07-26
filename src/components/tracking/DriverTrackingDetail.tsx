import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  formatCoordinates,
  getDriverOperationById,
  orderStopsForRoute,
  type DriverOperationRow,
  type TripStop,
} from "@/services/liveTrackingService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Activity,
  ArrowLeft,
  Car,
  Check,
  Clock,
  Gauge,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Route,
  School,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { LiveStreamViewer } from "./LiveStreamViewer";
import {
  FitMapBounds,
  GpsBadge,
  makeDriverIcon,
  makeStopIcon,
  PhaseBadge,
  SchoolMapMarker,
} from "./trackingShared";

export interface DriverTrackingDetailProps {
  driverId: number;
  listPath: string;
  schoolId?: number;
  driverIds?: number[];
  schoolCenter?: { latitude: number; longitude: number; name: string } | null;
  refetchInterval?: number;
}

export function DriverTrackingDetail({
  driverId,
  listPath,
  schoolId,
  driverIds,
  schoolCenter,
  refetchInterval = 15000,
}: DriverTrackingDetailProps) {
  const {
    data: driver,
    isLoading,
    error,
    refetch,
  } = useSimpleQuery<DriverOperationRow | null>(
    () => getDriverOperationById(driverId, { schoolId, driverIds }),
    [driverId, schoolId, driverIds?.join(",")],
    { refetchInterval }
  );

  const orderedStops = useMemo(
    () => (driver ? orderStopsForRoute(driver.stops, driver.trip_type) : []),
    [driver]
  );

  const mapPoints = useMemo<[number, number][]>(() => {
    if (!driver) return [];
    const pts: [number, number][] = [];
    if (driver.latitude != null && driver.longitude != null) {
      pts.push([driver.latitude, driver.longitude]);
    }
    for (const stop of orderedStops) {
      pts.push([stop.latitude, stop.longitude]);
    }
    if (schoolCenter) {
      pts.push([schoolCenter.latitude, schoolCenter.longitude]);
    }
    return pts;
  }, [driver, orderedStops, schoolCenter]);

  const routeLine = useMemo<[number, number][]>(() => {
    const stopPts = orderedStops.map((s) => [s.latitude, s.longitude] as [number, number]);
    if (
      driver?.latitude != null &&
      driver?.longitude != null &&
      stopPts.length > 0
    ) {
      return [[driver.latitude, driver.longitude], ...stopPts];
    }
    return stopPts;
  }, [driver, orderedStops]);

  const completedLine = useMemo<[number, number][]>(() => {
    const done = orderedStops.filter((s) =>
      ["picked_up", "dropped", "completed"].includes(s.status)
    );
    const pts = done.map((s) => [s.latitude, s.longitude] as [number, number]);
    if (
      driver?.latitude != null &&
      driver?.longitude != null &&
      pts.length > 0
    ) {
      return [[driver.latitude, driver.longitude], ...pts];
    }
    return pts;
  }, [driver, orderedStops]);

  const mapCenter: [number, number] =
    mapPoints[0] ??
    (schoolCenter
      ? [schoolCenter.latitude, schoolCenter.longitude]
      : [28.4595, 77.0266]);

  const canShowMap = mapPoints.length > 0;

  if (isLoading && !driver) {
    return (
      <Card>
        <CardContent className="p-12 flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading driver tracking…</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !driver) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <p className="text-destructive">
            {error ? `Failed to load driver: ${error.message}` : "Driver not found."}
          </p>
          <Button variant="outline" asChild>
            <Link to={listPath}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to drivers
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link to={listPath}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              All drivers
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Car className="h-6 w-6" />
              {driver.driver_name}
            </h2>
            <p className="text-muted-foreground text-sm flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span>{driver.cab_number}</span>
              <span className="capitalize">{driver.vehicle_type}</span>
              {driver.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {driver.phone}
                </span>
              )}
              {driver.is_verified && (
                <Badge variant="outline" className="text-xs">
                  Verified
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PhaseBadge phase={driver.phase} />
          <GpsBadge isLive={driver.is_live} minutesSince={driver.minutes_since_last_seen} />
          {driver.livestream_enabled &&
            driver.school_id != null &&
            driver.phase === "on_trip" && (
              <LiveStreamViewer
                driverId={driver.driver_id}
                schoolId={driver.school_id}
                driverName={driver.driver_name}
                variant="dialog"
                showWhenOnTrip={false}
                isOnTrip
              />
            )}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Trip"
          value={driver.trip_type ? driver.trip_type.replace(/_/g, " ") : "No active trip"}
          sub={
            driver.trip_started_at
              ? `Started ${format(new Date(driver.trip_started_at), "h:mm a")}`
              : driver.completed_trips_today > 0
                ? `${driver.completed_trips_today} done today`
                : undefined
          }
        />
        <StatCard
          label="Pickups"
          value={`${driver.picked_up_count}/${driver.total_students || "—"}`}
          sub={`${driver.pending_pickups} pending`}
        />
        <StatCard
          label="Drops"
          value={`${driver.dropped_count}/${driver.total_students || "—"}`}
          sub={`${driver.pending_drops} pending`}
        />
        <StatCard
          label="Next ETA"
          value={driver.next_eta_minutes != null ? `${driver.next_eta_minutes} min` : "—"}
          sub={
            driver.eta_distance_km != null
              ? `${driver.eta_distance_km.toFixed(1)} km away`
              : driver.next_student_name || undefined
          }
        />
        <StatCard
          label="Speed"
          value={driver.speed != null ? `${Math.round(driver.speed)} km/h` : "—"}
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
      </div>

      {driver.school_name && (
        <Card>
          <CardContent className="py-3 flex items-center gap-2 text-sm">
            <School className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">School run:</span>
            <span className="font-medium">{driver.school_name}</span>
            {driver.trip_progress && (
              <span className="text-muted-foreground ml-2">• {driver.trip_progress}</span>
            )}
          </CardContent>
        </Card>
      )}

      {driver.livestream_enabled &&
        driver.school_id != null &&
        driver.phase === "on_trip" && (
          <LiveStreamViewer
            driverId={driver.driver_id}
            schoolId={driver.school_id}
            driverName={driver.driver_name}
            variant="inline"
            showWhenOnTrip={false}
            isOnTrip
          />
        )}

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Live Route Map
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Blue line = full route • Green = completed stops • Orange/Purple = pending pickups/drops
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border h-[420px]">
              {canShowMap ? (
                <MapContainer
                  key={`driver-map-${driver.driver_id}-${orderedStops.length}`}
                  center={mapCenter}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitMapBounds points={mapPoints} />
                  {routeLine.length > 1 && (
                    <Polyline
                      positions={routeLine}
                      pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.75 }}
                    />
                  )}
                  {completedLine.length > 1 && (
                    <Polyline
                      positions={completedLine}
                      pathOptions={{ color: "#16a34a", weight: 5, opacity: 0.9 }}
                    />
                  )}
                  {orderedStops.map((stop) => (
                    <Marker
                      key={`${stop.trip_student_id}-${stop.stop_type}`}
                      position={[stop.latitude, stop.longitude]}
                      icon={makeStopIcon(stop)}
                    >
                      <Popup>
                        <strong>{stop.student_name}</strong>
                        <br />
                        {stop.stop_type} #{stop.order} — {stop.status}
                      </Popup>
                    </Marker>
                  ))}
                  {driver.latitude != null && driver.longitude != null && (
                    <Marker
                      position={[driver.latitude, driver.longitude]}
                      icon={makeDriverIcon(driver.phase, true)}
                    >
                      <Popup>
                        {driver.driver_name} (live)
                        <br />
                        {formatCoordinates(driver.latitude, driver.longitude)}
                      </Popup>
                    </Marker>
                  )}
                  {schoolCenter && (
                    <SchoolMapMarker
                      latitude={schoolCenter.latitude}
                      longitude={schoolCenter.longitude}
                      name={schoolCenter.name}
                    />
                  )}
                </MapContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                  <MapPin className="h-8 w-8 opacity-40" />
                  <p>No map data for this driver yet.</p>
                  <p className="text-xs">
                    Stops appear once students have pickup/drop coordinates, or when the driver app
                    sends GPS to driver_locations.
                  </p>
                </div>
              )}
            </div>
            {orderedStops.length === 0 && driver.active_trip && (
              <p className="text-xs text-amber-700 mt-2">
                Active trip found but no stop coordinates — check that assigned students have pickup
                locations set.
              </p>
            )}
          </CardContent>
        </Card>

        <ActivityTimeline driver={driver} />
      </div>

      <StopsTable stops={driver.stops} />
    </div>
  );
}

function ActivityTimeline({ driver }: { driver: DriverOperationRow }) {
  const events = useMemo(() => {
    const items: Array<{
      id: string;
      time: string | null;
      title: string;
      subtitle: string;
      done: boolean;
      kind: "trip" | "pickup" | "drop" | "next";
    }> = [];

    if (driver.active_trip?.actual_start_time) {
      items.push({
        id: "trip-start",
        time: driver.active_trip.actual_start_time,
        title: "Trip started",
        subtitle: `${driver.active_trip.trip_type} • ${driver.active_trip.school_name || "School run"}`,
        done: true,
        kind: "trip",
      });
    }

    const sortedStops = [...driver.stops].sort((a, b) => {
      if (a.stop_type !== b.stop_type) return a.stop_type === "pickup" ? -1 : 1;
      return a.order - b.order;
    });

    for (const stop of sortedStops) {
      const isDone = ["picked_up", "dropped", "completed"].includes(stop.status);
      items.push({
        id: `${stop.trip_student_id}-${stop.stop_type}`,
        time: stop.completed_at,
        title: `${stop.stop_type === "pickup" ? "Pickup" : "Drop"}: ${stop.student_name}`,
        subtitle: `#${stop.order} • ${stop.status.replace(/_/g, " ")}`,
        done: isDone,
        kind: stop.stop_type,
      });
    }

    if (driver.next_student_name) {
      items.push({
        id: "next",
        time: null,
        title: `Next: ${driver.next_student_name}`,
        subtitle: driver.next_stop_type
          ? `${driver.next_stop_type}${driver.next_eta_minutes != null ? ` • ETA ${driver.next_eta_minutes} min` : ""}`
          : driver.next_eta_minutes != null
            ? `ETA ${driver.next_eta_minutes} min`
            : "Upcoming stop",
        done: false,
        kind: "next",
      });
    }

    return items;
  }, [driver]);

  return (
    <Card className="xl:col-span-2 h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity Timeline
        </CardTitle>
        {driver.last_pickup_student && (
          <p className="text-xs text-muted-foreground">
            Last pickup: <strong>{driver.last_pickup_student}</strong>
            {driver.last_pickup_at && ` at ${format(new Date(driver.last_pickup_at), "h:mm a")}`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trip activity recorded for this driver today.</p>
        ) : (
          <div className="relative space-y-0 pl-4 border-l-2 border-muted ml-2 max-h-[420px] overflow-y-auto">
            {events.map((ev) => (
              <div key={ev.id} className="relative pb-6 last:pb-0">
                <div
                  className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                    ev.done
                      ? "bg-green-600"
                      : ev.kind === "next"
                        ? "bg-blue-500 animate-pulse"
                        : "bg-muted-foreground/40"
                  }`}
                />
                <div className="ml-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{ev.title}</div>
                    {ev.done && <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{ev.subtitle}</div>
                  {ev.time && (
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(ev.time), "h:mm a")} (
                      {formatDistanceToNow(new Date(ev.time), { addSuffix: true })})
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StopsTable({ stops }: { stops: TripStop[] }) {
  const sorted = [...stops].sort((a, b) => {
    if (a.stop_type !== b.stop_type) return a.stop_type === "pickup" ? -1 : 1;
    return a.order - b.order;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />
          All Stops ({sorted.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Coordinates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((stop) => (
                <TableRow key={`${stop.trip_student_id}-${stop.stop_type}`}>
                  <TableCell>{stop.order}</TableCell>
                  <TableCell className="capitalize">{stop.stop_type}</TableCell>
                  <TableCell className="font-medium">{stop.student_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {stop.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {stop.completed_at ? format(new Date(stop.completed_at), "h:mm a") : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {formatCoordinates(stop.latitude, stop.longitude, 4)}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No stops on the active trip.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-3 px-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          {icon}
          {label}
        </div>
        <div className="text-sm font-semibold mt-0.5 capitalize">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}
