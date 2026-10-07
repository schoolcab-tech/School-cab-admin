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
  updatedAt: string | null;
  active: boolean;
};

const ABBREVIATIONS = new Map(Object.entries({
  sec: "sector",
  sect: "sector",
  ngr: "nagar",
  rd: "road",
  gzb: "ghaziabad",
  gurgaon: "gurugram",
  gurugaon: "gurugram",
  ggn: "gurugram",
  laxmi: "lakshmi",
  laksmi: "lakshmi",
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
  let text = normalize(value)
    .split(" ")
    .map((word) => ABBREVIATIONS.get(word) || word)
    .join(" ")
    .trim();
  if (!/\b(uttara|bangalore|bengaluru|karnataka)\b/.test(text)) {
    text = text.replace(/\buttar nagar\b/g, "uttam nagar");
  }
  return text;
}

const OUTSIDE_NETWORK = [
  "bangalore", "bengaluru", "bengalooru", "karnataka",
  "mumbai", "pune", "hyderabad", "chennai", "kolkata", "ahmedabad",
  "jaipur", "lucknow", "chandigarh", "kochi", "goa",
];

function mentionsOutsideNetwork(value: string) {
  const hay = normalize(value);
  if (OUTSIDE_NETWORK.some((city) => hay.includes(city))) return true;
  if (/\buttara\b/.test(hay) && !/\b(delhi|noida|dwarka|uttam)\b/.test(hay)) return true;
  return false;
}

function inNetworkBox(point: { latitude: number; longitude: number }) {
  return point.latitude >= 27.85 && point.latitude <= 29.70
    && point.longitude >= 76.50 && point.longitude <= 78.20;
}

const OUT_OF_COVERAGE_SPEECH =
  "Hamare charging points sirf Delhi NCR mein hain. Is shehar ya area mein hamari list par koi charger nahi hai.";

function editDistance(a: string, b: string) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

function extractLocationPhrase(value: string) {
  const expanded = expandAbbreviations(value);
  if (!expanded) return "";
  const kept = expanded.split(" ").filter((word) => !STOP_WORDS.has(word));
  return (kept.length ? kept.join(" ") : expanded).trim();
}

function locationPhrases(value: string) {
  const extracted = extractLocationPhrase(value);
  const expanded = expandAbbreviations(value);
  const stripped = extracted.split(" ").filter((word) => (
    word
    && !CITY_PIN_NOISE.has(word)
    && !QUERY_CITIES.some(([needle, city]) => needle.split(" ").includes(word) || city.split(" ").includes(word))
  )).join(" ");
  return [...new Set([extracted, expanded, stripped].filter(Boolean))];
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
  const hay = expandAbbreviations(`${station.city} ${station.address} ${station.name} ${station.state}`);
  if (city === "delhi") return hay.includes("delhi") || hay.includes("dwarka") || hay.includes("rohini");
  if (city === "dwarka") return hay.includes("dwarka");
  if (city === "rohini") return hay.includes("rohini");
  if (city === "noida") return hay.includes("noida") && !hay.includes("greater noida");
  if (city === "greater noida") return hay.includes("greater noida");
  if (city === "gurugram") return hay.includes("gurugram");
  return hay.includes(city);
}

function flattenListedAreas(areas: string[] | null | undefined) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const area of areas || []) {
    for (const part of String(area).split(/[,;\n]+/)) {
      const cleaned = part.replace(/\s+/g, " ").trim();
      const key = expandAbbreviations(cleaned);
      if (cleaned.length < 2 || seen.has(key)) continue;
      seen.add(key);
      out.push(cleaned);
    }
  }
  return out;
}

function isCityishToken(token: string) {
  return QUERY_CITIES.some(([needle, city]) => needle.split(" ").includes(token) || city.split(" ").includes(token));
}

const GENERIC_AREA_TOKENS = new Set([
  "nagar", "vihar", "sector", "road", "enclave", "park", "colony", "extension",
  "town", "city", "village", "block", "phase", "market", "chowk",
]);

function distinctiveTokens(value: string) {
  return expandAbbreviations(value).split(" ").filter((token) => (
    token.length >= 5
    && token !== "sector"
    && !GENERIC_AREA_TOKENS.has(token)
    && !/^\d+$/.test(token)
    && !isCityishToken(token)
  ));
}

