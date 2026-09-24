import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORY_META } from "@/config/categories";
import { requireSubscribedContext } from "@/features/auth/context";
import { ItemGrid } from "@/features/items/item-card";
import { SearchBox } from "@/features/search/search-box";
import { rateLimit } from "@/lib/rate-limit";
import { track } from "@/services/analytics";
import { parseSearchQuery } from "@/services/search/query-parser";

export const metadata: Metadata = { title: "Recherche" };

const SUGGESTIONS = [
  "mes restaurants japonais à Paris",
  "les recettes rapides",
  "les endroits que je veux visiter à Lisbonne",
  "les films de science-fiction",
  "mes idées déco beige",
];

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 200) : "";
  const { store, user } = await requireSubscribedContext();

  const parsed = q ? parseSearchQuery(q) : null;
  const allowed = q ? rateLimit(`search:${user.id}`, 60, 60_000).ok : true;
  const results =
    parsed && allowed && (parsed.terms.length || parsed.categories)
      ? await store.search({ terms: parsed.terms, categories: parsed.categories, maxTotalMinutes: parsed.maxTotalMinutes, limit: 60 })
      : [];
  if (q) await track(user.id, "search_used", { terms: parsed?.terms.length ?? 0, results: results.length });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 text-[1.9rem] font-extrabold tracking-[-0.03em]">Recherche</h1>
      <SearchBox initial={q} />

      {!q ? (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-muted">Essaie par exemple</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-card transition hover:bg-hover">
                {s}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          {parsed && (parsed.categories || parsed.maxTotalMinutes) ? (
            <p className="mb-4 text-sm text-muted">
              Compris :{" "}
              {parsed.categories?.map((c) => (
                <span key={c} className="mr-1.5 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].plural}
                </span>
              ))}
              {parsed.maxTotalMinutes ? <span className="inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">⏱️ ≤ {parsed.maxTotalMinutes} min</span> : null}
              {parsed.terms.length ? <span> · « {parsed.terms.join(" ")} »</span> : null}
            </p>
          ) : null}
          {results.length ? (
            <>
              <p className="mb-4 text-sm font-semibold text-muted">
                {results.length} résultat{results.length > 1 ? "s" : ""}
              </p>
              <ItemGrid items={results} />
            </>
          ) : (
            <EmptyState emoji="🔎" title="Aucun résultat." description="Essaie avec d'autres mots, ou une catégorie : recettes, voyages, films…" />
          )}
        </div>
      )}
    </div>
  );
}
