"use client";

import { Heart, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LIBRARY_TABS } from "@/config/categories";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/domain";

export function LibraryFilters({ collections, counts }: { collections: Collection[]; counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("category") ?? "tout";

  const hrefWith = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    next.delete("deleted");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const set = (patch: Record<string, string | null>) => router.push(hrefWith(patch), { scroll: false });

  const selectClass = "h-9 rounded-full border border-line bg-card px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="space-y-3">
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Catégories">
        {LIBRARY_TABS.map((tab) => {
          const active = current === tab.slug;
          const count = counts[tab.slug] ?? 0;
          if (tab.slug !== "tout" && count === 0 && !active) return null;
          return (
            <Link
              key={tab.slug}
              href={hrefWith({ category: tab.slug === "tout" ? null : tab.slug })}
              scroll={false}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition",
                active ? "bg-ink text-white" : "bg-card text-ink shadow-card hover:bg-hover",
              )}
            >
              {tab.label}
              <span className={cn("ml-1.5 text-xs", active ? "text-white/60" : "text-subtle")}>{count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        {collections.length ? (
          <select aria-label="Collection" className={selectClass} value={params.get("collection") ?? ""} onChange={(e) => set({ collection: e.target.value || null })}>
            <option value="">Toutes les collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        ) : null}
        <select aria-label="Date d'ajout" className={selectClass} value={params.get("date") ?? ""} onChange={(e) => set({ date: e.target.value || null })}>
          <option value="">Toutes les dates</option>
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
        </select>
        <select aria-label="Tri" className={selectClass} value={params.get("sort") ?? "recent"} onChange={(e) => set({ sort: e.target.value === "recent" ? null : e.target.value })}>
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
        </select>
        <button
          onClick={() => set({ fav: params.get("fav") ? null : "1" })}
          aria-pressed={Boolean(params.get("fav"))}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition",
            params.get("fav") ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-card hover:bg-hover",
          )}
        >
          <Heart className={cn("h-4 w-4", params.get("fav") && "fill-accent text-accent")} /> Favoris
        </button>
        <div className="ml-auto flex rounded-full border border-line bg-card p-0.5">
          {(["grid", "list"] as const).map((v) => {
            const active = (params.get("view") ?? "grid") === v;
            const Icon = v === "grid" ? LayoutGrid : List;
            return (
              <button
                key={v}
                aria-label={v === "grid" ? "Affichage grille" : "Affichage liste"}
                aria-pressed={active}
                onClick={() => set({ view: v === "grid" ? null : "list" })}
                className={cn("grid h-8 w-8 place-items-center rounded-full", active ? "bg-ink text-white" : "text-muted")}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
