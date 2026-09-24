/**
 * Fastest order to visit every located place once (open path, no return).
 * Places are few (≤ 60), so we try every starting point with a nearest-
 * neighbour tour, then improve the best one with 2-opt. Distances are
 * straight-line (haversine) — Google Maps then computes the real route.
 */
export interface RoutePoint {
  /** Index of the place in the card's place list. */
  index: number;
  lat: number;
  lng: number;
}

export interface OptimizedRoute {
  order: number[];
  /** Straight-line distance between consecutive stops, in km. */
  legsKm: number[];
  totalKm: number;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pathLength(path: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += distanceKm(path[i - 1], path[i]);
  return total;
}

function nearestNeighbour(points: RoutePoint[], start: number): RoutePoint[] {
  const left = points.slice();
  const path = [left.splice(start, 1)[0]];
  while (left.length) {
    const last = path[path.length - 1];
    let best = 0;
    for (let i = 1; i < left.length; i++) if (distanceKm(last, left[i]) < distanceKm(last, left[best])) best = i;
    path.push(left.splice(best, 1)[0]);
  }
  return path;
}

function twoOpt(path: RoutePoint[]): RoutePoint[] {
  let best = path;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        if (pathLength(candidate) + 1e-9 < pathLength(best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function optimizeRoute(points: RoutePoint[]): OptimizedRoute {
  if (points.length === 0) return { order: [], legsKm: [], totalKm: 0 };
  let best = nearestNeighbour(points, 0);
  for (let s = 1; s < points.length; s++) {
    const candidate = nearestNeighbour(points, s);
    if (pathLength(candidate) < pathLength(best)) best = candidate;
  }
  best = twoOpt(best);
  const legsKm = best.slice(1).map((p, i) => distanceKm(best[i], p));
  return { order: best.map((p) => p.index), legsKm, totalKm: legsKm.reduce((a, b) => a + b, 0) };
}

/** Walking for a compact route, driving beyond that. */
export function suggestedMode(totalKm: number): "walking" | "driving" {
  return totalKm <= 6 ? "walking" : "driving";
}

/**
 * Google Maps directions links for the ordered stops. One link carries up to
 * 11 points (origin + 9 waypoints + destination); longer routes are split
 * into consecutive legs that share their end/start point.
 */
export function googleRouteLinks(stops: { lat: number; lng: number }[], mode: "walking" | "driving"): string[] {
  if (stops.length === 0) return [];
  const coords = stops.map((s) => `${s.lat},${s.lng}`);
  if (coords.length === 1) return [`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords[0])}`];
  const links: string[] = [];
  for (let start = 0; start < coords.length - 1; start += 10) {
    const chunk = coords.slice(start, start + 11);
    const params = new URLSearchParams({ api: "1", origin: chunk[0], destination: chunk[chunk.length - 1], travelmode: mode });
    if (chunk.length > 2) params.set("waypoints", chunk.slice(1, -1).join("|"));
    links.push(`https://www.google.com/maps/dir/?${params.toString()}`);
  }
  return links;
}
