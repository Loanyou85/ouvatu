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
