import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { LOCAL_AI_KEY } from "./secrets.local.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

const AVG_SPEED_KMPH = 25;
const MAX_RADIUS_KM = 25;
const MAX_RESULTS = 3;
const GEOCODE_SANITY_KM = 150;
const EARTH_RADIUS_KM = 6371;

type Station = {
  id: string;
  name: string;
  spokenName: string;
  address: string;
  shortAddress: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  powerKw: number | null;
  connectors: string | null;
  operator: string | null;
  access: string | null;
  siteKey: string;
  siteSectors: string[];
  sitePhrases: string[];
  serviceAreas: string[];
  active: boolean;
};

const ABBREVIATIONS = new Map(Object.entries({
  sec: "sector",
  sect: "sector",
  ngr: "nagar",
  rd: "road",
  gzb: "ghaziabad",
  gurgaon: "gurugram",
}));

const STOP_WORDS = new Set([
  "i", "am", "at", "in", "on", "the", "a", "an", "is", "my", "me", "near", "nearby",
  "currently", "right", "now", "here", "around", "close", "to", "from", "of", "and",
  "where", "what", "which", "nearest", "closest", "please", "tell", "need", "want",
  "main", "hoon", "hu", "hun", "mein", "ke", "ki", "ka", "paas", "pas", "pass",
  "se", "par", "pe", "hai", "abhi", "yahan", "raha", "rha", "tha",
  "kahan", "kaha", "kya", "batao", "bata", "chahiye", "milega",
  "nazdeek", "nazdik", "sabse", "koi", "bhai", "yaar", "ji", "haan", "han",
  "sir", "hello", "hi", "ok", "okay", "toh", "to",
  "charging", "charger", "chargers", "station", "point", "ev",
]);

const QUERY_CITIES: Array<[string, string]> = [
  ["greater noida", "greater noida"],
  ["new delhi", "delhi"],
  ["dwarka", "dwarka"],
  ["rohini", "rohini"],
  ["gurugram", "gurugram"],
  ["gurgaon", "gurugram"],
  ["faridabad", "faridabad"],
  ["ghaziabad", "ghaziabad"],
  ["noida", "noida"],
  ["delhi", "delhi"],
  ["hapur", "hapur"],
];

const CITY_PINS: Record<string, { latitude: number; longitude: number; label: string }> = {
  delhi: { latitude: 28.6139, longitude: 77.209, label: "New Delhi" },
  noida: { latitude: 28.5355, longitude: 77.391, label: "Noida" },
  "greater noida": { latitude: 28.4744, longitude: 77.504, label: "Greater Noida" },
  gurugram: { latitude: 28.4595, longitude: 77.0266, label: "Gurugram, Haryana" },
  faridabad: { latitude: 28.4089, longitude: 77.3178, label: "Faridabad" },
  ghaziabad: { latitude: 28.6692, longitude: 77.4538, label: "Ghaziabad" },
  hapur: { latitude: 28.7306, longitude: 77.7758, label: "Hapur" },
};

const CITY_PIN_NOISE = new Set([
  "haryana", "delhi", "uttar", "pradesh", "up", "india", "ncr", "new", "city",
]);