function areaCoversQuery(queryKey: string, area: string) {
  const keys = areaMatchKeys(area);
  const tok = tokenKey(queryKey);
  if (keys.has(queryKey) || keys.has(tok)) return true;
  const queryTokens = distinctiveTokens(queryKey);
  if (!queryTokens.length) return false;
  for (const alias of areaAliases(area)) {
    const areaKey = expandAbbreviations(alias);
    const areaTokens = distinctiveTokens(areaKey);
    if (!areaTokens.length) continue;
    if (queryTokens.every((token) => areaKey.split(" ").includes(token))) return true;
    if (areaTokens.every((token) => queryKey.split(" ").includes(token))) return true;
  }
  return false;
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

function areaAliases(area: string) {
  const aliases = new Set<string>();
  const add = (value: string) => {
    const cleaned = String(value || "").replace(/\s+/g, " ").trim();
    if (cleaned.length > 1) aliases.add(cleaned);
  };
  add(area);
  const withoutBrackets = area.replace(/\([^)]*\)/g, " ");
  add(withoutBrackets);
  add(withoutBrackets.replace(/\b(city|town|village|district)\b/gi, " "));
  for (const inner of area.match(/\(([^)]*)\)/g) || []) {
    const text = inner.slice(1, -1);
    if (inferQueryCity(text)) continue;
    add(text);
  }
  return [...aliases];
}

function areaMatchKeys(area: string) {
  const keys = new Set<string>();
  for (const alias of areaAliases(area)) {
    const expanded = expandAbbreviations(alias);
    if (expanded) keys.add(expanded);
    keys.add(tokenKey(alias));
  }
  return keys;
}

function areaHasRequestedSectors(area: string, sectors: string[]) {
  if (!sectors.length) return true;
  const found = extractSectorNumbers(area);
  return sectors.every((sector) => found.includes(sector));
}

function preferAdminMapping(hits: Station[]) {
  if (hits.length <= 1) return hits;
  const ranked = hits.map((station) => ({
    station,
    areas: flattenListedAreas(station.serviceAreas).length,
    updatedAt: Date.parse(station.updatedAt || "") || 0,
  }));
  const newest = Math.max(...ranked.map((row) => row.updatedAt));
  const recent = ranked.filter((row) => newest - row.updatedAt <= 15_000);
  if (recent.length === 1 && recent[0].areas <= 5) return [recent[0].station];
  return hits;
}

function lookupServiceArea(stations: Station[], spoken: string) {
  const query = parseLocationQuery(spoken);
  for (const phrase of locationPhrases(spoken)) {
    const key = expandAbbreviations(phrase);
    if (!key) continue;
    const hits = preferAdminMapping(stations.filter((station) =>
      flattenListedAreas(station.serviceAreas).some((area) => {
        if (!areaCoversQuery(key, area)) return false;
        return areaHasRequestedSectors(area, query.sectors);
      })
    ));
    if (hits.length) return { label: phrase, stations: hits, matchType: "service-area" as const };
  }

  const queryKey = expandAbbreviations(extractLocationPhrase(spoken));
  if (queryKey.length >= 6 && !extractSectorNumbers(queryKey).length) {
    const fuzzyHits = stations.filter((station) =>
      flattenListedAreas(station.serviceAreas).some((area) =>
        areaAliases(area).some((alias) => {
          const areaKey = expandAbbreviations(alias);
          if (!areaKey || extractSectorNumbers(areaKey).length) return false;
          const distance = editDistance(queryKey, areaKey);
          if (distance === 1 && Math.abs(areaKey.length - queryKey.length) <= 1) return true;
          return distance === 2 && queryKey.length >= 6 && areaKey.slice(0, 3) === queryKey.slice(0, 3);
        })
      )
    );
    const mappedFuzzy = preferAdminMapping(fuzzyHits);
    if (mappedFuzzy.length) return { label: queryKey, stations: mappedFuzzy, matchType: "service-area" as const };
  }
  return null;
}

function lookupSiteLoose(stations: Station[], spoken: string) {
  const key = expandAbbreviations(extractLocationPhrase(spoken));
  if (!key || key.length < 5) return null;
  if (QUERY_CITIES.some(([needle, city]) => key === needle || key === city)) return null;
  const hits = stations.filter((station) => {
    const hay = ` ${expandAbbreviations(`${station.spokenName} ${station.name} ${station.address}`)} `;
    return hay.includes(` ${key} `);
  });
  if (!hits.length) return null;
  return { label: key, stations: hits, matchType: "site" as const };
}

