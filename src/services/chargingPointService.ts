import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ChargingPoint = Tables<"ev_charging_points">;

export type ChargingPointForm = {
  name: string;
  spoken_name: string;
  address: string;
  short_address: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  power_kw: string;
  connectors: string;
  operator: string;
  access: string;
  active: boolean;
  service_areas: string[];
  site_phrases: string[];
};

const blank = (value: string) => value.trim();

export function emptyChargingPointForm(): ChargingPointForm {
  return {
    name: "",
    spoken_name: "",
    address: "",
    short_address: "",
    city: "",
    state: "",
    latitude: "",
    longitude: "",
    power_kw: "",
    connectors: "",
    operator: "",
    access: "Public",
    active: true,
    service_areas: [],
    site_phrases: [],
  };
}

export function chargingPointToForm(point: ChargingPoint): ChargingPointForm {
  return {
    name: point.name,
    spoken_name: point.spoken_name,
    address: point.address ?? "",
    short_address: point.short_address ?? "",
    city: point.city ?? "",
    state: point.state ?? "",
    latitude: point.latitude == null ? "" : String(point.latitude),
    longitude: point.longitude == null ? "" : String(point.longitude),
    power_kw: point.power_kw == null ? "" : String(point.power_kw),
    connectors: point.connectors ?? "",
    operator: point.operator ?? "",
    access: point.access ?? "",
    active: point.active,
    service_areas: [...(point.service_areas ?? [])],
    site_phrases: [...(point.site_phrases ?? [])],
  };
}

export function spokenNameFrom(name: string) {
  let cleaned = name
    .replace(/\bby\s+[^,]+$/i, " ")
    .replace(/\b\d+(\.\d+)?\s*k\s*w\b/gi, " ")
    .replace(/\bRC\b/g, " ")
    .replace(/\b(DC|AC)\s*\d*\b/gi, " ")
    .replace(/\bcharger\s*\d*\b/gi, " ")
    .replace(/\bcharging\s+(point|station)\b/gi, " ")
    .replace(/[\s,–-]+/g, " ")
    .trim();
  cleaned = cleaned.replace(/\s+\d+$/, "").trim();
  return cleaned.length >= 3 ? cleaned : name.trim();
}

