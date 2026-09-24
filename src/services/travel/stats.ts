import type { Place, PlaceKind } from "@/types/schemas";

export const PLACE_KIND_LABEL: Record<PlaceKind, { singular: string; plural: string; emoji: string }> = {
  sight: { singular: "lieu", plural: "lieux", emoji: "🏛️" },
  restaurant: { singular: "restaurant", plural: "restaurants", emoji: "🍽️" },
  cafe: { singular: "café", plural: "cafés", emoji: "☕" },
  bar: { singular: "bar", plural: "bars", emoji: "🍸" },
  activity: { singular: "activité", plural: "activités", emoji: "🎟️" },
  hotel: { singular: "hôtel", plural: "hôtels", emoji: "🛏️" },
  beach: { singular: "plage", plural: "plages", emoji: "🏖️" },
  museum: { singular: "musée", plural: "musées", emoji: "🖼️" },
  shop: { singular: "boutique", plural: "boutiques", emoji: "🛍️" },
  park: { singular: "parc", plural: "parcs", emoji: "🌳" },
  viewpoint: { singular: "point de vue", plural: "points de vue", emoji: "🌅" },
  other: { singular: "lieu", plural: "lieux", emoji: "📍" },
};

/** "7 lieux · 3 restaurants · 2 cafés" style breakdown, biggest first. */
export function placeBreakdown(places: Place[]): { kind: PlaceKind; count: number; label: string }[] {
  const counts = new Map<PlaceKind, number>();
  for (const p of places) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => ({
      kind,
      count,
      label: `${count} ${count > 1 ? PLACE_KIND_LABEL[kind].plural : PLACE_KIND_LABEL[kind].singular}`,
    }));
}

/** Opens a Maps search by name + city (works without any API key). */
export function mapsSearchUrl(place: Pick<Place, "name" | "city" | "country">): string {
  const q = [place.name, place.city, place.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Opens the place in Apple Plans (Maps) — pinned at its position when known. */
export function appleMapsUrl(place: Pick<Place, "name" | "city" | "country" | "geo">): string {
  const q = [place.name, place.city, place.country].filter(Boolean).join(", ");
  const params = new URLSearchParams({ q });
  if (place.geo) params.set("ll", `${place.geo.lat},${place.geo.lng}`);
  return `https://maps.apple.com/?${params.toString()}`;
}

function waypoint(place: Pick<Place, "name" | "city" | "country" | "geo">): string {
  return place.geo ? `${place.geo.lat},${place.geo.lng}` : [place.name, place.city, place.country].filter(Boolean).join(", ");
}

/**
 * Google Maps directions through every stop of a day, in order (walking).
 * Google accepts up to 9 intermediate waypoints in a link; extra stops are dropped.
 */
export function googleDirectionsUrl(stops: Pick<Place, "name" | "city" | "country" | "geo">[]): string | null {
  if (stops.length === 0) return null;
  if (stops.length === 1) return mapsSearchUrl(stops[0]);
  const points = stops.map(waypoint);
  const params = new URLSearchParams({
    api: "1",
    origin: points[0],
    destination: points[points.length - 1],
    travelmode: "walking",
  });
  const middle = points.slice(1, -1).slice(0, 9);
  if (middle.length) params.set("waypoints", middle.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