function cityPin(text: string) {
  const query = parseLocationQuery(text);
  if (!query.city || query.sectors.length) return null;
  const leftover = expandAbbreviations(query.phrase).split(" ").filter((word) => (
    word
    && !STOP_WORDS.has(word)
    && word !== query.city
    && !query.city!.split(" ").includes(word)
    && !CITY_PIN_NOISE.has(word)
    && !QUERY_CITIES.some(([needle]) => needle.split(" ").includes(word))
  ));
  if (leftover.length) return null;
  const pin = CITY_PINS[query.city];
  if (!pin) return null;
  return { ...pin, source: "city-pin" };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalize(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandAbbreviations(value: unknown) {
  return normalize(value)
    .split(" ")
    .map((word) => ABBREVIATIONS.get(word) || word)
    .join(" ")
    .trim();
}

function extractLocationPhrase(value: string) {
  const expanded = expandAbbreviations(value);
  if (!expanded) return "";
  const kept = expanded.split(" ").filter((word) => !STOP_WORDS.has(word));
  return (kept.length ? kept.join(" ") : expanded).trim();
}

function locationPhrases(value: string) {
  return [...new Set([extractLocationPhrase(value), expandAbbreviations(value)].filter(Boolean))];
}

function tokenKey(value: string) {
  return expandAbbreviations(value).split(" ").filter(Boolean).sort().join(" ");
}

function extractSectorNumbers(value: string) {
  const nums: string[] = [];
  const text = expandAbbreviations(value);
  const re = /(?:\b(?:sector|sec)\s+|सेक्टर\s+)(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) nums.push(match[1]);
  return [...new Set(nums)];
}

function inferQueryCity(value: string) {
  const hay = expandAbbreviations(value);
  for (const [needle, city] of QUERY_CITIES) {
    if (hay.includes(needle)) return city;
  }
  return null;
}

function parseLocationQuery(spoken: string) {
  const phrase = extractLocationPhrase(spoken) || expandAbbreviations(spoken);
  return { phrase, sectors: extractSectorNumbers(phrase), city: inferQueryCity(phrase) };
}

function sectorsAgree(queryText: string, labelledText: string) {
  const wanted = extractSectorNumbers(queryText);
  if (!wanted.length) return true;
  const found = extractSectorNumbers(labelledText);
  if (!found.length) return false;
  return wanted.every((sector) => found.includes(sector));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isLocated(station: Station) {
  return station.latitude !== null && station.longitude !== null;
}

function cityMatches(station: Station, city: string | null) {
  if (!city) return true;
  const hay = normalize(`${station.city} ${station.address} ${station.name} ${station.state}`);
  if (city === "delhi") return hay.includes("delhi") || hay.includes("dwarka") || hay.includes("rohini");
  if (city === "dwarka") return hay.includes("dwarka");
  if (city === "rohini") return hay.includes("rohini");
  if (city === "noida") return hay.includes("noida") && !hay.includes("greater noida");
  if (city === "greater noida") return hay.includes("greater noida");
  return hay.includes(city);
}

function stationsAtSector(stations: Station[], query: { sectors: string[]; city: string | null }) {
  if (!query.sectors.length) return [];
  return stations.filter((station) =>
    query.sectors.every((sector) => station.siteSectors.includes(sector))
    && cityMatches(station, query.city)
  );
}

function buildSiteIndex(stations: Station[]) {
  const index = new Map<string, { label: string; stations: Station[] }>();
  const tokenIndex = new Map<string, { label: string; stations: Station[] }>();
  for (const station of stations) {
    for (const phrase of station.sitePhrases) {
      const key = expandAbbreviations(phrase);
      if (!key) continue;
      if (!index.has(key)) index.set(key, { label: phrase, stations: [] });
      const entry = index.get(key)!;
      if (!entry.stations.includes(station)) entry.stations.push(station);
      tokenIndex.set(tokenKey(phrase), entry);
    }
  }
  return { index, tokenIndex };
}

function lookupServiceArea(stations: Station[], spoken: string) {
  const query = parseLocationQuery(spoken);
  for (const phrase of locationPhrases(spoken)) {
    const key = expandAbbreviations(phrase);
    const tok = tokenKey(phrase);
    if (!key) continue;
    const hits = stations.filter((station) =>
      (station.serviceAreas || []).some((area) => {
        const areaKey = expandAbbreviations(area);
        if (areaKey !== key && tokenKey(area) !== tok) return false;
        if (query.sectors.length && !query.sectors.every((sector) => extractSectorNumbers(area).includes(sector))) {
          return false;
        }
        return true;
      })
    );
    if (hits.length) return { label: phrase, stations: hits, matchType: "service-area" };
  }
  return null;
}

async function interpretPlaceWithAI(spoken: string): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("AI_API_KEY") || LOCAL_AI_KEY || "";
  if (!apiKey) {
    console.warn("nearest-charger: no OPENAI_API_KEY / AI_API_KEY, skipping AI mid-layer");
    return null;
  }

  const groq = apiKey.startsWith("gsk_");
  const baseUrl = (Deno.env.get("OPENAI_BASE_URL")
    || (groq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1")).replace(/\/$/, "");
  const model = Deno.env.get("OPENAI_MODEL")
    || (groq ? "openai/gpt-oss-20b" : "gpt-4o-mini");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "The driver named a place in India (often Delhi NCR). It is NOT in our charger sheet.",
            "Turn it into one clean geocodable place name. Fix spelling, expand Hindi, add the city.",
            "Examples: 'rajouri' -> 'Rajouri Garden, New Delhi'; 'sec 18 noida ke paas' -> 'Noida Sector 18, Uttar Pradesh'; 'gurgaon' -> 'Gurugram, Haryana'.",
            "Gurgaon/Gurugram is in Haryana, not Delhi. Do not pick a charging station. Do not invent a charger.",
            "If you cannot tell where they are, return {\"place\": null}.",
            "Return JSON only: {\"place\": string|null}",
          ].join("\n"),
        },
        { role: "user", content: spoken },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    console.error("AI mid-layer HTTP", response.status, await response.text());
    return null;
  }

  const body = await response.json();
  const raw = body?.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const place = typeof parsed.place === "string" ? parsed.place.trim() : "";
    return place || null;
  } catch {
    return null;
  }
}

