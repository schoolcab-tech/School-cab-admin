import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  dashcamStatusLabel,
  getDashcamLive,
  humanizeAlarm,
  type DashcamFix,
} from "@/services/dashcamService";
import { Loader2, MapPin, RefreshCw, Video } from "lucide-react";

function formatUpdated(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function deviceClock(iso: string) {
  const match = iso.match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : "—";
}

function dashcamIcon(heading: number) {
  return new L.DivIcon({
    className: "leaflet-custom-marker",
    html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);">
      <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:18px solid #2563eb;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));"></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16],
  });
}

function FollowDashcam({ fix }: { fix: DashcamFix }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([fix.lat, fix.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [map, fix.lat, fix.lng]);
  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function DashcamPage() {
  const { data, isLoading, error, refetch } = useSimpleQuery(getDashcamLive, [], {
    refetchInterval: 10000,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Video className="h-7 w-7" />
              Dashcam
            </h1>
            <p className="text-muted-foreground">
              Live position from the Traqcare dashcam. Updates every 10 seconds.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">{error.message}</CardContent>
          </Card>
        )}

        {isLoading && !data && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading dashcam…
          </div>
        )}

        {data && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <MapContainer
                  center={[data.lat, data.lng]}
                  zoom={15}
                  className="h-[520px] w-full"
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FollowDashcam fix={data} />
                  <Marker position={[data.lat, data.lng]} icon={dashcamIcon(data.orientation)}>
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{data.objectName}</p>
                        <p>{Math.round(data.speed)} km/h</p>
                        <p>{data.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl">{data.objectName}</CardTitle>
                    <Badge>{dashcamStatusLabel(data.vehicleStatus)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">IMEI {data.deviceId}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight">{Math.round(data.speed)}</p>
                    <p className="text-sm text-muted-foreground">km/h · heading {Math.round(data.orientation)}°</p>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{data.address}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Ignition" value={data.acc ? "On" : "Off"} />
                    <Stat label="Power" value={data.power ? "On" : "Off"} />
                    <Stat label="GPS" value={data.gps && data.hasFix ? "Fix" : "No fix"} />
                    <Stat
                      label="Voltage"
                      value={data.externalVolt != null ? `${data.externalVolt} V` : "—"}
                    />
                    <Stat
                      label="Satellites"
                      value={data.satCount != null ? String(data.satCount) : "—"}
                    />
                    <Stat
                      label="Odometer"
                      value={data.odometer != null ? `${data.odometer.toFixed(1)} km` : "—"}
                    />
                    <Stat
                      label="Today"
                      value={data.todayDistance != null ? `${data.todayDistance.toFixed(1)} km` : "—"}
                    />
                    <Stat label="Updated" value={formatUpdated(data.serverTime)} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Device clock {deviceClock(data.deviceTime)}
                  </p>
                </CardContent>
              </Card>

              {data.alarm && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Latest alarm</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{humanizeAlarm(data.alarm)}</p>
                    <p className="text-muted-foreground">
                      {data.alarmTime ? deviceClock(data.alarmTime) : "Time not reported"}
                      {data.alarmLevel != null ? ` · level ${data.alarmLevel}` : ""}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
