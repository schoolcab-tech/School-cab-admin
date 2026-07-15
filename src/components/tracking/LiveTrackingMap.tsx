import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  formatCoordinates,
  getActiveTripsForTracking,
  getLiveDriverLocations,
  getTripStopsForSessions,
  indexTripsByDriver,
  type ActiveTripForTracking,
  type DriverLiveLocation,
  type TripStop,
} from "@/services/liveTrackingService";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Battery,
  BatteryLow,
  Car,
  Check,
  Clock,
  Copy,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ── Marker icons ─────────────────────────────────────────────────── */

const COLORS = {
  online: "#16a34a",
  on_trip: "#2563eb",
  inactive: "#6b7280",
  pickup: "#ea580c",
  drop: "#9333ea",
  pickup_done: "#16a34a",
  drop_done: "#16a34a",
  selected: "#0f172a",
} as const;

function makeDriverIcon(status: "online" | "on_trip" | "inactive", selected = false) {
  const bg = selected ? COLORS.selected : COLORS[status];
  const ring = selected ? "3px solid #fbbf24" : "2px solid white";
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;">
      <div style="display:flex;align-items:center;justify-content:center;width:${selected ? 36 : 30}px;height:${selected ? 36 : 30}px;border-radius:50%;background:${bg};border:${ring};box-shadow:0 2px 6px rgba(0,0,0,.4);">
        <svg width="${selected ? 18 : 16}" height="${selected ? 18 : 16}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
      </div>
    </div>`,
    iconSize: [selected ? 36 : 30, selected ? 36 : 30],
    iconAnchor: [selected ? 18 : 15, selected ? 18 : 15],
    popupAnchor: [0, selected ? -18 : -16],
  });
}

function makeStopIcon(stop: TripStop) {
  const isDone =
    stop.status === "picked_up" ||
    stop.status === "dropped" ||
    stop.status === "completed";
  const bg =
    stop.stop_type === "pickup"
      ? isDone
        ? COLORS.pickup_done
        : COLORS.pickup
      : isDone
      ? COLORS.drop_done
      : COLORS.drop;
  const label = stop.stop_type === "pickup" ? "P" : "D";
  return new L.DivIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.35);font-size:10px;font-weight:700;color:white;">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

const schoolIcon = new L.DivIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

/* ── Map helpers ──────────────────────────────────────────────────── */

function FitBounds({ points, trigger }: { points: [number, number][]; trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, trigger]);
  return null;
}

function PanToDriver({ driver }: { driver: DriverLiveLocation | null }) {
  const map = useMap();
  useEffect(() => {
    if (driver) {
      map.flyTo([driver.latitude, driver.longitude], Math.max(map.getZoom(), 14), {
        duration: 0.6,
      });
    }
  }, [map, driver?.driver_id, driver?.latitude, driver?.longitude]);
  return null;
}

/* ── Component ────────────────────────────────────────────────────── */

export interface LiveTrackingMapProps {
  schoolId?: number;
  schoolCenter?: { latitude: number; longitude: number; name: string } | null;
  refetchInterval?: number;
}

const driverDisplayStatus = (d: DriverLiveLocation): "online" | "on_trip" | "inactive" => {
  if (!d.is_live) return "inactive";
  if (d.status === "on_trip") return "on_trip";
  return "online";
};

export function LiveTrackingMap({
  schoolId,
  schoolCenter,
  refetchInterval = 15000,
}: LiveTrackingMapProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [showAllStops, setShowAllStops] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  const {
    data: drivers = [],
    isLoading: driversLoading,
    error: driversError,
    refetch: refetchDrivers,
  } = useSimpleQuery<DriverLiveLocation[]>(
    () => getLiveDriverLocations({ schoolId }),
    [schoolId],
    { refetchInterval }
  );

  const {
    data: activeTrips = [],
    isLoading: tripsLoading,
    refetch: refetchTrips,
  } = useSimpleQuery<ActiveTripForTracking[]>(
    () => getActiveTripsForTracking({ schoolId }),
    [schoolId],
    { refetchInterval }
  );

  const tripsByDriver = useMemo(() => indexTripsByDriver(activeTrips), [activeTrips]);

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.driver_id === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );

  const selectedTrip = selectedDriverId != null ? tripsByDriver.get(selectedDriverId) : undefined;

  const stopSessionIds = useMemo(() => {
    if (showAllStops) return activeTrips.map((t) => t.trip_session_id);
    if (selectedTrip) return [selectedTrip.trip_session_id];
    return [];
  }, [showAllStops, activeTrips, selectedTrip]);

  const {
    data: tripStops = [],
    isLoading: stopsLoading,
    refetch: refetchStops,
  } = useSimpleQuery<TripStop[]>(
    () => getTripStopsForSessions(stopSessionIds),
    [stopSessionIds.join(",")],
    { enabled: stopSessionIds.length > 0, refetchInterval }
  );

  const visibleDrivers = useMemo(
    () => (hideInactive ? drivers.filter((d) => d.is_live) : drivers),
    [drivers, hideInactive]
  );

  const visibleStops = useMemo(() => {
    if (showAllStops) return tripStops;
    if (selectedDriverId != null) {
      return tripStops.filter((s) => s.driver_id === selectedDriverId);
    }
    return [];
  }, [tripStops, showAllStops, selectedDriverId]);

  const summary = useMemo(() => {
    const live = drivers.filter((d) => d.is_live).length;
    const onTrip = drivers.filter((d) => d.is_live && d.status === "on_trip").length;
    const online = drivers.filter((d) => d.is_live && d.status === "online").length;
    const inactive = drivers.length - live;
    return { live, onTrip, online, inactive, total: drivers.length, activeTrips: activeTrips.length };
  }, [drivers, activeTrips]);

  const fitPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = visibleDrivers.map((d) => [d.latitude, d.longitude]);
    if (schoolCenter) pts.push([schoolCenter.latitude, schoolCenter.longitude]);
    return pts;
  }, [visibleDrivers, schoolCenter]);

  const center: [number, number] =
    schoolCenter
      ? [schoolCenter.latitude, schoolCenter.longitude]
      : visibleDrivers[0]
      ? [visibleDrivers[0].latitude, visibleDrivers[0].longitude]
      : [28.4595, 77.0266];

  const handleRefresh = () => {
    refetchDrivers();
    refetchTrips();
    refetchStops();
  };

  const handleSelectDriver = (driverId: number) => {
    setSelectedDriverId((prev) => (prev === driverId ? null : driverId));
  };

  const isLoading = driversLoading && drivers.length === 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading driver locations...</p>
        </CardContent>
      </Card>
    );
  }

  if (driversError) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          Failed to load driver locations: {driversError.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Live" value={summary.live} accent="text-green-600" />
        <SummaryCard label="On Trip" value={summary.onTrip} accent="text-blue-600" />
        <SummaryCard label="Inactive" value={summary.inactive} accent="text-muted-foreground" />
        <SummaryCard label="Active Trips" value={summary.activeTrips} accent="text-orange-600" />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Switch id="hide-inactive" checked={hideInactive} onCheckedChange={setHideInactive} />
          <Label htmlFor="hide-inactive" className="text-sm cursor-pointer">
            Hide inactive
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-all-stops" checked={showAllStops} onCheckedChange={setShowAllStops} />
          <Label htmlFor="show-all-stops" className="text-sm cursor-pointer">
            Show stops for all on-trip drivers
          </Label>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => setFitTrigger((n) => n + 1)}
        >
          Fit all drivers
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Live Vehicle Locations
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-refreshes every {Math.round(refetchInterval / 1000)}s. Click a driver to trace
              pickups and live coordinates.
            </p>
          </CardHeader>
          <CardContent>
            {visibleDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
                <Car className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No drivers reporting location yet</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Drivers appear here once the driver app uploads GPS to{" "}
                  <code className="text-xs">driver_locations</code>.
                  {hideInactive && drivers.length > 0
                    ? " Try turning off “Hide inactive”."
                    : null}
                </p>
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden border" style={{ height: 520 }}>
                <MapContainer
                  center={center}
                  zoom={12}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBounds points={fitPoints} trigger={fitTrigger} />
                  <PanToDriver driver={selectedDriver} />

                  {schoolCenter && (
                    <Marker
                      position={[schoolCenter.latitude, schoolCenter.longitude]}
                      icon={schoolIcon}
                    >
                      <Popup>
                        <strong>{schoolCenter.name}</strong>
                        <br />
                        <span className="text-xs">School</span>
                      </Popup>
                    </Marker>
                  )}

                  {visibleStops.map((stop) => (
                    <Marker
                      key={`${stop.trip_student_id}-${stop.stop_type}`}
                      position={[stop.latitude, stop.longitude]}
                      icon={makeStopIcon(stop)}
                    >
                      <Popup>
                        <StopPopup stop={stop} />
                      </Popup>
                    </Marker>
                  ))}

                  {visibleDrivers.map((d) => {
                    const status = driverDisplayStatus(d);
                    const isSelected = d.driver_id === selectedDriverId;
                    return (
                      <Marker
                        key={d.driver_id}
                        position={[d.latitude, d.longitude]}
                        icon={makeDriverIcon(status, isSelected)}
                        eventHandlers={{
                          click: () => handleSelectDriver(d.driver_id),
                        }}
                      >
                        <Popup>
                          <DriverPopup
                            driver={d}
                            status={status}
                            trip={tripsByDriver.get(d.driver_id)}
                            onSelect={() => handleSelectDriver(d.driver_id)}
                          />
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <DriverDetailPanel
          driver={selectedDriver}
          trip={selectedTrip}
          stops={visibleStops.filter((s) => s.driver_id === selectedDriverId)}
          stopsLoading={stopsLoading && selectedDriverId != null}
          onClose={() => setSelectedDriverId(null)}
        />
      </div>

      {visibleDrivers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vehicles ({visibleDrivers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {visibleDrivers.map((d) => {
                const status = driverDisplayStatus(d);
                const isSelected = d.driver_id === selectedDriverId;
                const trip = tripsByDriver.get(d.driver_id);
                return (
                  <button
                    key={d.driver_id}
                    type="button"
                    onClick={() => handleSelectDriver(d.driver_id)}
                    className={`flex items-start justify-between border rounded-md p-3 text-left transition-colors hover:bg-muted/50 ${
                      isSelected ? "border-primary ring-1 ring-primary/30 bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{d.driver_name}</div>
                        <div className="text-xs text-muted-foreground">{d.cab_number}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-1 truncate">
                          {formatCoordinates(d.latitude, d.longitude)}
                        </div>
                        {trip && (
                          <div className="text-[10px] text-blue-600 mt-0.5 flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            {trip.trip_type} • {trip.picked_up_count}/{trip.total_students} picked
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1 shrink-0 ml-2">
                      <Badge
                        variant="outline"
                        style={{ color: COLORS[status], borderColor: COLORS[status] }}
                      >
                        {status}
                      </Badge>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-end">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(d.last_seen_at)}
                        </span>
                        {d.battery_level != null && (
                          <span className="inline-flex items-center gap-1">
                            {d.battery_level < 20 ? (
                              <BatteryLow className="h-3 w-3 text-red-500" />
                            ) : (
                              <Battery className="h-3 w-3" />
                            )}
                            {d.battery_level}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(tripsLoading || driversLoading) && drivers.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">Updating locations…</p>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function DriverDetailPanel({
  driver,
  trip,
  stops,
  stopsLoading,
  onClose,
}: {
  driver: DriverLiveLocation | null;
  trip: ActiveTripForTracking | undefined;
  stops: TripStop[];
  stopsLoading: boolean;
  onClose: () => void;
}) {
  if (!driver) {
    return (
      <Card className="h-fit">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Navigation className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Select a driver on the map or list to view live coordinates and pickup stops.</p>
        </CardContent>
      </Card>
    );
  }

  const status = driverDisplayStatus(driver);
  const coords = formatCoordinates(driver.latitude, driver.longitude);

  return (
    <Card className="h-fit lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{driver.driver_name}</CardTitle>
            <p className="text-xs text-muted-foreground">{driver.cab_number} • {driver.vehicle_type}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Badge
          variant="outline"
          className="w-fit"
          style={{ color: COLORS[status], borderColor: COLORS[status] }}
        >
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live coordinates</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono">{coords}</code>
            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(coords)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <DetailItem label="Latitude" value={driver.latitude.toFixed(6)} />
            <DetailItem label="Longitude" value={driver.longitude.toFixed(6)} />
            <DetailItem label="Last seen" value={formatRelativeTime(driver.last_seen_at)} />
            {driver.speed != null && <DetailItem label="Speed" value={`${driver.speed.toFixed(1)} km/h`} />}
            {driver.heading != null && <DetailItem label="Heading" value={`${Math.round(driver.heading)}°`} />}
            {driver.battery_level != null && <DetailItem label="Battery" value={`${driver.battery_level}%`} />}
            {driver.eta_minutes != null && (
              <DetailItem label="Next ETA" value={`${driver.eta_minutes} min`} />
            )}
            {driver.eta_distance_km != null && (
              <DetailItem label="Distance" value={`${driver.eta_distance_km.toFixed(1)} km`} />
            )}
          </div>
        </div>

        {trip ? (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active trip</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{trip.trip_type}</span>
              </div>
              {trip.school_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">School</span>
                  <span className="font-medium">{trip.school_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {trip.picked_up_count}/{trip.total_students} picked • {trip.dropped_count} dropped
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t pt-4 text-xs text-muted-foreground">No active trip for this driver.</div>
        )}

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Stops {stops.length > 0 ? `(${stops.length})` : ""}
          </p>
          {stopsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading stops…
            </div>
          ) : stops.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pickup/drop stops with coordinates.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stops.map((stop) => (
                <StopRow key={`${stop.trip_student_id}-${stop.stop_type}`} stop={stop} />
              ))}
            </div>
          )}
        </div>

        {driver.phone && (
          <div className="border-t pt-4 text-xs">
            <span className="text-muted-foreground">Phone: </span>
            <span className="font-medium">{driver.phone}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StopRow({ stop }: { stop: TripStop }) {
  const isDone =
    stop.status === "picked_up" || stop.status === "dropped" || stop.status === "completed";
  return (
    <div className="flex items-start gap-2 rounded border p-2 text-xs">
      <div
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{
          background:
            stop.stop_type === "pickup"
              ? isDone
                ? COLORS.pickup_done
                : COLORS.pickup
              : isDone
              ? COLORS.drop_done
              : COLORS.drop,
        }}
      >
        {stop.stop_type === "pickup" ? "P" : "D"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{stop.student_name}</div>
        <div className="text-muted-foreground capitalize">
          {stop.stop_type} #{stop.order} • {stop.status.replace(/_/g, " ")}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
          {formatCoordinates(stop.latitude, stop.longitude, 5)}
        </div>
      </div>
      {isDone && <Check className="h-3 w-3 text-green-600 shrink-0 mt-1" />}
    </div>
  );
}

function DriverPopup({
  driver,
  status,
  trip,
  onSelect,
}: {
  driver: DriverLiveLocation;
  status: "online" | "on_trip" | "inactive";
  trip: ActiveTripForTracking | undefined;
  onSelect: () => void;
}) {
  return (
    <div style={{ fontSize: 12, minWidth: 180 }}>
      <div style={{ fontWeight: 600 }}>{driver.driver_name}</div>
      <div style={{ color: "#6b7280" }}>{driver.cab_number} • {driver.vehicle_type}</div>
      <div style={{ marginTop: 4 }}>
        Status: <strong style={{ color: COLORS[status] }}>{status}</strong>
      </div>
      <div style={{ fontFamily: "monospace", marginTop: 4 }}>
        {formatCoordinates(driver.latitude, driver.longitude)}
      </div>
      <div>Last seen: {formatRelativeTime(driver.last_seen_at)}</div>
      {driver.speed != null && <div>Speed: {driver.speed.toFixed(1)} km/h</div>}
      {driver.battery_level != null && <div>Battery: {driver.battery_level}%</div>}
      {trip && (
        <div style={{ marginTop: 4, color: "#2563eb" }}>
          {trip.trip_type}: {trip.picked_up_count}/{trip.total_students} picked
        </div>
      )}
      <button
        type="button"
        onClick={onSelect}
        style={{ marginTop: 6, fontSize: 11, color: "#2563eb", textDecoration: "underline" }}
      >
        View details
      </button>
    </div>
  );
}

function StopPopup({ stop }: { stop: TripStop }) {
  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 600 }}>{stop.student_name}</div>
      <div style={{ textTransform: "capitalize" }}>
        {stop.stop_type} #{stop.order}
      </div>
      <div>Status: {stop.status.replace(/_/g, " ")}</div>
      <div style={{ fontFamily: "monospace", marginTop: 4 }}>
        {formatCoordinates(stop.latitude, stop.longitude, 5)}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
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
      <CardContent className="py-4 px-3 text-center">
        <div className={`text-2xl font-bold ${accent ?? ""}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Coordinates copied"),
    () => toast.error("Failed to copy")
  );
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
