import "server-only";
import { env } from "@/lib/env";
import { normalizeText } from "@/lib/utils";
import { getMapsProvider } from "@/services/maps";
import type { AnalysisResult, Place } from "@/types/schemas";

/**
 * Enrichment from legitimate public APIs only:
 *  - places → geocoding (OpenStreetMap Nominatim or Google)
 *  - books  → Open Library (free, public)
 *  - movies → TMDB (only when TMDB_API_KEY is configured)
 * Enrichment only fills empty fields and only when the match is confident.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, timeoutMs = 5000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "NOMA/1.0" } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function similar(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function geocodePlaces(places: Place[], fallbackCity: string | null, fallbackCountry: string | null): Promise<void> {
  const provider = getMapsProvider();
  if (!provider) return;
  let last = 0;
  for (const place of places.slice(0, 12)) {
    if (place.geo) continue;
    const city = place.city ?? fallbackCity;
    const country = place.country ?? fallbackCountry;
    // Without any location context a name alone is too ambiguous: skip rather than guess.
    if (!city && !country && !place.address) continue;
    const query = [place.name, place.address, city, country].filter(Boolean).join(", ");
    const wait = provider.minIntervalMs - (Date.now() - last);
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const geo = await provider.geocode(query);
    if (geo) place.geo = geo;
  }
}

async function enrichBooks(result: AnalysisResult): Promise<void> {
  if (result.structuredData.category !== "BOOKS") return;
  await Promise.all(
    result.structuredData.books.books.slice(0, 10).map(async (book) => {
      const q = new URLSearchParams({ title: book.title, limit: "1", fields: "title,author_name,first_publish_year,cover_i,subject" });
      if (book.author) q.set("author", book.author);
      const data = await getJson<{ docs?: { title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number; subject?: string[] }[] }>(
        `https://openlibrary.org/search.json?${q}`,
      );
      const doc = data?.docs?.[0];
      if (!doc || !similar(doc.title, book.title)) return;
      book.author ??= doc.author_name?.[0] ?? null;
      book.year ??= doc.first_publish_year ?? null;
      book.coverUrl ??= doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;
      if (book.genres.length === 0 && doc.subject) book.genres = doc.subject.slice(0, 3);
    }),
  );
}

async function enrichScreen(result: AnalysisResult): Promise<void> {
  const d = result.structuredData;
  if ((d.category !== "MOVIES" && d.category !== "SERIES") || !env.tmdbApiKey) return;
  await Promise.all(
    d.screen.titles.slice(0, 10).map(async (title) => {
      const type = title.kind === "series" ? "tv" : "movie";
      const q = new URLSearchParams({ api_key: env.tmdbApiKey!, query: title.title, language: "fr-FR" });
      if (title.year) q.set(type === "tv" ? "first_air_date_year" : "year", String(title.year));
      const data = await getJson<{
        results?: { id: number; title?: string; name?: string; overview?: string; poster_path?: string; release_date?: string; first_air_date?: string }[];
      }>(`https://api.themoviedb.org/3/search/${type}?${q}`);
      const hit = data?.results?.[0];
      const hitTitle = hit?.title ?? hit?.name;
      if (!hit || !hitTitle || !similar(hitTitle, title.title)) return;
      title.externalId = `tmdb:${type}:${hit.id}`;
      title.overview ??= hit.overview || null;
      title.posterUrl ??= hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null;
      const y = Number((hit.release_date ?? hit.first_air_date ?? "").slice(0, 4));
      title.year ??= Number.isFinite(y) && y > 1800 ? y : null;
    }),
  );
}

export async function enrichResult(result: AnalysisResult): Promise<AnalysisResult> {
  const enriched = structuredClone(result);
  const d = enriched.structuredData;
  const tasks: Promise<void>[] = [enrichBooks(enriched), enrichScreen(enriched)];
  if (d.category === "TRAVEL") tasks.push(geocodePlaces(d.travel.places, d.travel.destination ?? d.travel.cities[0] ?? null, d.travel.country));
  if (d.category === "PLACES") tasks.push(geocodePlaces(d.places.places, d.places.city, d.places.country));
  // Enrichment is best-effort: never let it fail or stall the analysis.
  await Promise.race([Promise.allSettled(tasks), sleep(25_000)]);
  return enriched;
}
