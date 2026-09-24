import "server-only";
import { env } from "@/lib/env";
import type { Geo } from "@/types/schemas";

/**
 * Maps provider abstraction. Swap OpenStreetMap/Nominatim for Google (or
 * Mapbox…) by implementing `MapsProvider` — the rest of the app only sees Geo.
 */
export interface MapsProvider {
  readonly name: string;
  /** Resolve a place to coordinates. Returns null when unsure — never guesses. */
  geocode(query: string): Promise<Geo | null>;
  /** Minimum delay between calls (usage policy), in ms. */
  readonly minIntervalMs: number;
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

class NominatimProvider implements MapsProvider {
  readonly name = "openstreetmap";
  readonly minIntervalMs = 1100;

  async geocode(query: string): Promise<Geo | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(query)}`;
    const ua = `ouvatu/1.0 (${env.mapsContactEmail ?? "contact@ouvatu.app"})`;
    const rows = await fetchJson<{ lat: string; lon: string; display_name: string; importance?: number }[]>(url, {
      "user-agent": ua,
    });
    const top = rows?.[0];
    if (!top) return null;
    return { lat: Number(top.lat), lng: Number(top.lon), provider: this.name, label: top.display_name.slice(0, 300) };
  }
}

class GoogleGeocodingProvider implements MapsProvider {
  readonly name = "google";
  readonly minIntervalMs = 50;
  constructor(private readonly apiKey: string) {}

  async geocode(query: string): Promise<Geo | null> {
    const data = await fetchJson<{
      status: string;
      results: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[];
    }>(`https://maps.googleapis.com/maps/api/geocode/json?language=fr&address=${encodeURIComponent(query)}&key=${this.apiKey}`);
    const top = data?.status === "OK" ? data.results[0] : undefined;
    if (!top) return null;
    return {
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      provider: this.name,
      label: top.formatted_address.slice(0, 300),
    };
  }
}

/** Photon (komoot, OpenStreetMap data): free, no key, tolerant of server traffic. */
class PhotonProvider implements MapsProvider {
  readonly name = "openstreetmap";
  readonly minIntervalMs = 250;

  async geocode(query: string): Promise<Geo | null> {
    const data = await fetchJson<{
      features?: { geometry: { coordinates: [number, number] }; properties: { name?: string; city?: string; country?: string } }[];
    }>(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(query)}`, { "user-agent": `ouvatu/1.0 (${env.mapsContactEmail ?? "contact@ouvatu.app"})` });
    const top = data?.features?.[0];
    if (!top) return null;
    const [lng, lat] = top.geometry.coordinates;
    const label = [top.properties.name, top.properties.city, top.properties.country].filter(Boolean).join(", ");
    return { lat, lng, provider: this.name, label: label.slice(0, 300) || query.slice(0, 300) };
  }
}

/**
 * Tries each provider in turn (Google if configured, then Photon, then
 * Nominatim): the free OSM services sometimes refuse traffic from hosting IPs.
 */
class ChainProvider implements MapsProvider {
  readonly name: string;
  readonly minIntervalMs: number;
  constructor(private readonly providers: MapsProvider[]) {
    this.name = providers[0].name;
    // Pace on the first provider; the fallbacks are only hit occasionally.
    this.minIntervalMs = providers[0].minIntervalMs;
  }

  async geocode(query: string): Promise<Geo | null> {
    for (const provider of this.providers) {
      const geo = await provider.geocode(query).catch(() => null);
      if (geo) return geo;
    }
    return null;
  }
}

export function getMapsProvider(): MapsProvider | null {
  if (env.mapsProvider === "none") return null;
  const chain: MapsProvider[] = [];
  if (env.mapsApiKey && env.mapsProvider === "google") chain.push(new GoogleGeocodingProvider(env.mapsApiKey));
  chain.push(new PhotonProvider(), new NominatimProvider());
  return new ChainProvider(chain);
}