export function shortAddressFrom(address: string) {
  return address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

export function sectorsFrom(...values: string[]) {
  const text = values.join(" ");
  const nums: string[] = [];
  const re = /(?:\b(?:sector|sec)\s+)(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) nums.push(match[1]);
  return [...new Set(nums)];
}

function uniquePhrases(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const key = cleaned.toLowerCase();
    if (cleaned.length < 2 || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function flattenAreas(values: string[]) {
  const parts: string[] = [];
  for (const value of values) {
    for (const part of String(value).split(/[,;\n]+/)) parts.push(part);
  }
  return uniquePhrases(parts);
}

function areaKey(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function canonicalAreaKey(value: string) {
  return areaKey(value)
    .replace(/\bgurugaon\b/g, "gurugram")
    .replace(/\bgurgaon\b/g, "gurugram")
    .replace(/\bsec\b/g, "sector")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

export function generatedPhrases(input: {
  spoken: string;
  shortAddress: string;
  address: string;
  city: string;
  state: string;
  sectors: string[];
}) {
  const phrases = [
    input.spoken,
    input.shortAddress,
    [input.address, input.city, input.state].filter(Boolean).join(", "),
  ];
  for (const sector of input.sectors) {
    phrases.push(`Sector ${sector}`);
    if (input.city) phrases.push(`${input.city} Sector ${sector}`);
  }
  return uniquePhrases(phrases);
}

function siteKeyFrom(address: string, city: string, sectors: string[]) {
  const citySlug = (city || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (sectors.length) return `site:${citySlug}-sector-${sectors[0]}`;
  const addr = address.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return (`addr:${addr}` || `addr:${citySlug}`).slice(0, 180);
}

function parseOptionalNumber(value: string, label: string) {
  const trimmed = blank(value);
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number`);
  return parsed;
}

function parseCoordinate(value: string, limit: number, label: string) {
  const parsed = parseOptionalNumber(value, label);
  if (parsed === null) return null;
  if (parsed === 0 || Math.abs(parsed) > limit) {
    throw new Error(`${label} must be between -${limit} and ${limit}, and not zero`);
  }
  return parsed;
}

export function toChargingPointWrite(
  input: ChargingPointForm,
  existing?: ChargingPoint | null,
): TablesInsert<"ev_charging_points"> {
  const name = blank(input.name);
  if (name.length < 2) throw new Error("Charger name is required");

  const spoken = blank(input.spoken_name) || spokenNameFrom(name);
  const address = blank(input.address);
  const shortAddress = blank(input.short_address) || shortAddressFrom(address);
  const city = blank(input.city);
  const state = blank(input.state);
  const sectors = sectorsFrom(name, spoken, address);
  const phrases = uniquePhrases(input.site_phrases);
  const serviceAreas = flattenAreas(input.service_areas);
  const latitude = parseCoordinate(input.latitude, 90, "Latitude");
  const longitude = parseCoordinate(input.longitude, 180, "Longitude");
  if ((latitude == null) !== (longitude == null)) {
    throw new Error("Enter both latitude and longitude, or leave both blank");
  }

  return {
    name,
    spoken_name: spoken,
    address: address || null,
    short_address: shortAddress || null,
    city: city || null,
    state: state || null,
    latitude,
    longitude,
    power_kw: parseOptionalNumber(input.power_kw, "Power"),
    connectors: blank(input.connectors) || null,
    operator: blank(input.operator) || null,
    access: blank(input.access) || null,
    site_key: existing?.site_key || siteKeyFrom(address, city, sectors),
    site_sectors: sectors,
    site_phrases: phrases.length
      ? phrases
      : generatedPhrases({ spoken, shortAddress, address, city, state, sectors }),
    service_areas: serviceAreas,
    active: input.active,
    updated_at: new Date().toISOString(),
    ...(existing ? {} : { source_id: `manual_${Date.now()}` }),
  };
}

export async function listChargingPoints(): Promise<ChargingPoint[]> {
  const { data, error } = await supabase
    .from("ev_charging_points")
    .select("*")
    .order("city", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createChargingPoint(input: ChargingPointForm): Promise<ChargingPoint> {
  const row = toChargingPointWrite(input);
  const { data, error } = await supabase
    .from("ev_charging_points")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateChargingPoint(
  id: string,
  patch: TablesUpdate<"ev_charging_points">,
): Promise<ChargingPoint> {
  const { data, error } = await supabase
    .from("ev_charging_points")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function claimServiceAreas(ownerId: string, areas: string[]) {
  const claimed = new Set(areas.flatMap((area) => [areaKey(area), canonicalAreaKey(area)]).filter(Boolean));
  if (!claimed.size) return;
  const points = await listChargingPoints();
  await Promise.all(points.map(async (point) => {
    if (point.id === ownerId) return;
    const current = point.service_areas ?? [];
    const next = current.filter((area) => !claimed.has(areaKey(area)) && !claimed.has(canonicalAreaKey(area)));
    if (next.length === current.length) return;
    await updateChargingPoint(point.id, { service_areas: next });
  }));
}

export async function saveChargingPoint(
  input: ChargingPointForm,
  existing?: ChargingPoint | null,
): Promise<ChargingPoint> {
  const saved = existing
    ? await updateChargingPoint(existing.id, toChargingPointWrite(input, existing))
    : await createChargingPoint(input);
  const previous = new Set((existing?.service_areas ?? []).map(areaKey));
  const claimed = flattenAreas(saved.service_areas ?? []).filter((area) => !previous.has(areaKey(area)));
  if (claimed.length) await claimServiceAreas(saved.id, claimed);
  return saved;
}

export async function deleteChargingPoint(id: string): Promise<void> {
  const { error } = await supabase.from("ev_charging_points").delete().eq("id", id);
  if (error) throw error;
}

export async function syncLocationCoverage(args: {
  previousName: string | null;
  name: string;
  chargerIds: string[];
  points: ChargingPoint[];
}): Promise<void> {
  const name = args.name.replace(/\s+/g, " ").trim();
  if (name.length < 2) throw new Error("Location name is required");
  if (!args.chargerIds.length && !args.previousName) {
    throw new Error("Choose at least one charger for this location");
  }

  const selected = new Set(args.chargerIds);
  const previous = args.previousName;
  const nameKey = areaKey(name);
  const previousKey = previous ? areaKey(previous) : "";
  const nameCanon = canonicalAreaKey(name);
  const previousCanon = previous ? canonicalAreaKey(previous) : "";
  const drop = new Set([nameKey, previousKey, nameCanon, previousCanon].filter(Boolean));
  const updates: Promise<ChargingPoint>[] = [];

  for (const point of args.points) {
    const current = point.service_areas ?? [];
    let next = flattenAreas(current).map((area) => (
      previousKey && (areaKey(area) === previousKey || canonicalAreaKey(area) === previousCanon) ? name : area
    ));

    if (selected.has(point.id)) {
      if (!next.some((area) => areaKey(area) === nameKey || canonicalAreaKey(area) === nameCanon)) {
        next = [...next, name];
      }
    } else {
      next = next.filter((area) => !drop.has(areaKey(area)) && !drop.has(canonicalAreaKey(area)));
    }

    next = uniquePhrases(next);
    if (next.join("\0") === current.join("\0")) continue;
    updates.push(updateChargingPoint(point.id, { service_areas: next }));
  }

  await Promise.all(updates);
}
