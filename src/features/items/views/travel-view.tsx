"use client";

import { ExternalLink, MapIcon, Route, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { googleDirectionsUrl, placeBreakdown, PLACE_KIND_LABEL } from "@/services/travel/stats";
import type { Itinerary } from "@/types/domain";
import type { Place } from "@/types/schemas";
import { generateItineraryAction } from "../actions";
import { useServerAction } from "../use-action";
import type { MapTiles } from "./map-view";
import { AddPlaces } from "./add-places";
import { PlaceList } from "./place-list";
import { PlacesMap } from "./places-map";
import { Block, Fact, LockedPreview } from "./shared";


export function TravelView({
  itemId,
  places,
  lockedCount,
  itinerary,
  canItinerary,
  facts,
  tiles,
  defaultCity = null,
}: {
  tiles?: MapTiles;
  defaultCity?: string | null;
  itemId: string;
  places: Place[];
  lockedCount: number;
  itinerary: Itinerary | null;
  canItinerary: boolean;
  facts?: { label: string; value: string | null }[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [day, setDay] = useState(0);
  const { pending, run } = useServerAction();
  const breakdown = placeBreakdown(places);
  const activeDay = itinerary?.days[day];
  const dayRoute = activeDay ? googleDirectionsUrl(activeDay.stops.map((s) => places[s.placeIndex]).filter(Boolean)) : null;

  if (places.length === 0) {
    return (
      <div className="space-y-8">
        {facts?.some((f) => f.value) ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {facts.map((f) => (
              <Fact key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
        ) : null}
        <AddPlaces itemId={itemId} defaultCity={defaultCity} empty={false} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {facts?.length ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {facts.map((f) => (
            <Fact key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {breakdown.map((b) => (
          <span key={b.kind} className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-card">
            {PLACE_KIND_LABEL[b.kind].emoji} {b.label}
          </span>
        ))}
        {lockedCount ? <span className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-white">🔒 +{lockedCount}</span> : null}
      </div>

      <div className="grid gap-2.5 sm:flex">
        <Button variant="dark" size="lg" onClick={() => mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
          <MapIcon className="h-5 w-5" /> Voir la carte
        </Button>
        <Button
          variant={canItinerary ? "accent" : "soft"}
          size="lg"
          loading={pending}
          onClick={() => run(() => generateItineraryAction(itemId, itinerary?.days.length ?? 0), () => setDay(0))}
        >
          {canItinerary ? <Route className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          {itinerary ? "Recalculer l'itinéraire" : "Créer mon itinéraire"}
        </Button>
      </div>

      {itinerary && itinerary.days.length ? (
        <Block title="Mon itinéraire">
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {itinerary.days.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setDay(i)}
                className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold transition", i === day ? "bg-ink text-white" : "bg-card shadow-card hover:bg-hover")}
              >
                Jour {d.day}
              </button>
            ))}
          </div>
          {activeDay ? (
            <ol className="relative space-y-3 border-l-2 border-dashed border-line pl-5">
              {activeDay.stops.map((stop) => (
                <li key={`${stop.time}-${stop.placeIndex}`} className="relative animate-fade-up">
                  <span className="absolute -left-[1.72rem] top-3.5 h-3 w-3 rounded-full border-2 border-bg bg-accent" />
                  <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card">
                    <span className="w-14 shrink-0 font-extrabold tabular-nums text-accent-strong">{stop.time}</span>
                    <span className="text-lg" aria-hidden>
                      {PLACE_KIND_LABEL[stop.kind as Place["kind"]]?.emoji ?? "📍"}
                    </span>
                    <span className="font-semibold">{stop.name}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          {dayRoute ? (
            <a href={dayRoute} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "md", "mt-4 w-full sm:w-auto")}>
              <Route className="h-4 w-4" /> Ouvrir le jour {activeDay?.day} dans Google Maps <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {itinerary.unplaced.length ? (
            <p className="mt-4 text-sm text-muted">
              À placer librement : {itinerary.unplaced.map((u) => u.name).join(", ")}
              {" "}(position inconnue ou journée complète).
            </p>
          ) : null}
          <p className="mt-2 text-xs text-subtle">Horaires indicatifs. Les lieux proches sont regroupés le même jour.</p>
        </Block>
      ) : null}

      <div ref={mapRef}>
        <PlacesMap places={places} itemId={itemId} tiles={tiles} highlight={activeDay?.stops.map((s) => s.placeIndex)} />
      </div>

      <Block title="Lieux détectés">
        <PlaceList places={places} />
        <LockedPreview count={lockedCount} noun="lieu" plural="lieux" />
        <div className="mt-4">
          <AddPlaces itemId={itemId} defaultCity={defaultCity} empty={false} />
        </div>
      </Block>
    </div>
  );
}