function isCityOnlyQuery(spoken: string) {
  return Boolean(cityPin(spoken));
}

function lookupListed(stations: Station[], spoken: string) {
  const query = parseLocationQuery(spoken);
  const mapped = lookupServiceArea(stations, spoken);
  if (mapped) return mapped;
  if (isCityOnlyQuery(spoken)) return null;
  let matched = lookupSite(stations, spoken) as { label: string; stations: Station[]; matchType: string } | null;
  if (matched && query.sectors.length) {
    const atSector = stationsAtSector(matched.stations, query);
    matched = atSector.length ? { ...matched, stations: atSector } : null;
  }
  if (!matched && query.sectors.length) {
    const atSector = stationsAtSector(stations, query);
    if (atSector.length) {
      matched = {
        label: query.city ? `${query.city} sector ${query.sectors.join("/")}` : `sector ${query.sectors.join("/")}`,
        stations: atSector,
        matchType: "site-sector",
      };
    }
  }
  if (!matched) matched = lookupSiteLoose(stations, spoken);
  return matched;
}

function aiConfig() {
  const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("AI_API_KEY") || LOCAL_AI_KEY || "";
  const groq = apiKey.startsWith("gsk_");
  const baseUrl = (Deno.env.get("OPENAI_BASE_URL")
    || (groq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1")).replace(/\/$/, "");
  const model = Deno.env.get("OPENAI_MODEL")
    || (groq ? "openai/gpt-oss-20b" : "gpt-4o-mini");
  return { apiKey, baseUrl, model };
}

async function interpretPlace(spoken: string): Promise<string | null> {
  const { apiKey, baseUrl, model } = aiConfig();
  if (!apiKey) return null;
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
            "The driver named a place in India (often Delhi NCR).",
            "Turn it into one clean geocodable place name. Fix spelling, expand Hindi, add the city.",
            "Our chargers are only in Delhi NCR. If the driver named another city, keep that city.",
            "Examples: 'jnkpuri' -> 'Janakpuri, New Delhi'; 'uttar nagar' in Delhi -> 'Uttam Nagar, New Delhi'; 'uttara nagar' / 'indiranagar bangalore' -> 'Indiranagar, Bengaluru, Karnataka'.",
            "Never move Bangalore, Mumbai, or any non-NCR place to Delhi. Uttara Nagar is not Uttam Nagar. Indiranagar Bangalore is not Indirapuram.",
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
    console.error("AI place HTTP", response.status, await response.text());
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

async function pickNearestChargerId(spoken: string, place: string | null, stations: Station[]): Promise<string | null> {
  const { apiKey, baseUrl, model } = aiConfig();
  if (!apiKey) return null;
  const catalog = stations.filter(isLocated).map((station) => ({
    id: station.id,
    name: station.spokenName,
    address: station.shortAddress || station.address,
    city: station.city,
  }));
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
            "Pick the physically nearest charger to the driver's place.",
            "Use only an id from this list. Never invent a charger.",
            "Return JSON only: {\"charger_id\": string|null}",
            JSON.stringify(catalog),
          ].join("\n"),
        },
        { role: "user", content: JSON.stringify({ spoken, place }) },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    console.error("AI nearest HTTP", response.status, await response.text());
    return null;
  }
  const body = await response.json();
  const raw = body?.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const chargerId = typeof parsed.charger_id === "string" ? parsed.charger_id.trim() : "";
    return catalog.some((row) => row.id === chargerId) ? chargerId : null;
  } catch {
    return null;
  }
}

