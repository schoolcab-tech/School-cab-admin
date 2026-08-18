import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { supabase } from "@/integrations/supabase/client";
import {
  getDriverOperationsOverview,
  type DriverOperationRow,
} from "@/services/liveTrackingService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LiveStreamTile } from "./LiveStreamViewer";
import {
  Check,
  ChevronsUpDown,
  GraduationCap,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
  Video,
  VideoOff,
} from "lucide-react";

const MAX_AUTO_STREAMS = 6;

type SchoolOption = {
  id: number;
  name: string;
  livestreamEnabled: boolean;
  latitude: number | null;
  longitude: number | null;
};

export interface SchoolLiveMonitorViewProps {
  schoolId?: number;
  driverIds?: number[];
  detailPathPrefix: string;
  refetchInterval?: number;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 14 });
  }, [map, key]);
  return null;
}

function makeLiveIcon(onTrip: boolean) {
  const bg = onTrip ? "#2563eb" : "#16a34a";
  return new L.DivIcon({
    className: "leaflet-custom-marker",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function SchoolLiveMonitorView({
  schoolId: schoolIdProp,
  driverIds,
  detailPathPrefix,
  refetchInterval = 15000,
}: SchoolLiveMonitorViewProps) {
  const [pickedSchoolId, setPickedSchoolId] = useState<string>(
    schoolIdProp != null ? String(schoolIdProp) : ""
  );
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);

  const { data: schools = [], isLoading: schoolsLoading, error: schoolsError } = useSimpleQuery<SchoolOption[]>(async () => {
    const { data, error } = await supabase
      .from("schools")
      .select("school_id, name, latitude, longitude")
      .order("name");
    if (error) throw error;

    let livestreamBySchool = new Map<number, boolean>();
    const { data: livestreamRows, error: livestreamError } = await (supabase as any)
      .from("schools")
      .select("school_id, livestream_enabled");
    if (!livestreamError && livestreamRows) {
      livestreamBySchool = new Map(
        (livestreamRows as Array<{ school_id: number; livestream_enabled?: boolean }>).map(
          (s) => [Number(s.school_id), !!s.livestream_enabled]
        )
      );
    }

    return (data || []).map((s) => {
      const id = Number(s.school_id);
      return {
        id,
        name: s.name,
        livestreamEnabled: livestreamBySchool.get(id) ?? true,
        latitude: s.latitude != null ? Number(s.latitude) : null,
        longitude: s.longitude != null ? Number(s.longitude) : null,
      };
    });
  }, []);

  const effectiveSchoolId = schoolIdProp ?? (pickedSchoolId ? Number(pickedSchoolId) : undefined);
  const selectedSchool = schools.find((s) => s.id === effectiveSchoolId);
  const showSchoolPicker = schoolIdProp == null;

  const {
    data: rows = [],
    isLoading,
    error,
    refetch,
  } = useSimpleQuery<DriverOperationRow[]>(
    () =>
      getDriverOperationsOverview({
        schoolId: effectiveSchoolId,
        driverIds,
      }),
    [effectiveSchoolId, driverIds?.join(",")],
    { enabled: !!effectiveSchoolId, refetchInterval }
  );

  const liveDrivers = useMemo(() => {
    return rows
      .filter((r) => r.is_live || r.phase === "on_trip")
      .sort((a, b) => {
        const score = (r: DriverOperationRow) =>
          r.phase === "on_trip" ? 2 : r.is_live ? 1 : 0;
        return score(b) - score(a);
      });
  }, [rows]);

  const streamingDrivers = useMemo(() => {
    if (selectedSchool && !selectedSchool.livestreamEnabled) return [];
    return liveDrivers;
  }, [liveDrivers, selectedSchool]);

  const mapPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = liveDrivers
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => [d.latitude as number, d.longitude as number]);
    if (selectedSchool?.latitude != null && selectedSchool?.longitude != null) {
      pts.push([selectedSchool.latitude, selectedSchool.longitude]);
    }
    return pts;
  }, [liveDrivers, selectedSchool]);

  const mapCenter: [number, number] =
    selectedSchool?.latitude != null && selectedSchool?.longitude != null
      ? [selectedSchool.latitude, selectedSchool.longitude]
      : mapPoints[0] || [28.4595, 77.0266];

  const onTripCount = liveDrivers.filter((d) => d.phase === "on_trip").length;

  return (
    <div className="space-y-4">
      {showSchoolPicker && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-sm font-medium flex items-center gap-2 shrink-0">
                <GraduationCap className="h-4 w-4" />
                School to monitor
              </label>
              <Popover open={schoolPickerOpen} onOpenChange={setSchoolPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={schoolPickerOpen}
                    className="w-full sm:max-w-md justify-between font-normal"
                  >
                    <span className="truncate">
                      {schoolsLoading
                        ? "Loading schools..."
                        : selectedSchool
                          ? selectedSchool.name
                          : "Select a school"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search schools..." />
                    <CommandList>
                      <CommandEmpty>
                        {schoolsLoading
                          ? "Loading schools..."
                          : schoolsError
                            ? schoolsError.message
                            : "No school found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {schools.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.name} ${s.id}`}
                            onSelect={() => {
                              setPickedSchoolId(String(s.id));
                              setSchoolPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                effectiveSchoolId === s.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      )}

      {!effectiveSchoolId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-foreground">Select a school</p>
            <p className="text-sm mt-1">
              Choose a school to monitor all live drivers on one screen.
            </p>
          </CardContent>
        </Card>
      )}

      {effectiveSchoolId && isLoading && liveDrivers.length === 0 && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading live drivers…
        </div>
      )}

      {effectiveSchoolId && error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error.message}
          </CardContent>
        </Card>
      )}

      {effectiveSchoolId && !error && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedSchool?.name ?? "School"} — live monitor
              </h2>
              <p className="text-sm text-muted-foreground">
                All live and on-trip drivers for this school on one screen.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Live drivers</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{liveDrivers.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">On trip</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{onTripCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Camera feeds</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{streamingDrivers.length}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Live locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mapPoints.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground rounded-lg border border-dashed">
                  No live GPS positions for this school right now.
                </div>
              ) : (
                <div className="h-72 overflow-hidden rounded-lg">
                  <MapContainer
                    key={effectiveSchoolId}
                    center={mapCenter}
                    zoom={13}
                    className="h-full w-full"
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FitBounds points={mapPoints} />
                    {liveDrivers.map((d) =>
                      d.latitude != null && d.longitude != null ? (
                        <Marker
                          key={d.driver_id}
                          position={[d.latitude, d.longitude]}
                          icon={makeLiveIcon(d.phase === "on_trip")}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-medium">{d.driver_name}</p>
                              <p className="text-muted-foreground">{d.cab_number}</p>
                              <Link
                                to={`${detailPathPrefix}/${d.driver_id}`}
                                className="text-primary underline text-xs"
                              >
                                Open tracking
                              </Link>
                            </div>
                          </Popup>
                        </Marker>
                      ) : null
                    )}
                  </MapContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-500" />
                Live camera feeds
              </h3>
              {selectedSchool && !selectedSchool.livestreamEnabled && (
                <Badge variant="secondary">Streaming disabled for this school</Badge>
              )}
            </div>

            {liveDrivers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No live drivers for this school right now.
                </CardContent>
              </Card>
            ) : schoolsLoading && !selectedSchool ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Checking stream settings…
              </div>
            ) : selectedSchool && !selectedSchool.livestreamEnabled ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {liveDrivers.map((d) => (
                  <GpsOnlyTile
                    key={d.driver_id}
                    driver={d}
                    detailPathPrefix={detailPathPrefix}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {streamingDrivers.map((d, index) => (
                  <LiveStreamTile
                    key={d.driver_id}
                    driverId={d.driver_id}
                    schoolId={d.school_id ?? effectiveSchoolId}
                    driverName={d.driver_name}
                    cabNumber={d.cab_number}
                    tripType={d.trip_type}
                    autoConnect={index < MAX_AUTO_STREAMS}
                    connectDelayMs={index * 250}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function GpsOnlyTile({
  driver,
  detailPathPrefix,
}: {
  driver: DriverOperationRow;
  detailPathPrefix: string;
}) {
  return (
    <Card>
      <CardHeader className="py-2 px-3 space-y-0">
        <CardTitle className="text-sm truncate">{driver.driver_name}</CardTitle>
        <p className="text-xs text-muted-foreground">{driver.cab_number}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-md bg-muted/40 text-center">
          <VideoOff className="h-6 w-6 text-muted-foreground" />
          <Badge variant={driver.phase === "on_trip" ? "default" : "secondary"}>
            {driver.phase === "on_trip" ? "On trip" : "Live GPS"}
          </Badge>
          <p className="text-xs text-muted-foreground px-3">
            Camera streaming is off for this school.
          </p>
          <Button variant="outline" size="sm" className="h-7" asChild>
            <Link to={`${detailPathPrefix}/${driver.driver_id}`}>
              <Video className="h-3.5 w-3.5 mr-1" />
              Open driver
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
