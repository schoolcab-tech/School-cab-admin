import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/auth-context";
import { useModeratorSchoolContextOptional } from "@/contexts/moderator-school-context";
import { TRAQCARE_SCHOOL_ID, TRAQCARE_SCHOOL_NAME } from "@/lib/traqcareSchool";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchTraqcareFiles,
  fetchTraqcareFleet,
  fetchTraqcareHistory,
  fetchTraqcareRecordings,
  motionLabel,
  openTraqcarePlayer,
  stopTraqcareStream,
  uploadTraqcareFile,
  type TraqcareFleetDevice,
  type TraqcareRecording,
  type TraqcareVideoFile,
} from "@/services/traqcareService";
import { toast } from "sonner";
import {
  Camera,
  CloudUpload,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
  Video,
  VideoOff,
} from "lucide-react";

const POLL_MS = 15000;

function localInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function windowFromInputs(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Choose a valid start and end time");
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error("End time must be after the start time");
  }
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
    throw new Error("Traqcare allows at most 24 hours per request");
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  return `${rest}s`;
}

function ignitionOn(acc?: number | boolean) {
  return acc === true || acc === 1;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function withControls(playerUrl: string) {
  const url = new URL(playerUrl);
  if (!url.searchParams.has("showControls")) {
    url.searchParams.set("showControls", "true");
  }
  return url.toString();
}

function vehicleIcon(selected: boolean, moving: boolean, heading = 0) {
  const color = selected ? "#0f172a" : moving ? "#2563eb" : "#64748b";
  const size = selected ? 34 : 28;
  return new L.DivIcon({
    className: "leaflet-custom-marker",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 3l7 18-7-4-7 4z"/></svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FitPoints({
  points,
  token,
}: {
  points: [number, number][];
  token: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 });
  }, [map, token]);
  return null;
}

