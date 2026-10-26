const BASE = "https://api.traqcare.com";

export type TraqcareAction =
  | "devices"
  | "live"
  | "past"
  | "player"
  | "files"
  | "recordings"
  | "upload"
  | "stop";

export interface TraqcareRequest {
  action?: TraqcareAction;
  imei?: string;
  from?: string;
  to?: string;
  channel?: number;
  channels?: number[];
  layout?: number;
  mode?: "live" | "history";
  fileId?: string;
}

export class TraqcareProxyError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function requireImei(imei: string | undefined): string {
  const value = (imei ?? "").trim();
  if (!/^[A-Za-z0-9]{5,24}$/.test(value)) {
    throw new TraqcareProxyError(400, "A valid device IMEI is required");
  }
  return value;
}

function requireWindow(from?: string, to?: string) {
  if (!from || !to) {
    throw new TraqcareProxyError(400, "A start and end time are required");
  }
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new TraqcareProxyError(400, "Start and end must be valid times");
  }
  if (end.getTime() <= start.getTime()) {
    throw new TraqcareProxyError(400, "End time must be after the start time");
  }
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
    throw new TraqcareProxyError(400, "The time window cannot be longer than 24 hours");
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

function channelsOf(channels: number[] | undefined): number[] | undefined {
  if (!channels?.length) return undefined;
  const clean = channels.filter(
    (n) => Number.isInteger(n) && n >= 1 && n <= 36
  );
  return clean.length ? clean : undefined;
}

async function callTraqcare(
  url: string,
  init?: RequestInit
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, init);
  const text = await response.text();
  let parsed: unknown = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { error: text.slice(0, 300) };
    }
  }
  if (response.status >= 400) {
    const record =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    const message =
      (typeof record.error === "string" && record.error) ||
      (typeof record.message === "string" && record.message) ||
      `Traqcare returned ${response.status}`;
    return { status: response.status, body: { error: message } };
  }
  return { status: response.status, body: parsed };
}

function withKey(path: string, apiKey: string, params: Record<string, string | undefined>) {
  const url = new URL(path, BASE);
  url.searchParams.set("key", apiKey);
  for (const [name, value] of Object.entries(params)) {
    if (value) url.searchParams.set(name, value);
  }
  return url.toString();
}

/** Forwards one admin action to Traqcare. The API key never leaves this function. */
export async function proxyTraqcare(
  apiKey: string,
  raw: TraqcareRequest
): Promise<{ status: number; body: unknown }> {
  if (!apiKey.trim()) {
    throw new TraqcareProxyError(
      503,
      "Traqcare is not configured. Set TRAQCARE_API_KEY on the server."
    );
  }

  const action = raw.action;
  const key = apiKey.trim();

  if (action === "devices") {
    return callTraqcare(withKey("/tracking/video/devices", key, {}));
  }

  if (action === "live") {
    const imei = raw.imei?.trim();
    if (imei) requireImei(imei);
    return callTraqcare(
      withKey("/tracking/live", key, {
        imei,
        includeSubClients: "true",
      })
    );
  }

  if (action === "past") {
    const imei = requireImei(raw.imei);
    const window = requireWindow(raw.from, raw.to);
    return callTraqcare(
      withKey("/tracking/past", key, { imei, from: window.from, to: window.to })
    );
  }

  if (action === "files") {
    const imei = requireImei(raw.imei);
    const window = requireWindow(raw.from, raw.to);
    const channel =
      raw.channel != null && Number.isInteger(raw.channel) && raw.channel >= 0
        ? String(raw.channel)
        : undefined;
    return callTraqcare(
      withKey("/tracking/video/files", key, {
        imei,
        from: window.from,
        to: window.to,
        channel,
      })
    );
  }

  if (action === "recordings") {
    const imei = requireImei(raw.imei);
    const hasWindow = Boolean(raw.from || raw.to);
    const window = hasWindow ? requireWindow(raw.from, raw.to) : undefined;
    return callTraqcare(
      withKey("/tracking/video/recordings", key, {
        imei,
        from: window?.from,
        to: window?.to,
      })
    );
  }

  if (action === "player") {
    const imei = requireImei(raw.imei);
    const mode = raw.mode === "history" ? "history" : "live";
    const payload: Record<string, unknown> = {
      imei,
      mode,
      autoPlay: true,
      expiresIn: 60,
    };
    const channels = channelsOf(raw.channels);
    if (channels) payload.channels = channels;
    if (raw.layout && [1, 2, 4, 6, 8, 9, 16, 36].includes(raw.layout)) {
      payload.layout = raw.layout;
    }
    if (mode === "history") {
      const window = requireWindow(raw.from, raw.to);
      payload.from = window.from;
      payload.to = window.to;
    }
    return callTraqcare(withKey("/tracking/video/player-session", key, {}), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  if (action === "upload") {
    const imei = requireImei(raw.imei);
    const fileId = (raw.fileId ?? "").trim();
    if (!fileId || fileId.length > 120) {
      throw new TraqcareProxyError(400, "A recorded file id is required");
    }
    return callTraqcare(withKey("/tracking/video/uploads", key, {}), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imei, fileId }),
    });
  }

  if (action === "stop") {
    const imei = requireImei(raw.imei);
    const mode = raw.mode === "history" ? "playback" : "live";
    return callTraqcare(withKey("/tracking/video/stop", key, {}), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imei, mode }),
    });
  }

  throw new TraqcareProxyError(400, "Unknown Traqcare action");
}
