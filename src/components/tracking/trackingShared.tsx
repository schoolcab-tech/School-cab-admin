import { useEffect } from "react";
import { useMap, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import type { DriverTripPhase, TripStop } from "@/services/liveTrackingService";

export const TRACKING_COLORS = {
  online: "#16a34a",
  on_trip: "#2563eb",
  inactive: "#6b7280",
  completed_today: "#9333ea",
  pickup: "#ea580c",
  drop: "#9333ea",
  pickup_done: "#16a34a",
  drop_done: "#16a34a",
  selected: "#0f172a",
} as const;

export function makeDriverIcon(phase: DriverTripPhase, selected = false) {
  const bg =
    phase === "on_trip"
      ? TRACKING_COLORS.on_trip
      : phase === "online"
        ? TRACKING_COLORS.online
        : phase === "completed_today"
          ? TRACKING_COLORS.completed_today
          : TRACKING_COLORS.inactive;
  const color = selected ? TRACKING_COLORS.selected : bg;
  return new L.DivIcon({
    className: "leaflet-custom-marker",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 34 : 28}px;height:${selected ? 34 : 28}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
    </div>`,
    iconSize: [selected ? 34 : 28, selected ? 34 : 28],
    iconAnchor: [selected ? 17 : 14, selected ? 17 : 14],
  });
}

export function makeStopIcon(stop: TripStop) {
  const isDone = ["picked_up", "dropped", "completed"].includes(stop.status);
  const bg =
    stop.stop_type === "pickup"
      ? isDone
        ? TRACKING_COLORS.pickup_done
        : TRACKING_COLORS.pickup
      : isDone
        ? TRACKING_COLORS.drop_done
        : TRACKING_COLORS.drop;
  const label = stop.stop_type === "pickup" ? "P" : "D";
  return new L.DivIcon({
    className: "leaflet-custom-marker",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${bg};border:2px solid white;font-size:9px;font-weight:700;color:white;">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function PanToDriver({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.5 });
    }
  }, [lat, lng, map]);
  return null;
}

/** Fit map to show all route markers and driver position. */
export function FitMapBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const pointsKey = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [map, pointsKey, points]);
  return null;
}

const schoolMarkerIcon = new L.DivIcon({
  className: "leaflet-custom-marker",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#dc2626;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export function SchoolMapMarker({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  return (
    <Marker position={[latitude, longitude]} icon={schoolMarkerIcon}>
      <Popup>
        <strong>{name}</strong>
        <br />
        <span className="text-xs">School</span>
      </Popup>
    </Marker>
  );
}

export function PhaseBadge({ phase }: { phase: DriverTripPhase }) {
  const config: Record<DriverTripPhase, { label: string; className: string }> = {
    on_trip: { label: "On Trip", className: "bg-blue-600 text-white hover:bg-blue-600" },
    online: { label: "Active", className: "bg-green-600 text-white hover:bg-green-600" },
    completed_today: { label: "Completed", className: "bg-purple-600 text-white hover:bg-purple-600" },
    inactive: { label: "Inactive", className: "" },
  };
  const c = config[phase];
  return (
    <Badge variant={phase === "inactive" ? "secondary" : "default"} className={c.className}>
      {c.label}
    </Badge>
  );
}

export function GpsBadge({ isLive, minutesSince }: { isLive: boolean; minutesSince: number | null }) {
  if (isLive) {
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-600 gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        Live
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      Offline
      {minutesSince != null && minutesSince < 1440 ? ` • ${Math.round(minutesSince)}m` : ""}
    </Badge>
  );
}

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
