export type DashcamFix = {
  deviceId: string;
  objectName: string;
  lat: number;
  lng: number;
  speed: number;
  orientation: number;
  address: string;
  acc: boolean;
  power: boolean;
  gps: boolean;
  hasFix: boolean;
  vehicleStatus: string;
  serverTime: string;
  deviceTime: string;
  alarm: string | null;
  alarmTime: string | null;
  alarmLevel: number | null;
  externalVolt: number | null;
  satCount: number | null;
  odometer: number | null;
  todayDistance: number | null;
};

type LiveRow = {
  deviceId?: string;
  objectName?: string;
  lat?: number;
  lng?: number;
  speed?: number;
  orientation?: number;
  address?: string;
  acc?: boolean;
  power?: boolean;
  gps?: boolean;
  hasFix?: boolean;
  vehicleStatus?: string;
  serverTime?: string;
  deviceTime?: string;
  alarm?: string;
  externalVolt?: number;
  satCount?: number;
  odometer?: number;
  todayDistance?: number;
  aiData?: {
    alarmName?: string;
    alarmTime?: string;
    alarmLevel?: number;
  };
};

const STATUS_LABELS: Record<string, string> = {
  m: "Moving",
  s: "Stopped",
  i: "Idle",
  o: "Offline",
  p: "Parked",
};

export function dashcamStatusLabel(code: string) {
  return STATUS_LABELS[code] ?? code;
}

export function humanizeAlarm(code: string) {
  const spaced = code.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export async function getDashcamLive(): Promise<DashcamFix> {
  const response = await fetch("/api/traqcare/live");
  const raw = await response.text();
  let body: {
    trackingData?: LiveRow[];
    message?: string;
    error?: string;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error("Dashcam feed returned a page instead of tracking data");
  }
  if (!response.ok) {
    throw new Error(body.message || body.error || "Dashcam feed failed");
  }
  const row = body.trackingData?.[0];
  if (!row || row.lat == null || row.lng == null) {
    throw new Error("Dashcam has not reported a position");
  }
  return {
    deviceId: row.deviceId ?? "",
    objectName: row.objectName || "Dashcam",
    lat: row.lat,
    lng: row.lng,
    speed: row.speed ?? 0,
    orientation: row.orientation ?? 0,
    address: row.address || "Address not available",
    acc: Boolean(row.acc),
    power: Boolean(row.power),
    gps: Boolean(row.gps),
    hasFix: Boolean(row.hasFix),
    vehicleStatus: row.vehicleStatus || "",
    serverTime: row.serverTime || "",
    deviceTime: row.deviceTime || "",
    alarm: row.aiData?.alarmName || row.alarm || null,
    alarmTime: row.aiData?.alarmTime || null,
    alarmLevel: row.aiData?.alarmLevel ?? null,
    externalVolt: row.externalVolt ?? null,
    satCount: row.satCount ?? null,
    odometer: row.odometer ?? null,
    todayDistance: row.todayDistance ?? null,
  };
}
