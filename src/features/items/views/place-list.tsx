import { ExternalLink, MapPin } from "lucide-react";
import { mapsSearchUrl, PLACE_KIND_LABEL } from "@/services/travel/stats";
import type { Place } from "@/types/schemas";
import { NOT_AVAILABLE } from "./shared";

export function PlaceList({ places }: { places: Place[] }) {
  return (
    <ul className="space-y-2.5">
      {places.map((p, i) => (
        <li key={`${p.name}-${i}`} className="flex gap-3 rounded-card bg-card p-3.5 shadow-card animate-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-xl" aria-hidden>
            {PLACE_KIND_LABEL[p.kind].emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold leading-tight">{p.name}</p>
                <p className="text-xs font-semibold text-muted first-letter:uppercase">
                  {[PLACE_KIND_LABEL[p.kind].singular, p.cuisine, p.city].filter(Boolean).join(" · ")}
                </p>
              </div>
              <a
                href={mapsSearchUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-bg px-3 py-1.5 text-xs font-semibold hover:bg-hover"
              >
                Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {p.description ? <p className="mt-1.5 text-sm text-ink/80">{p.description}</p> : null}
            <p className="mt-1.5 flex items-start gap-1 text-xs text-muted">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{p.address ?? (p.geo?.label ? `Position trouvée via ${p.geo.provider === "google" ? "Google Maps" : "OpenStreetMap"}` : `Adresse : ${NOT_AVAILABLE.toLowerCase()}`)}</span>
            </p>
            {p.priceText ? <p className="mt-1 text-xs font-semibold text-ink">Prix : {p.priceText}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
