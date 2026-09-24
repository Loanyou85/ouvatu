"use client";

import { Loader2, Navigation } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  optimizeRoute,
  suggestedMode,
  type OptimizedRoute,
} from "@/services/travel/route";
import type { Place } from "@/types/schemas";
import { FastestRoute } from "./fastest-route";
import type { MapTiles } from "./map-view";
import { Block } from "./shared";

const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-card" />,
});

type LocateResponse = { places?: Place[] };

async function postLocate(
  itemId: string,
  body: unknown,
): Promise<Place[] | null> {
  const res = await fetch(`/api/items/${itemId}/locate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res?.ok) return null;
  return (
    ((await res.json().catch(() => null)) as LocateResponse | null)?.places ??
    null
  );
}

/** Last resort, from the visitor's browser (not the hosting IPs): Photon / OpenStreetMap. */
async function browserGeocode(
  query: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(query)}`,
    );
    const data = (await res.json()) as {
      features?: {
        geometry: { coordinates: [number, number] };
        properties: { name?: string; city?: string; country?: string };
      }[];
    };
    const f = data.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.geometry.coordinates;
    return {
      lat,
      lng,
      label: [f.properties.name, f.properties.city, f.properties.country]
        .filter(Boolean)
        .join(", "),
    };
  } catch {
    return null;
  }
}

/**
 * Puts every place on the map as soon as the card opens: places without a
 * position are geocoded by the server, then by the browser if needed, and
 * the positions are saved on the card.
 */
function useLocatedPlaces(itemId: string | undefined, initial: Place[]) {
  const [places, setPlaces] = useState(initial);
  const [locating, setLocating] = useState(
    () => Boolean(itemId) && initial.some((p) => !p.geo),
  );
  const started = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!itemId || started.current || !initial.some((p) => !p.geo)) return;
    started.current = true;
    void (async () => {
      let current = (await postLocate(itemId, {})) ?? initial;
      const missing = current
        .map((p, index) => ({ p, index }))
        .filter(({ p }) => !p.geo);
      if (missing.length) {
        const geos: {
          index: number;
          lat: number;
          lng: number;
          label: string;
        }[] = [];
        for (const { p, index } of missing) {
          const hit = await browserGeocode(
            [p.name, p.address, p.city, p.country].filter(Boolean).join(", "),
          );
          if (hit) geos.push({ index, ...hit });
        }
        if (geos.length)
          current = (await postLocate(itemId, { geos })) ?? current;
      }
      setPlaces(current);
      setLocating(false);
      router.refresh();
    })();
  }, [itemId, initial, router]);

  return { places, locating };
}

/** Map of every located place + "fastest route through all of them". */
export function PlacesMap({
  places: initialPlaces,
  itemId,
  tiles,
  highlight,
  title = "Carte",
}: {
  places: Place[];
  itemId?: string;
  tiles?: MapTiles;
  highlight?: number[];
  title?: string;
}) {
  const { places, locating } = useLocatedPlaces(itemId, initialPlaces);
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [mode, setMode] = useState<"walking" | "driving">("walking");
  const located = places
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => p.geo);

  function computeRoute() {
    const r = optimizeRoute(
      located.map(({ p, index }) => ({
        index,
        lat: p.geo!.lat,
        lng: p.geo!.lng,
      })),
    );
    setRoute(r);
    setMode(suggestedMode(r.totalKm));
  }

  return (
    <Block
      title={title}
      action={
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {locating
            ? "Placement des lieux…"
            : `${located.length}/${places.length} lieux localisés`}
        </span>
      }
    >
      {locating && located.length === 0 ? (
        <Skeleton className="h-72 w-full rounded-card sm:h-96" />
      ) : (
        <MapView
          places={places}
          tiles={tiles}
          highlight={route ? undefined : highlight}
          route={route?.order}
          className="h-72 w-full overflow-hidden rounded-card shadow-card sm:h-96"
        />
      )}
      {located.length >= 2 && !route ? (
        <Button
          variant="accent"
          size="lg"
          className="mt-4 w-full"
          onClick={computeRoute}
        >
          <Navigation className="h-5 w-5" /> Itinéraire le plus rapide
        </Button>
      ) : null}
      {route ? (
        <FastestRoute
          places={places}
          route={route}
          mode={mode}
          onMode={setMode}
        />
      ) : null}
    </Block>
  );
}
