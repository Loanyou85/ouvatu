import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserStore } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/utils";
import { geocodePlaces } from "@/services/enrichment";
import { getSessionUser } from "@/services/users/auth";
import type { ContentItem } from "@/types/domain";
import type { Place } from "@/types/schemas";

export const maxDuration = 60;

const Body = z
  .object({
    /** Positions found by the browser (fallback when the server cannot geocode). */
    geos: z
      .array(z.object({ index: z.number().int().min(0).max(59), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), label: z.string().max(300).optional() }))
      .max(60)
      .optional(),
  })
  .nullable();

function placesOf(item: ContentItem): { places: Place[]; city: string | null; country: string | null } {
  const d = item.data;
  if (d.category === "TRAVEL") return { places: d.travel.places, city: d.travel.destination ?? d.travel.cities[0] ?? null, country: d.travel.country };
  if (d.category === "PLACES") return { places: d.places.places, city: d.places.city, country: d.places.country };
  return { places: item.userData.locations ?? [], city: null, country: null };
}

/**
 * POST /api/items/:id/locate — puts the card's places on the map: geocodes the
 * places that have no position yet (server side), or saves positions the
 * browser found. Returns the places.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/items/[id]/locate">) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!rateLimit(`locate:${user.id}`, 20, 60_000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const store = await getUserStore();
  const item = await store.getItem(id);
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = Body.safeParse(await request.json().catch(() => null));

  const copy = structuredClone(item);
  const { places, city, country } = placesOf(copy);
  const before = places.filter((p) => p.geo).length;

  if (body.success && body.data?.geos?.length) {
    for (const g of body.data.geos) {
      const place = places[g.index];
      if (place && !place.geo) place.geo = { lat: g.lat, lng: g.lng, provider: "openstreetmap", label: (g.label ?? place.name).slice(0, 300) };
    }
  } else {
    const missing = places.filter((p) => !p.geo);
    await Promise.race([geocodePlaces(missing, city, country), new Promise((r) => setTimeout(r, 45_000))]);
  }

  if (places.filter((p) => p.geo).length > before) {
    if (copy.data.category === "TRAVEL" || copy.data.category === "PLACES") await store.updateItem(id, { data: copy.data });
    else await store.updateItem(id, { userData: { ...item.userData, locations: places } });
  }
  return NextResponse.json({ places });
}