function lookupSite(stations: Station[], spoken: string) {
  const { index, tokenIndex } = buildSiteIndex(stations);
  const query = parseLocationQuery(spoken);
  for (const phrase of locationPhrases(spoken)) {
    const key = expandAbbreviations(phrase);
    const hit = index.get(key) || tokenIndex.get(tokenKey(phrase));
    if (!hit) continue;
    if (!sectorsAgree(key, hit.label)) continue;
    if (query.sectors.length) {
      const atSector = stationsAtSector(hit.stations, query);
      if (!atSector.length) continue;
      return { label: hit.label, stations: atSector, matchType: "site" };
    }
    return { label: hit.label, stations: hit.stations, matchType: "site" };
  }
  return null;
}

function computeBounds(stations: Station[]) {
  const located = stations.filter(isLocated);
  if (!located.length) return null;
  const lats = located.map((s) => s.latitude!);
  const lngs = located.map((s) => s.longitude!);
  const pad = 0.75;
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.min(90, Math.max(...lats) + pad),
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.min(180, Math.max(...lngs) + pad),
  };
}

async function geocodeNominatim(query: string, bounds: ReturnType<typeof computeBounds>) {
  const q = String(query || "").trim();
  if (!q) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");
  if (bounds) {
    url.searchParams.set("viewbox", `${bounds.minLng},${bounds.maxLat},${bounds.maxLng},${bounds.minLat}`);
  }
  const response = await fetch(url, {
    headers: { "User-Agent": "school-cab-nearest-charger/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const body = await response.json();
  if (!Array.isArray(body) || !body.length) return null;
  return {
    latitude: Number(body[0].lat),
    longitude: Number(body[0].lon),
    label: String(body[0].display_name || q),
    source: "nominatim",
  };
}

async function geocodePhoton(query: string) {
  const q = String(query || "").trim();
  if (!q) return null;
  const biased = /india|delhi|noida|gurugram|gurgaon|ghaziabad|faridabad/i.test(q)
    ? q
    : `${q}, Delhi, India`;
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", biased);
  url.searchParams.set("limit", "3");
  url.searchParams.set("lang", "en");
  const response = await fetch(url, {
    headers: { "User-Agent": "school-cab-nearest-charger/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const body = await response.json();
  const features = Array.isArray(body?.features) ? body.features : [];
  for (const feature of features) {
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const latitude = Number(coords[1]);
    const longitude = Number(coords[0]);
    if (latitude < 26 || latitude > 32 || longitude < 74 || longitude > 81) continue;
    const props = feature?.properties || {};
    const label = [props.name, props.city || props.district, props.state, props.country]
      .filter(Boolean)
      .join(", ") || q;
    return { latitude, longitude, label, source: "photon" };
  }
  return null;
}

async function geocode(query: string, bounds: ReturnType<typeof computeBounds>) {
  return await geocodeNominatim(query, bounds) || await geocodePhoton(query);
}

async function resolveOrigin(spoken: string, stations: Station[]) {
  const bounds = computeBounds(stations);
  const phrase = extractLocationPhrase(spoken) || spoken;
  const pin = cityPin(spoken);
  const candidates = [...new Set([spoken, phrase, ...locationPhrases(spoken)].filter(Boolean))];
  let geocoded = pin;
  if (!geocoded) {
    for (const candidate of candidates) {
      geocoded = await geocode(candidate, bounds);
      if (geocoded) break;
    }
  }
  if (!geocoded) return null;
  const located = stations.filter(isLocated);
  const nearest = located.length
    ? Math.min(...located.map((station) => haversineKm(geocoded!, station as { latitude: number; longitude: number })))
    : Infinity;
  return {
    ...geocoded,
    spoken,
    query: phrase,
    farFromNetwork: nearest > GEOCODE_SANITY_KM,
    nearestStationKm: nearest,
  };
}

function spokenDistance(km: number) {
  if (km < 1) {
    const metres = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${metres} metres`;
  }
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${rounded} kilometre${rounded === 1 ? "" : "s"}`;
}

function placeOf(station: { name: string; city?: string | null }) {
  return [station.name, station.city].filter(Boolean).join(", ");
}

function buildReply(result: {
  stations: Array<{ name: string; city?: string | null; address?: string | null; distanceKm: number | null; etaMinutes?: number | null; chargersAtSite?: number; powerKw?: number | null; connectors?: string | null }>;
  atRequestedSite: boolean;
}) {
  if (!result.stations.length) {
    if (result.atRequestedSite === false) {
      return "Aapke current location par hamari list mein koi charging point nahi hai.";
    }
    return "Mujhe aapki location samajh nahi aayi. Kripya apna area ya nazdeeki landmark bataiye.";
  }
  const best = result.stations[0];
  const place = placeOf(best);
  const address = best.address ? `, ${best.address}` : "";
  const dist = best.distanceKm == null ? "" : `, jo takriban ${spokenDistance(best.distanceKm)} door hai`;

  if (!result.atRequestedSite) {
    return `Aapke current location par hamari list mein koi charging point nahi hai. Sabse nazdeek charging point ${place}${address} par hai${dist}. Kripya ${place} chale jaiye.`;
  }
  if (best.distanceKm === null) {
    return `Aapke sabse nazdeek charging point hai ${place}${best.address ? `, at ${best.address}` : ""}. Aap wahin chale jaiye.`;
  }
  const detail = (best.chargersAtSite || 1) > 1
    ? ` Wahan ${best.chargersAtSite} charger lage hain${best.powerKw ? `, ${best.powerKw} kilowatt tak` : ""}.`
    : best.powerKw
      ? ` Wahan ${best.connectors ? `${best.connectors}, ` : ""}${best.powerKw} kilowatt charger hai.`
      : "";
  return `Aapke sabse nazdeek charging point hai ${place}${address}, jo takriban ${spokenDistance(best.distanceKm)} door hai aur wahan pahunchne mein lagbhag ${best.etaMinutes} minute lagenge.${detail} Aap wahin chale jaiye.`;
}

function groupByLocation(entries: Array<{ station: Station; distanceKm: number | null }>) {
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.station.siteKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return [...groups.values()].map((group) => {
    const best = group.reduce((a, b) => ((b.station.powerKw ?? 0) - (a.station.powerKw ?? 0) > 0 ? b : a));
    const powers = [...new Set(group.map((e) => e.station.powerKw).filter((n): n is number => Boolean(n)))].sort((a, b) => b - a);
    return {
      station: best.station,
      distanceKm: best.distanceKm,
      chargerCount: group.length,
      maxPowerKw: powers[0] ?? null,
    };
  });
}

function toResult(group: { station: Station; distanceKm: number | null; chargerCount: number; maxPowerKw: number | null }, index: number, atRequestedSite: boolean) {
  const { station, distanceKm } = group;
  return {
    rank: index + 1,
    name: station.spokenName,
    fullName: station.name,
    address: station.shortAddress || station.address,
    city: station.city,
    powerKw: group.maxPowerKw ?? station.powerKw,
    connectors: station.connectors,
    chargersAtSite: group.chargerCount,
    latitude: station.latitude,
    longitude: station.longitude,
    distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
    etaMinutes: distanceKm === null ? null : Math.max(1, Math.round((distanceKm / AVG_SPEED_KMPH) * 60)),
    atRequestedSite,
  };
}

function firstString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function flattenPayload(input: unknown) {
  const layers: Record<string, unknown>[] = [];
  const queue = [input];
  const seen = new Set<unknown>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    layers.push(current as Record<string, unknown>);
    for (const key of ["parameters", "params", "arguments", "args", "input", "data", "payload"]) {
      const value = (current as Record<string, unknown>)[key];
      if (!value) continue;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object") queue.push(parsed);
        } catch { /* ignore */ }
      } else if (typeof value === "object") {
        queue.push(value);
      }
    }
  }
  return Object.assign({}, ...layers);
}

async function loadStations() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase
    .from("ev_charging_points")
    .select("*")
    .eq("active", true);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.source_id || row.id,
    name: row.name,
    spokenName: row.spoken_name,
    address: row.address || "",
    shortAddress: row.short_address || row.address || "",
    city: row.city,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    powerKw: row.power_kw,
    connectors: row.connectors,
    operator: row.operator,
    access: row.access,
    siteKey: row.site_key,
    siteSectors: row.site_sectors || [],
    sitePhrases: row.site_phrases || [],
    serviceAreas: row.service_areas || [],
    active: row.active,
  })) as Station[];
}