function FleetMap({
  devices,
  selectedImei,
  history,
  onSelect,
}: {
  devices: TraqcareFleetDevice[];
  selectedImei: string | null;
  history: [number, number][];
  onSelect: (imei: string) => void;
}) {
  const positioned = devices.filter(
    (device) =>
      typeof device.fix?.lat === "number" && typeof device.fix?.lng === "number"
  );
  const points: [number, number][] = history.length
    ? history
    : positioned.map((device) => [device.fix!.lat!, device.fix!.lng!]);
  const token = history.length
    ? `history-${selectedImei}-${history.length}`
    : positioned.map((device) => device.imei).join(",");

  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      className="h-[320px] w-full rounded-lg z-0"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitPoints points={points} token={token} />
      {history.length > 1 && (
        <Polyline positions={history} pathOptions={{ color: "#2563eb", weight: 4 }} />
      )}
      {positioned.map((device) => (
        <Marker
          key={device.imei}
          position={[device.fix!.lat!, device.fix!.lng!]}
          icon={vehicleIcon(
            device.imei === selectedImei,
            device.fix?.vehicleStatus === "m",
            device.fix?.orientation ?? 0
          )}
          eventHandlers={{ click: () => onSelect(device.imei) }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{device.name}</p>
              <p>{motionLabel(device.fix?.vehicleStatus)} · {device.fix?.speed ?? 0} km/h</p>
              <p className="text-xs text-muted-foreground">{device.fix?.address || "No address"}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default function DashcamPage() {
  const { isModerator } = useAuth();
  const moderatorSchool = useModeratorSchoolContextOptional();
  const schoolReady = !isModerator || !moderatorSchool?.isLoadingSchools;
  const schoolAllowed =
    !isModerator || moderatorSchool?.activeSchoolId === TRAQCARE_SCHOOL_ID;
  const [devices, setDevices] = useState<TraqcareFleetDevice[]>([]);
  const [selectedImei, setSelectedImei] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [playerMode, setPlayerMode] = useState<"live" | "history" | null>(null);
  const [playerBusy, setPlayerBusy] = useState(false);
  const [liveUrls, setLiveUrls] = useState<Record<string, string>>({});
  const [liveBusy, setLiveBusy] = useState(false);
  const startedLiveKey = useRef("");
  const [from, setFrom] = useState(() =>
    localInputValue(new Date(Date.now() - 2 * 60 * 60 * 1000))
  );
  const [to, setTo] = useState(() => localInputValue(new Date()));
  const [history, setHistory] = useState<[number, number][]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [files, setFiles] = useState<TraqcareVideoFile[]>([]);
  const [filesBusy, setFilesBusy] = useState(false);
  const [filesNote, setFilesNote] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<TraqcareRecording[]>([]);
  const [recordingsBusy, setRecordingsBusy] = useState(false);
  const [activeClip, setActiveClip] = useState<string | null>(null);

  const selected = devices.find((device) => device.imei === selectedImei) ?? null;

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const fleet = await fetchTraqcareFleet();
      setDevices(fleet);
      setError(null);
      setSelectedImei((current) => current ?? fleet[0]?.imei ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load Traqcare";
      setError(message);
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!schoolReady || !schoolAllowed) return;
    refresh();
    const timer = setInterval(() => refresh(true), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, schoolAllowed, schoolReady]);

  useEffect(() => {
    setPlayerUrl(null);
    setPlayerMode(null);
    setHistory([]);
    setFiles([]);
    setFilesNote(null);
    setRecordings([]);
    setActiveClip(null);
  }, [selectedImei]);

  const closePlayer = useCallback(async () => {
    const imei = selectedImei;
    const mode = playerMode;
    setPlayerUrl(null);
    setPlayerMode(null);
    if (imei && mode) await stopTraqcareStream(imei, mode);
  }, [playerMode, selectedImei]);

  const cameras = useMemo(
    () => devices.filter((device) => device.hasVideo),
    [devices]
  );
  const liveKey = cameras.map((device) => device.imei).join(",");

  const startLiveWall = useCallback(async (list: TraqcareFleetDevice[]) => {
    if (!list.length) return;
    setLiveBusy(true);
    try {
      const entries = await Promise.all(
        list.map(async (device) => {
          const count = device.channels && device.channels > 0 ? device.channels : 1;
          const channels = Array.from({ length: count }, (_, index) => index + 1);
          const session = await openTraqcarePlayer({
            imei: device.imei,
            mode: "live",
            channels,
            layout: count === 2 ? 2 : undefined,
          });
          return [device.imei, withControls(session.playerUrl)] as const;
        })
      );
      setLiveUrls(Object.fromEntries(entries));
    } catch (err) {
      startedLiveKey.current = "";
      toast.error(err instanceof Error ? err.message : "Could not start the live cameras");
    } finally {
      setLiveBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!liveKey || startedLiveKey.current === liveKey) return;
    startedLiveKey.current = liveKey;
    startLiveWall(cameras);
  }, [cameras, liveKey, startLiveWall]);

  const stopLiveWall = async () => {
    const imeis = Object.keys(liveUrls);
    setLiveUrls({});
    startedLiveKey.current = "";
    await Promise.all(imeis.map((imei) => stopTraqcareStream(imei, "live")));
  };

  const loadHistory = async () => {
    if (!selected) return;
    setHistoryBusy(true);
    try {
      const window = windowFromInputs(from, to);
      const result = await fetchTraqcareHistory(selected.imei, window.from, window.to);
      const points = (result.HistoryData ?? [])
        .filter((fix) => typeof fix.lat === "number" && typeof fix.lng === "number")
        .map((fix) => [fix.lat!, fix.lng!] as [number, number]);
      setHistory(points);
      if (!points.length) toast.message("No GPS points in that window");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the route");
    } finally {
      setHistoryBusy(false);
    }
  };

  const loadFiles = async () => {
    if (!selected?.hasVideo) return;
    setFilesBusy(true);
    setFilesNote(null);
    try {
      const window = windowFromInputs(from, to);
      const result = await fetchTraqcareFiles(selected.imei, window.from, window.to);
      setFiles(result.files ?? []);
      if (!(result.files ?? []).length) {
        setFilesNote("The dashcam has no files in this window. It has to be online for this search.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not list recordings";
      setFilesNote(message);
      toast.error(message);
    } finally {
      setFilesBusy(false);
    }
  };

  const playFile = async (file: TraqcareVideoFile) => {
    if (!selected) return;
    setPlayerBusy(true);
    try {
      const session = await openTraqcarePlayer({
        imei: selected.imei,
        mode: "history",
        from: file.startTime,
        to: file.endTime,
        channels: [file.channel],
      });
      setPlayerMode("history");
      setPlayerUrl(withControls(session.playerUrl));
      setActiveClip(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not play that recording");
    } finally {
      setPlayerBusy(false);
    }
  };

  const saveToCloud = async (file: TraqcareVideoFile) => {
    if (!selected) return;
    try {
      await uploadTraqcareFile(selected.imei, file.fileId);
      toast.success("The dashcam accepted the upload. It will show under Cloud clips once it finishes.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload that file");
    }
  };

  const loadCloud = async () => {
    if (!selected?.hasVideo) return;
    setRecordingsBusy(true);
    try {
      const result = await fetchTraqcareRecordings(selected.imei);
      setRecordings(result.recordings ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load cloud clips");
    } finally {
      setRecordingsBusy(false);
    }
  };

  const stats = useMemo(() => {
    const moving = devices.filter((device) => device.fix?.vehicleStatus === "m").length;
    const cameras = devices.filter((device) => device.hasVideo).length;
    return { moving, cameras, total: devices.length };
  }, [devices]);

  if (isModerator && !schoolAllowed) {
    return (
      <DashboardLayout>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Camera className="h-7 w-7" />
            Dashcams
          </h1>
          <p className="text-muted-foreground">
            Dashcams are enabled for {TRAQCARE_SCHOOL_NAME}. Switch to that school to
            watch its cameras and routes.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Camera className="h-7 w-7" />
              Dashcams
            </h1>
            <p className="text-muted-foreground">
              {TRAQCARE_SCHOOL_NAME}. Live GPS, dashcam video, and recordings from Traqcare.
              Positions refresh every 15 seconds.
            </p>
          </div>
          <Button variant="outline" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Devices</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Moving</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{stats.moving}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With a camera</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{stats.cameras}</CardContent>
          </Card>
        </div>

        {cameras.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Both cameras play together. Live video uses each dashcam’s mobile data.
              </p>
              {Object.keys(liveUrls).length > 0 ? (
                <Button variant="outline" size="sm" onClick={stopLiveWall}>
                  <VideoOff className="mr-2 h-4 w-4" />
                  Stop both
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => startLiveWall(cameras)}
                  disabled={liveBusy}
                >
                  {liveBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                  Watch both
                </Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {cameras.map((device) => (
                <div key={device.imei} className="overflow-hidden rounded-lg border bg-card">
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {motionLabel(device.fix?.vehicleStatus)} · {device.fix?.speed ?? 0} km/h
                        {device.channels ? ` · ${device.channels} channel${device.channels === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                    <Badge variant={device.fix?.vehicleStatus === "m" ? "default" : "secondary"}>
                      {device.imei}
                    </Badge>
                  </div>
                  {liveUrls[device.imei] ? (
                    <iframe
                      title={`${device.name} live`}
                      src={liveUrls[device.imei]}
                      className="aspect-video w-full bg-black"
                      allow="fullscreen; web-share; cross-origin-isolated"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-black text-sm text-white/80">
                      {liveBusy ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Opening camera…
                        </span>
                      ) : (
                        "Camera is stopped"
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            {error}
            {error.toLowerCase().includes("traqcare_api_key") ||
            error.toLowerCase().includes("not configured") ? (
              <p className="mt-1 text-muted-foreground">
                Put the Traqcare key in <code>School-cab-admin/.env</code> as{" "}
                <code>TRAQCARE_API_KEY</code>, then restart the admin dev server. The key stays on the
                server and is not sent to the browser.
              </p>
            ) : null}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vehicles</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[720px] space-y-2 overflow-y-auto p-3 pt-0">
              {loading && !devices.length ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading devices…
                </div>
              ) : null}
              {!loading && !devices.length && !error ? (
                <p className="p-4 text-sm text-muted-foreground">
                  This key has no devices yet.
                </p>
              ) : null}
              {devices.map((device) => {
                const active = device.imei === selectedImei;
                return (
                  <button
                    key={device.imei}
                    type="button"
                    onClick={() => setSelectedImei(device.imei)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{device.name}</span>
                      <Badge variant={device.fix?.vehicleStatus === "m" ? "default" : "secondary"}>
                        {motionLabel(device.fix?.vehicleStatus)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {device.fix ? `${device.fix.speed ?? 0} km/h` : "Waiting for GPS"}
                      {device.hasVideo ? ` · ${device.channels ?? "?"} cam` : " · GPS only"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{device.imei}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-3">
                <FleetMap
                  devices={devices}
                  selectedImei={selectedImei}
                  history={history}
                  onSelect={setSelectedImei}
                />
              </CardContent>
            </Card>

            {selected ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{selected.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selected.fix?.address || "No address yet"} · updated{" "}
                        {formatWhen(selected.fix?.serverTime)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">{selected.fix?.speed ?? 0} km/h</Badge>
                      <Badge variant="outline">
                        Ignition {ignitionOn(selected.fix?.acc) ? "on" : "off"}
                      </Badge>
                      <Badge variant="outline">
                        {selected.fix?.cumulativeDistance != null
                          ? `${selected.fix.cumulativeDistance.toFixed(1)} km`
                          : "Distance —"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="history">
                    <TabsList>
                      <TabsTrigger value="history" className="gap-2">
                        <MapPin className="h-4 w-4" />
                        Route
                      </TabsTrigger>
                      <TabsTrigger value="recordings" className="gap-2">
                        <Video className="h-4 w-4" />
                        Recordings
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="history" className="space-y-3">
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="text-sm">
                          <span className="mb-1 block text-muted-foreground">From</span>
                          <Input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-muted-foreground">To</span>
                          <Input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
                        </label>
                        <Button onClick={loadHistory} disabled={historyBusy}>
                          {historyBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Show route
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {history.length
                          ? `${history.length} GPS points plotted on the map. Traqcare returns at most 24 hours per request.`
                          : "Pick a window of 24 hours or less. The route draws on the map above."}
                      </p>
                    </TabsContent>

                    <TabsContent value="recordings" className="space-y-4">
                      {selected.hasVideo ? (
                        <>
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="text-sm">
                              <span className="mb-1 block text-muted-foreground">From</span>
                              <Input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
                            </label>
                            <label className="text-sm">
                              <span className="mb-1 block text-muted-foreground">To</span>
                              <Input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
                            </label>
                            <Button onClick={loadFiles} disabled={filesBusy}>
                              {filesBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Search camera
                            </Button>
                            <Button variant="outline" onClick={loadCloud} disabled={recordingsBusy}>
                              {recordingsBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Cloud clips
                            </Button>
                          </div>
                          {filesNote ? <p className="text-sm text-muted-foreground">{filesNote}</p> : null}
                          {playerUrl && playerMode === "history" ? (
                            <div className="space-y-2">
                              <div className="flex justify-end">
                                <Button variant="outline" size="sm" onClick={closePlayer}>
                                  Close playback
                                </Button>
                              </div>
                              <iframe
                                title={`${selected.name} recording`}
                                src={playerUrl}
                                className="aspect-video w-full rounded-lg border bg-black"
                                allow="fullscreen; web-share; cross-origin-isolated"
                              />
                            </div>
                          ) : null}
                          <div className="space-y-2">
                            {files.map((file) => (
                              <div
                                key={file.fileId}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                              >
                                <div className="text-sm">
                                  <p className="font-medium">
                                    Channel {file.channel} · {formatDuration(file.durationSeconds)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatWhen(file.startTime)} – {formatWhen(file.endTime)} · {formatBytes(file.sizeBytes)}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => playFile(file)} disabled={playerBusy}>
                                    Play
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => saveToCloud(file)}>
                                    <CloudUpload className="mr-1 h-4 w-4" />
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            {recordings.map((clip) => (
                              <div key={clip.url} className="rounded-lg border px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-sm">
                                    <p className="font-medium">{clip.fileName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded {formatWhen(clip.uploadedAt)}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setActiveClip((current) => (current === clip.url ? null : clip.url))
                                    }
                                  >
                                    {activeClip === clip.url ? "Hide" : "Play"}
                                  </Button>
                                </div>
                                {activeClip === clip.url ? (
                                  <video
                                    className="mt-2 aspect-video w-full rounded-md bg-black"
                                    src={clip.url}
                                    controls
                                  />
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Recordings are available on dashcams. This device is GPS only.
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Select a vehicle to watch it, replay its route, or open recordings.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
