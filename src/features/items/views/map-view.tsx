"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Place } from "@/types/schemas";
import { PLACE_KIND_LABEL } from "@/services/travel/stats";

/** Map tiles: set server-side (MAP_TILE_URL) and passed down, OpenStreetMap by default. */
export interface MapTiles {
  url: string;
  attribution: string;
}

export const DEFAULT_TILES: MapTiles = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

export function MapView({
  places,
  className,
  highlight,
  route,
  tiles = DEFAULT_TILES,
}: {
  places: Place[];
  className?: string;
  highlight?: number[];
  /** Ordered place indices of an optimized route: numbered markers + line. */
  route?: number[] | null;
  tiles?: MapTiles;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const located = places.map((p, i) => ({ p, i })).filter(({ p }) => p.geo);

  useEffect(() => {
    if (!containerRef.current || located.length === 0) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: true, zoomControl: true });
      L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: 19 }).addTo(map);
      const bounds = L.latLngBounds([]);
      const esc = (v: string) => v.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
      located.forEach(({ p, i }, order) => {
        const step = route ? route.indexOf(i) : -1;
        const label = step >= 0 ? String(step + 1) : PLACE_KIND_LABEL[p.kind].emoji;
        const active = !highlight || highlight.includes(i);
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:${active ? "#6C63FF" : "#a3a39c"};color:#fff;font-weight:800;box-shadow:0 6px 16px -6px rgba(0,0,0,.45);border:2px solid #fff;font-size:15px">${label}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const marker = L.marker([p.geo!.lat, p.geo!.lng], { icon, title: p.name, zIndexOffset: active ? 100 : 0 }).addTo(map!);
        const q = encodeURIComponent([p.name, p.city, p.country].filter(Boolean).join(", "));
        const ll = `${p.geo!.lat},${p.geo!.lng}`;
        const link = (href: string, text: string) =>
          `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:6px;margin-right:6px;padding:4px 10px;border-radius:999px;background:#f1f1ee;color:#111;font-weight:600;text-decoration:none">${text}</a>`;
        marker.bindPopup(
          `<strong>${step >= 0 ? `${step + 1}. ` : `${order + 1}. `}${esc(p.name)}</strong>` +
            (p.address ? `<br/><span style="color:#666">${esc(p.address)}</span>` : "") +
            `<br/>${link(`https://www.google.com/maps/search/?api=1&query=${q}`, "Maps")}${link(`https://maps.apple.com/?q=${q}&ll=${ll}`, "Plans")}`,
        );
        bounds.extend([p.geo!.lat, p.geo!.lng]);
      });
      if (route && route.length > 1) {
        const line = route.map((idx) => places[idx]?.geo).filter(Boolean).map((g) => [g!.lat, g!.lng] as [number, number]);
        L.polyline(line, { color: "#6C63FF", weight: 4, opacity: 0.8, dashArray: "6 8" }).addTo(map);
      }
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(located.map(({ p }) => [p.geo?.lat, p.geo?.lng])), JSON.stringify(highlight), JSON.stringify(route ?? null)]);

  if (located.length === 0) {
    return (
      <div className={className}>
        <div className="grid h-full min-h-40 place-items-center rounded-card border border-dashed border-line bg-card/60 p-6 text-center text-sm text-muted">
          Aucune position fiable n&apos;a été trouvée pour ces lieux.
        </div>
      </div>
    );
  }
  return <div ref={containerRef} className={className} role="region" aria-label="Carte des lieux" />;
}
