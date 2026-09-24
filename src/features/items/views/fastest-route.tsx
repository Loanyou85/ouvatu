"use client";

import { Car, ExternalLink, Footprints, Navigation } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { googleRouteLinks, type OptimizedRoute } from "@/services/travel/route";
import type { Place } from "@/types/schemas";

function km(v: number): string {
  return v < 1 ? `${Math.round(v * 1000)} m` : `${v.toFixed(1).replace(".", ",")} km`;
}

/** Ordered stops of the fastest route + links that open it in Google Maps. */
export function FastestRoute({
  places,
  route,
  mode,
  onMode,
}: {
  places: Place[];
  route: OptimizedRoute;
  mode: "walking" | "driving";
  onMode: (m: "walking" | "driving") => void;
}) {
  const stops = route.order.map((i) => places[i]).filter((p): p is Place => Boolean(p?.geo));
  const links = googleRouteLinks(
    stops.map((p) => p.geo!),
    mode,
  );
  return (
    <div className="mt-4 rounded-card bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-extrabold">
          Itinéraire le plus rapide · {stops.length} lieux · ~{km(route.totalKm)}
        </p>
        <div className="flex rounded-full bg-bg p-1 text-sm font-semibold">
          {(["walking", "driving"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMode(m)}
              className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1", mode === m ? "bg-ink text-white" : "text-muted")}
            >
              {m === "walking" ? <Footprints className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
              {m === "walking" ? "À pied" : "En voiture"}
            </button>
          ))}
        </div>
      </div>
      <ol className="mt-3 space-y-1.5">
        {stops.map((p, i) => (
          <li key={`${p.name}-${i}`} className="flex items-center gap-3 text-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-extrabold text-white">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
            {i > 0 ? <span className="shrink-0 text-xs text-muted">+{km(route.legsKm[i - 1])}</span> : null}
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-2">
        {links.map((href, i) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "md", "w-full")}>
            <Navigation className="h-4 w-4" />
            {links.length > 1 ? `Ouvrir la partie ${i + 1}/${links.length} dans Google Maps` : "Lancer dans Google Maps"}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ))}
      </div>
      <p className="mt-2 text-xs text-subtle">Ordre calculé pour le trajet le plus court entre tous les lieux. Google Maps calcule ensuite le trajet exact.</p>
    </div>
  );
}
