import { supabase } from "@/integrations/supabase/client";
import { TRAQCARE_SCHOOL_ID } from "@/lib/traqcareSchool";

export type VehicleMotion = "s" | "m" | "i" | string;

export interface TraqcareFix {
  acc?: number | boolean;
  power?: number;
  address?: string;
  serverTime?: string;
  lat?: number;
  lng?: number;
  orientation?: number;
  speed?: number;
  voltage_level?: number;
  vehicleStatus?: VehicleMotion | null;
  vehicleStatusStart?: string;
  objectName?: string;
  deviceId?: string;
  cumulativeDistance?: number;
}

export interface TraqcareVideoDevice {
  imei: string;
  name?: string;
  clientName?: string | null;
  status?: string;
  channels?: number | null;
  timezone?: string;
  lastUpdate?: string | null;
  vehicleStatus?: string | null;
}

export interface TraqcareVideoFile {
  fileId: string;
  channel: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  sizeBytes: number;
  resourceType?: string;
  streamType?: string;
  storageType?: string;
}

export interface TraqcareRecording {
  fileName: string;
  url: string;
  uploadedAt: string;
}

export interface TraqcarePlayer {
  imei: string;
  mode: "live" | "history";
  playerUrl: string;
  expiresAt?: string;
  token?: string;
}

export interface TraqcareFleetDevice {
  imei: string;
  name: string;
  channels: number | null;
  hasVideo: boolean;
  clientName?: string | null;
  fix?: TraqcareFix;
}

interface InvokeBody {
  action:
    | "devices"
    | "live"
    | "past"
    | "player"
    | "files"
    | "recordings"
    | "upload"
    | "stop";
  imei?: string;
  from?: string;
  to?: string;
  channel?: number;
  channels?: number[];
  layout?: number;
  mode?: "live" | "history";
  fileId?: string;
}

async function readInvokeError(error: unknown): Promise<string> {
  const fallback =
    error instanceof Error ? error.message : "Traqcare request failed";
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    ?.context;
  if (context && typeof context.json === "function") {
    try {
      const payload = (await context.json()) as { error?: string; message?: string };
      return payload.error || payload.message || fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function invoke<T>(body: InvokeBody): Promise<T> {
  const timeout = body.action === "files" ? 45000 : 25000;

  if (import.meta.env.DEV) {
    const response = await fetch("/api/traqcare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!response.ok || payload.error) {
      throw new Error(payload.error || payload.message || `Traqcare error ${response.status}`);
    }
    return payload as T;
  }

  const { data, error } = await supabase.functions.invoke("traqcare", {
    body: { ...body, schoolId: TRAQCARE_SCHOOL_ID },
  });
  if (error) {
    throw new Error(await readInvokeError(error));
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

export async function fetchTraqcareFleet(): Promise<TraqcareFleetDevice[]> {
  const [liveResult, videoResult] = await Promise.allSettled([
    invoke<{ data?: TraqcareFix[] }>({ action: "live" }),
    invoke<{ devices?: TraqcareVideoDevice[] }>({ action: "devices" }),
  ]);

  if (liveResult.status === "rejected" && videoResult.status === "rejected") {
    throw liveResult.reason instanceof Error
      ? liveResult.reason
      : new Error("Could not reach Traqcare");
  }

  const fixes = liveResult.status === "fulfilled" ? liveResult.value.data ?? [] : [];
  const cameras =
    videoResult.status === "fulfilled" ? videoResult.value.devices ?? [] : [];

  const byImei = new Map<string, TraqcareFleetDevice>();

  for (const camera of cameras) {
    if (!camera.imei) continue;
    byImei.set(camera.imei, {
      imei: camera.imei,
      name: camera.name || camera.imei,
      channels: camera.channels ?? null,
      hasVideo: true,
      clientName: camera.clientName,
    });
  }

  for (const fix of fixes) {
    const imei = fix.deviceId;
    if (!imei) continue;
    const existing = byImei.get(imei);
    if (existing) {
      existing.fix = fix;
      if (fix.objectName) existing.name = fix.objectName;
    } else {
      byImei.set(imei, {
        imei,
        name: fix.objectName || imei,
        channels: null,
        hasVideo: false,
        fix,
      });
    }
  }

  return Array.from(byImei.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function fetchTraqcareHistory(imei: string, from: string, to: string) {
  return invoke<{ HistoryData?: TraqcareFix[]; count?: number }>({
    action: "past",
    imei,
    from,
    to,
  });
}

export function openTraqcarePlayer(input: {
  imei: string;
  mode: "live" | "history";
  from?: string;
  to?: string;
  channels?: number[];
  layout?: number;
}) {
  return invoke<TraqcarePlayer>({ action: "player", ...input });
}

export function fetchTraqcareFiles(imei: string, from: string, to: string) {
  return invoke<{ files?: TraqcareVideoFile[]; count?: number }>({
    action: "files",
    imei,
    from,
    to,
  });
}

export function fetchTraqcareRecordings(imei: string) {
  return invoke<{ recordings?: TraqcareRecording[]; count?: number }>({
    action: "recordings",
    imei,
  });
}

export function uploadTraqcareFile(imei: string, fileId: string) {
  return invoke<{ message?: string }>({ action: "upload", imei, fileId });
}

export function stopTraqcareStream(imei: string, mode: "live" | "history") {
  return invoke({ action: "stop", imei, mode }).catch(() => undefined);
}

export function motionLabel(status?: string | null) {
  if (status === "m") return "Moving";
  if (status === "i") return "Idle";
  if (status === "s") return "Stopped";
  return "No fix";
}