async function interpretUnlistedPlace(
  spoken: string,
  stations: Station[],
): Promise<{ place: string | null; chargerId: string | null }> {
  const { apiKey } = aiConfig();
  if (!apiKey) {
    console.warn("nearest-charger: no OPENAI_API_KEY / AI_API_KEY, skipping AI mid-layer");
    return { place: null, chargerId: null };
  }
  const place = await interpretPlace(spoken);
  return { place, chargerId: null };
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
  if (bounds && !mentionsOutsideNetwork(q)) {
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
  const biased = /india|delhi|noida|gurugram|gurgaon|ghaziabad|faridabad|bangalore|bengaluru|mumbai|hyderabad|chennai|kolkata|karnataka|haryana/i.test(q)
    ? q
    : `${q}, India`;
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
    if (latitude < 8 || latitude > 37 || longitude < 68 || longitude > 97) continue;
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
  const extra: string[] = [];
  const canonical = expandAbbreviations(spoken);
  for (const candidate of [...new Set([canonical, phrase, ...locationPhrases(spoken)].filter(Boolean))]) {
    extra.push(candidate);
    extra.push(candidate.replace(/\b(mall|market|metro|pacific|dlf|pvr|hotel)\b/gi, " ").replace(/\s+/g, " ").trim());
    for (const part of candidate.split(",")) {
      const piece = part.replace(/\s+/g, " ").trim();
      if (piece.length >= 5) extra.push(piece);
    }
  }
  const candidates = [...new Set(extra.filter(Boolean))];
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
    serviceAreas: flattenListedAreas(row.service_areas),
    updatedAt: row.updated_at || null,
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

  if (spoken && mentionsOutsideNetwork(spoken)) {
    return {
      origin: null,
      atRequestedSite: false,
      usedAI: false,
      resolvedVia: "out-of-network",
      stations: [],
      reason: "out_of_coverage",
    };
  }

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
    let placeForOrigin = spoken;
    matchedSite = lookupListed(stations, spoken);

    if (!matchedSite) {
      const ai = await interpretUnlistedPlace(spoken, stations).catch((error) => {
        console.error("AI mid-layer failed", error);
        return { place: null, chargerId: null };
      });
      usedAI = Boolean(ai.place || ai.chargerId);
      if (ai.place) placeForOrigin = ai.place;

      if (mentionsOutsideNetwork(placeForOrigin) || (ai.place && mentionsOutsideNetwork(ai.place))) {
        return {
          origin: null,
          atRequestedSite: false,
          usedAI: true,
          resolvedVia: "out-of-network",
          stations: [],
          reason: "out_of_coverage",
        };
      }

      if (ai.place) {
        matchedSite = lookupListed(stations, ai.place);
      }

      if (!matchedSite) {
        atRequestedSite = false;
        candidates = stations;
        resolvedVia = "ai";
        origin = await resolveOrigin(placeForOrigin, stations);
        if (origin && ai.place) (origin as { label: string }).label = ai.place;
        if (!origin) {
          const chargerId = ai.chargerId || await pickNearestChargerId(spoken, ai.place, stations);
          const picked = chargerId ? stations.find((station) => station.id === chargerId) : null;
          if (picked) {
            matchedSite = { label: ai.place || spoken, stations: [picked], matchType: "ai-nearest" };
            candidates = [picked];
            usedAI = true;
          }
        }
      }
    }

    if (matchedSite && matchedSite.matchType !== "ai-nearest") {
      atRequestedSite = matchedSite.matchType !== "service-area";
      candidates = matchedSite.stations;
      resolvedVia = matchedSite.matchType === "service-area" ? "sheet-catchment" : "sheet";
      origin = await resolveOrigin(matchedSite.label || placeForOrigin, stations);
      const originUnusable = !origin
        || Boolean((origin as { farFromNetwork?: boolean }).farFromNetwork)
        || !inNetworkBox(origin);
      if (originUnusable) {
        const pin = matchedSite.stations.find(isLocated);
        if (pin) {
          origin = {
            latitude: pin.latitude!,
            longitude: pin.longitude!,
            label: matchedSite.label || pin.spokenName,
            source: "admin-mapping",
          };
        }
      }
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

  if (!matchedSite && origin && ((origin as { farFromNetwork?: boolean }).farFromNetwork || !inNetworkBox(origin))) {
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

  if (!atRequestedSite && matchedSite && matchedSite.matchType !== "ai-nearest") {
    const within = entries.filter((entry) => entry.distanceKm !== null && entry.distanceKm <= MAX_RADIUS_KM);
    entries = within.length ? within : entries.slice(0, 1);
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
      const uncovered = result.reason === "out_of_coverage";
      return json({
        ok: false,
        reason: result.reason,
        speech: uncovered
          ? OUT_OF_COVERAGE_SPEECH
          : unresolved
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
