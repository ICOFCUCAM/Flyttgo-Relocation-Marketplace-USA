// ============================================================================
// FlyttGo — geocode-address Edge Function
// ============================================================================
//
// Resolves free-text addresses to { lat, lng } pairs. Called from
// src/components/DeliveryMap.tsx to plot pickup + delivery markers.
//
// Provider-agnostic with an env-var switch, mirroring route-distance:
//
//   • Nominatim (default)         — free, no API key. Bound by the OSM
//                                   foundation's usage policy: max 1
//                                   req/sec, mandatory User-Agent.
//                                   For production point GEOCODE_PROVIDER_URL
//                                   at a self-hosted Nominatim instance.
//
//   • Google Geocoding (optional) — set
//                                   GEOCODE_PROVIDER_KIND=google
//                                   GEOCODE_PROVIDER_KEY=<your-key>
//
//   • Mapbox Geocoding (optional) — set
//                                   GEOCODE_PROVIDER_KIND=mapbox
//                                   GEOCODE_PROVIDER_KEY=<your-key>
//
// REQUEST:
//   POST /functions/v1/geocode-address
//   { "addresses": ["123 Main St, NYC", "456 Oak Ave, LA"] }
//
// RESPONSE (200):
//   { "results": { "123 Main St, NYC": { "lat": 40.71, "lng": -74.00 }, ... },
//     "provider": "nominatim" }
//
// Addresses that fail to geocode are returned as null in the results map so
// the client can fall back to its city-name estimator.
// ============================================================================

// deno-lint-ignore-file no-explicit-any

const PROVIDER_KIND = (Deno.env.get("GEOCODE_PROVIDER_KIND") || "nominatim").toLowerCase();
const PROVIDER_URL  = Deno.env.get("GEOCODE_PROVIDER_URL");
const PROVIDER_KEY  = Deno.env.get("GEOCODE_PROVIDER_KEY");
const USER_AGENT    = Deno.env.get("GEOCODE_USER_AGENT") || "FlyttGo/1.0 (https://flyttgo.com)";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LatLng = { lat: number; lng: number };

async function geocodeNominatim(address: string): Promise<LatLng | null> {
  const base = PROVIDER_URL || "https://nominatim.openstreetmap.org";
  const url  = `${base}/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res  = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" } });
  if (!res.ok) return null;
  const data = await res.json() as Array<{ lat: string; lon: string }>;
  const hit  = data?.[0];
  if (!hit) return null;
  return { lat: Number(hit.lat), lng: Number(hit.lon) };
}

async function geocodeGoogle(address: string): Promise<LatLng | null> {
  if (!PROVIDER_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${PROVIDER_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: any = await res.json();
  const loc = data?.results?.[0]?.geometry?.location;
  if (!loc) return null;
  return { lat: Number(loc.lat), lng: Number(loc.lng) };
}

async function geocodeMapbox(address: string): Promise<LatLng | null> {
  if (!PROVIDER_KEY) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&access_token=${PROVIDER_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: any = await res.json();
  const center = data?.features?.[0]?.center;
  if (!Array.isArray(center) || center.length < 2) return null;
  return { lat: Number(center[1]), lng: Number(center[0]) };
}

async function geocodeOne(address: string): Promise<LatLng | null> {
  switch (PROVIDER_KIND) {
    case "google": return geocodeGoogle(address);
    case "mapbox": return geocodeMapbox(address);
    default:       return geocodeNominatim(address);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: { addresses?: string[] } = {};
  try { body = await req.json(); } catch { /* empty body → handled below */ }

  const addresses = Array.isArray(body.addresses) ? body.addresses : [];
  if (addresses.length === 0) {
    return new Response(JSON.stringify({ error: "addresses[] required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const results: Record<string, LatLng | null> = {};

  // Nominatim usage policy says ≤ 1 req/sec — serialize when using it.
  // For paid providers (google/mapbox) we can fan out in parallel.
  if (PROVIDER_KIND === "nominatim") {
    for (const addr of addresses) {
      results[addr] = await geocodeOne(addr);
      // Tiny gap so a burst of 5–10 stays under the policy.
      await new Promise((r) => setTimeout(r, 1100));
    }
  } else {
    const pairs = await Promise.all(addresses.map(async (a) => [a, await geocodeOne(a)] as const));
    for (const [a, r] of pairs) results[a] = r;
  }

  return new Response(JSON.stringify({ results, provider: PROVIDER_KIND }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
