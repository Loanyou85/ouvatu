"use client";

import { Navigation } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { optimizeRoute, suggestedMode, type OptimizedRoute } from "@/services/travel/route";
import type { Place } from "@/types/schemas";
import { FastestRoute } from "./fastest-route";
import type { MapTiles } from "./map-view";
import { Block } from "./shared";

const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-card" />,
});

/** Map of every located place + "fastest route through all of them". */
export function PlacesMap({ places, tiles, highlight, title = "Carte" }: { places: Place[]; tiles?: MapTiles; highlight?: number[]; title?: string }) {
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [mode, setMode] = useState<"walking" | "driving">("walking");
  const located = places.map((p, index) => ({ p, index })).filter(({ p }) => p.geo);

  function computeRoute() {
    const r = optimizeRoute(located.map(({ p, index }) => ({ index, lat: p.geo!.lat, lng: p.geo!.lng })));
    setRoute(r);
    setMode(suggestedMode(r.totalKm));
  }

  return (
    <Block title={title} action={<span className="text-xs font-semibold text-muted">{located.length}/{places.length} lieux localisés</span>}>
      <MapView places={places} tiles={tiles} highlight={route ? undefined : highlight} route={route?.order} className="h-72 w-full overflow-hidden rounded-card shadow-card sm:h-96" />
      {located.length >= 2 && !route ? (
        <Button variant="accent" size="lg" className="mt-4 w-full" onClick={computeRoute}>
          <Navigation className="h-5 w-5" /> Itinéraire le plus rapide
        </Button>
      ) : null}
      {route ? <FastestRoute places={places} route={route} mode={mode} onMode={setMode} /> : null}
    </Block>
  );
}