async function findChargingPoints(stations: Station[], { location, latitude, longitude }: {
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const spoken = String(location || "").trim();
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const query = spoken ? parseLocationQuery(spoken) : { phrase: "", sectors: [] as string[], city: null as string | null };

  let origin = null as Awaited<ReturnType<typeof resolveOrigin>> | { latitude: number; longitude: number; label: string; source: string } | null;
  let matchedSite = null as { label: string; stations: Station[]; matchType: string } | null;
  let atRequestedSite = hasCoordinates;
  let usedAI = false;
  let resolvedVia = "sheet";
  let candidates = stations;

  if (hasCoordinates) {
    origin = { latitude: latitude!, longitude: longitude!, label: "your shared location", source: "coordinates" };
    if (spoken && query.sectors.length) {
      const atSector = stationsAtSector(stations, query);
      if (atSector.length) {
        matchedSite = { label: `sector ${query.sectors.join("/")}`, stations: atSector, matchType: "site-sector" };
        atRequestedSite = true;
        candidates = atSector;
      } else {
        atRequestedSite = false;
      }
    }
  } else if (spoken) {
    matchedSite = lookupSite(stations, spoken);
    if (matchedSite && query.sectors.length) {
      const atSector = stationsAtSector(matchedSite.stations, query);
      matchedSite = atSector.length ? { ...matchedSite, stations: atSector } : null;
    }
    if (!matchedSite && query.sectors.length) {
      const atSector = stationsAtSector(stations, query);
      if (atSector.length) {
        matchedSite = {
          label: query.city ? `${query.city} sector ${query.sectors.join("/")}` : `sector ${query.sectors.join("/")}`,
          stations: atSector,
          matchType: "site-sector",
        };
      }
    }
    if (!matchedSite) {
      const served = lookupServiceArea(stations, spoken);
      if (served) matchedSite = served;
    }

    // Sheet hit = physical site or an exact Appropriate Locations phrase. Nothing else.
    if (matchedSite) {
      atRequestedSite = matchedSite.matchType !== "service-area";
      candidates = matchedSite.stations;
      resolvedVia = matchedSite.matchType === "service-area" ? "sheet-catchment" : "sheet";
      origin = await resolveOrigin(spoken, stations);
    } else {
      // Not in the sheet: AI only resolves the place. We then pick the
      // nearest charger from the sheet by distance.
      atRequestedSite = false;
      candidates = stations;
      const aiPlace = await interpretPlaceWithAI(spoken).catch((error) => {
        console.error("AI mid-layer failed", error);
        return null;
      });
      usedAI = Boolean(aiPlace);
      resolvedVia = usedAI ? "ai" : "geocode";
      origin = await resolveOrigin(aiPlace || spoken, stations);
      if (origin && usedAI) (origin as { label: string }).label = aiPlace || origin.label;
    }
  }

  if (!origin && matchedSite) {
    const pin = matchedSite.stations.find(isLocated);
    if (pin) {
      origin = {
        latitude: pin.latitude!,
        longitude: pin.longitude!,
        label: pin.spokenName,
        source: "matched-site",
      };
    }
  } else if (!origin && query.city) {
    const pool = stations.filter((station) => cityMatches(station, query.city) && isLocated(station));
    if (pool.length) {
      origin = {
        latitude: pool.reduce((sum, station) => sum + station.latitude!, 0) / pool.length,
        longitude: pool.reduce((sum, station) => sum + station.longitude!, 0) / pool.length,
        label: query.city,
        source: "city-centroid",
      };
    }
  }

  if (!origin && !matchedSite) {
    return {
      origin: null,
      atRequestedSite: false,
      usedAI,
      resolvedVia,
      stations: [],
      reason: query.sectors.length ? "no_charger_at_locality" : "location_unresolved",
    };
  }

  if (!matchedSite && (origin as { farFromNetwork?: boolean } | null)?.farFromNetwork) {
    return { origin, atRequestedSite: false, usedAI, resolvedVia, stations: [], reason: "out_of_coverage" };
  }

  let entries = candidates.filter((s) => s.active).map((station) => ({
    station,
    distanceKm: origin && isLocated(station)
      ? haversineKm(origin as { latitude: number; longitude: number }, station as { latitude: number; longitude: number })
      : null,
  }));

  entries.sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return (b.station.powerKw ?? 0) - (a.station.powerKw ?? 0);
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  if (!atRequestedSite) {
    const within = entries.filter((entry) => entry.distanceKm !== null && entry.distanceKm <= MAX_RADIUS_KM);
    entries = within.length ? within : [];
  }

  const grouped = groupByLocation(entries).slice(0, atRequestedSite ? MAX_RESULTS : 1);
  return {
    origin,
    atRequestedSite,
    usedAI,
    resolvedVia,
    stations: grouped.map((group, index) => toResult(group, index, atRequestedSite)),
    reason: grouped.length ? null : (atRequestedSite ? "no_charger_matched_filters" : "no_charger_at_locality"),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expectedKey = Deno.env.get("CHARGER_API_KEY") || Deno.env.get("API_KEY") || "sc-charger-try-2026";
  const provided = req.headers.get("x-api-key") || new URL(req.url).searchParams.get("key") || "";
  if (expectedKey && provided !== expectedKey) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  try {
    const raw = req.method === "GET" ? Object.fromEntries(new URL(req.url).searchParams) : await req.json().catch(() => ({}));
    const payload = flattenPayload(raw);
    const location = firstString(payload, [
      "location", "place", "area", "address", "query", "text",
      "user_location", "driver_location", "current_location", "locality", "landmark", "city",
    ]);
    const latitude = Number(payload.latitude ?? payload.lat);
    const longitude = Number(payload.longitude ?? payload.lng ?? payload.lon);

    const stations = await loadStations();
    const result = await findChargingPoints(stations, {
      location,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    });

    if (!result.stations.length) {
      const unresolved = result.reason === "location_unresolved";
      return json({
        ok: false,
        reason: result.reason,
        speech: unresolved
          ? "Mujhe aapki location samajh nahi aayi. Kripya apna area ya nazdeeki landmark bataiye."
          : buildReply({ stations: [], atRequestedSite: false }),
        stations: [],
      });
    }

    const speech = buildReply(result);
    const destination = {
      name: result.stations[0].name,
      address: result.stations[0].address,
      distanceKm: result.stations[0].distanceKm,
    };

    const body: Record<string, unknown> = {
      ok: true,
      instruction: "Read the speech field to the caller word for word. Do not paraphrase. The only destination is send_driver_to. Do not name any other sector.",
      speech,
      send_driver_to: destination,
      chargerAtRequestedPlace: result.atRequestedSite,
      resolvedVia: result.resolvedVia,
    };

    if (result.atRequestedSite) {
      body.stations = result.stations;
      body.count = result.stations.length;
    } else {
      body.origin = null;
      body.stations = [destination];
      body.count = 1;
    }

    return json(body);
  } catch (error) {
    console.error("nearest-charger failed", error);
    return json({
      ok: false,
      error: "internal_error",
      speech: "Sorry, I am unable to check charging points right now. Please try again in a moment.",
    }, 500);
  }
});
