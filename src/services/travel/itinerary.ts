import type { Itinerary, ItineraryDay } from "@/types/domain";
import type { Place, PlaceKind } from "@/types/schemas";

/**
 * Simple multi-day itinerary:
 *  1. keep places with real coordinates (others go to "à placer")
 *  2. order them with a nearest-neighbour tour so consecutive stops are close
 *  3. cut the tour into N days, then assign realistic time slots, putting
 *     restaurants/cafés on meal slots when available.
 * Pure function — no invented places, times are suggestions.
 */

const FOOD: PlaceKind[] = ["restaurant", "cafe", "bar"];

function distanceKm(a: Place, b: Place): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.geo!.lat - a.geo!.lat);
  const dLng = toRad(b.geo!.lng - a.geo!.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.geo!.lat)) * Math.cos(toRad(b.geo!.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestNeighbourTour(indices: number[], places: Place[]): number[] {
  if (indices.length <= 2) return indices;
  // Start from the most "western" point to get a stable, sweeping order.
  const remaining = [...indices].sort((a, b) => places[a].geo!.lng - places[b].geo!.lng);
  const tour = [remaining.shift()!];
  while (remaining.length) {
    const last = places[tour[tour.length - 1]];
    let bestIdx = 0;
    let best = Infinity;
    remaining.forEach((idx, i) => {
      const d = distanceKm(last, places[idx]);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    });
    tour.push(remaining.splice(bestIdx, 1)[0]);
  }
  return tour;
}

const SLOTS = ["09:00", "10:30", "12:30", "15:00", "17:00", "19:30"];
const MEAL_SLOTS = new Set(["12:30", "19:30"]);

function scheduleDay(indices: number[], places: Place[]): { time: string; placeIndex: number }[] {
  const food = indices.filter((i) => FOOD.includes(places[i].kind));
  const other = indices.filter((i) => !FOOD.includes(places[i].kind));
  const stops: { time: string; placeIndex: number }[] = [];
  for (const time of SLOTS) {
    const pool = MEAL_SLOTS.has(time) ? (food.length ? food : other) : other.length ? other : food;
    const next = pool.shift();
    if (next !== undefined) stops.push({ time, placeIndex: next });
  }
  return stops;
}

export function suggestDayCount(places: Place[], requested?: number | null): number {
  const located = places.filter((p) => p.geo).length;
  const fromContent = requested && requested > 0 ? Math.round(requested) : null;
  return Math.max(1, Math.min(7, fromContent ?? Math.ceil(located / 4)));
}

export function buildItinerary(places: Place[], days: number): Itinerary {
  const located = places.map((p, i) => (p.geo ? i : -1)).filter((i) => i >= 0);
  const unplaced = places.map((p, i) => ({ p, i })).filter(({ p }) => !p.geo).map(({ p, i }) => ({ placeIndex: i, name: p.name }));
  const tour = nearestNeighbourTour(located, places);
  const dayCount = Math.max(1, Math.min(days, tour.length || 1));
  const perDay = Math.ceil(tour.length / dayCount);

  const result: ItineraryDay[] = [];
  for (let d = 0; d < dayCount; d++) {
    const chunk = tour.slice(d * perDay, (d + 1) * perDay);
    if (chunk.length === 0) continue;
    const scheduled = scheduleDay([...chunk], places);
    // Anything that did not fit the time slots of that day is left "à placer".
    const placedSet = new Set(scheduled.map((s) => s.placeIndex));
    chunk.filter((i) => !placedSet.has(i)).forEach((i) => unplaced.push({ placeIndex: i, name: places[i].name }));
    result.push({
      day: result.length + 1,
      stops: scheduled.map((s) => ({ ...s, name: places[s.placeIndex].name, kind: places[s.placeIndex].kind })),
    });
  }
  return { days: result, unplaced, generatedAt: new Date().toISOString() };
}
