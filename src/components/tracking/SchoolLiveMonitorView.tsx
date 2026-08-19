import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { supabase } from "@/integrations/supabase/client";
import {
  getActiveTripsForTracking,
  getLiveDriverLocations,
  indexTripsByDriver,
  isGpsLive,
  type DriverLiveLocation,
} from "@/services/liveTrackingService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { LiveStreamTile } from "./LiveStreamViewer";
import {
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

type MonitorDriver = DriverLiveLocation & {
  trip_type: string | null;
};

type SchoolDriverGroup = {
  school: SchoolOption;
  drivers: MonitorDriver[];
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

function sortLiveDrivers(drivers: MonitorDriver[]) {
  return [...drivers].sort((a, b) => {
    const score = (r: MonitorDriver) => (r.status === "on_trip" ? 2 : 1);
    return score(b) - score(a);
  });
}

export function SchoolLiveMonitorView({
  schoolId: schoolIdProp,
  driverIds,
  detailPathPrefix,
  refetchInterval = 15000,
}: SchoolLiveMonitorViewProps) {
  const [pickedSchoolIds, setPickedSchoolIds] = useState<string[]>(
    schoolIdProp != null ? [String(schoolIdProp)] : []
  );

  const { data: schools = [], isLoading: schoolsLoading, error: schoolsError } =
    useSimpleQuery<SchoolOption[]>(async () => {
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
          (
            livestreamRows as Array<{ school_id: number; livestream_enabled?: boolean }>
          ).map((s) => [Number(s.school_id), !!s.livestream_enabled])
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

  const selectedIds = useMemo(
    () =>
      schoolIdProp != null
        ? [schoolIdProp]
        : pickedSchoolIds.map((id) => Number(id)).filter((id) => !isNaN(id)),
    [schoolIdProp, pickedSchoolIds]
  );
  const selectedSchools = useMemo(
    () => schools.filter((s) => selectedIds.includes(s.id)),
    [schools, selectedIds]
  );
  const showSchoolPicker = schoolIdProp == null;
  const hasSelection = selectedIds.length > 0;

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useSimpleQuery<SchoolDriverGroup[]>(
    async () => {
      const schoolMap = new Map(schools.map((s) => [s.id, s]));
      return Promise.all(
        selectedIds.map(async (schoolId) => {
          const school = schoolMap.get(schoolId) ?? {
            id: schoolId,
            name: `School ${schoolId}`,
            livestreamEnabled: true,
            latitude: null,
            longitude: null,
          };
          const [locations, trips] = await Promise.all([
            getLiveDriverLocations({ schoolId }),
            getActiveTripsForTracking({ schoolId }),
          ]);
          const tripsByDriver = indexTripsByDriver(trips);
          return {
            school,
            drivers: sortLiveDrivers(
              locations
                .filter((d) => isGpsLive(d))
                .filter((d) => !driverIds?.length || driverIds.includes(d.driver_id))
                .map((d) => ({
                  ...d,
                  trip_type: tripsByDriver.get(d.driver_id)?.trip_type ?? null,
                }))
            ),
          };
        })
      );
    },
    [selectedIds.join(","), driverIds?.join(","), schools.map((s) => s.id).join(",")],
    { enabled: hasSelection, refetchInterval }
  );

  const liveDrivers = useMemo(() => {
    const seen = new Set<number>();
    const unique: MonitorDriver[] = [];
    for (const driver of groups.flatMap((g) => g.drivers)) {
      if (seen.has(driver.driver_id)) continue;
      seen.add(driver.driver_id);
      unique.push(driver);
    }
    return unique;
  }, [groups]);
  const onTripCount = liveDrivers.filter((d) => d.status === "on_trip").length;
  const cameraCount = groups.reduce(
    (sum, g) =>
      g.school.livestreamEnabled ? sum + g.drivers.length : sum,
    0
  );

  const mapPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = liveDrivers
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => [d.latitude as number, d.longitude as number]);
    for (const s of selectedSchools) {
      if (s.latitude != null && s.longitude != null) {
        pts.push([s.latitude, s.longitude]);
      }
    }
    return pts;
  }, [liveDrivers, selectedSchools]);

  const mapCenter: [number, number] =
    selectedSchools.find((s) => s.latitude != null && s.longitude != null)
      ? [
          selectedSchools.find((s) => s.latitude != null)!.latitude as number,
          selectedSchools.find((s) => s.longitude != null)!.longitude as number,
        ]
      : mapPoints[0] || [28.4595, 77.0266];

  let autoStreamIndex = 0;

  return (
    <div className="space-y-4">
      {showSchoolPicker && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <label className="text-sm font-medium flex items-center gap-2 shrink-0 sm:pt-2">
                <GraduationCap className="h-4 w-4" />
                Schools to monitor
              </label>
              <div className="flex-1 space-y-2">
                <MultiSelect
                  options={schools.map((s) => ({
                    label: s.name,
                    value: String(s.id),
                  }))}
                  selected={pickedSchoolIds}
                  onChange={setPickedSchoolIds}
                  placeholder={
                    schoolsLoading ? "Loading schools..." : "Select one or more schools"
                  }
                  searchPlaceholder="Search schools..."
                  emptyText={
                    schoolsError ? schoolsError.message : "No school found."
                  }
                  className="sm:max-w-xl"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={schools.length === 0}
                    onClick={() =>
                      setPickedSchoolIds(schools.map((s) => String(s.id)))
                    }
                  >
                    Select all
                  </Button>
                  {pickedSchoolIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPickedSchoolIds([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasSelection && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-foreground">Select schools</p>
            <p className="text-sm mt-1">
              Choose one or more schools to monitor live drivers, grouped by school.
            </p>
          </CardContent>
        </Card>
      )}

      {hasSelection && isLoading && liveDrivers.length === 0 && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading live drivers…
        </div>
      )}

      {hasSelection && error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error.message}
          </CardContent>
        </Card>
      )}

      {hasSelection && !error && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedSchools.length === 1
                  ? `${selectedSchools[0].name} — live monitor`
                  : `${selectedSchools.length} schools — live monitor`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Live drivers grouped by school. Only GPS-live drivers are shown.
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
              <CardContent className="text-2xl font-bold">{cameraCount}</CardContent>
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
                  No live GPS positions for the selected schools right now.
                </div>
              ) : (
                <div className="h-72 overflow-hidden rounded-lg">
                  <MapContainer
                    key={selectedIds.join("-")}
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
                          icon={makeLiveIcon(d.status === "on_trip")}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-medium">{d.driver_name}</p>
                              <p className="text-muted-foreground">{d.cab_number}</p>
                              <p className="text-xs mt-1 capitalize">{d.status}</p>
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

          <div className="space-y-8">
            {groups.map((group) => {
              const startIndex = autoStreamIndex;
              if (group.school.livestreamEnabled) {
                autoStreamIndex += group.drivers.length;
              }

              return (
                <section key={group.school.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Radio className="h-4 w-4 text-red-500" />
                      {group.school.name}
                      <Badge variant="secondary">{group.drivers.length} live</Badge>
                    </h3>
                    {!group.school.livestreamEnabled && (
                      <Badge variant="secondary">Streaming disabled</Badge>
                    )}
                  </div>

                  {group.drivers.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        No live drivers for this school right now.
                      </CardContent>
                    </Card>
                  ) : !group.school.livestreamEnabled ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.drivers.map((d) => (
                        <GpsOnlyTile
                          key={d.driver_id}
                          driver={d}
                          detailPathPrefix={detailPathPrefix}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.drivers.map((d, index) => {
                        const globalIndex = startIndex + index;
                        return (
                          <LiveStreamTile
                            key={d.driver_id}
                            driverId={d.driver_id}
                            schoolId={group.school.id}
                            driverName={d.driver_name}
                            cabNumber={d.cab_number}
                            tripType={d.trip_type}
                            autoConnect={globalIndex < MAX_AUTO_STREAMS}
                            connectDelayMs={globalIndex * 250}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
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
  driver: MonitorDriver;
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
          <Badge variant={driver.status === "on_trip" ? "default" : "secondary"}>
            {driver.status === "on_trip" ? "On trip" : "Live GPS"}
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
