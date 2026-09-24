import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LIBRARY_TABS, type Category } from "@/config/categories";
import { limitsFor } from "@/config/plans";
import { AddTrigger } from "@/features/add/add-provider";
import { requireSubscribedContext } from "@/features/auth/context";
import { LoadExamplesButton } from "@/features/home/load-examples-button";
import { ItemGrid } from "@/features/items/item-card";
import { LibraryFilters } from "@/features/library/filters";
import { examplesEnabled } from "@/lib/env";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Bibliothèque" };

function sinceDays(days: number): string | undefined {
  return days === 7 || days === 30 ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined;
}

export default async function LibraryPage(props: PageProps<"/library">) {
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const { store, plan } = await requireSubscribedContext();

  const tab = LIBRARY_TABS.find((t) => t.slug === one(sp.category)) ?? LIBRARY_TABS[0];
  const collectionId = isUuid(one(sp.collection)) ? one(sp.collection) : undefined;
  const since = sinceDays(Number(one(sp.date)));

  const [items, collections, counts] = await Promise.all([
    store.listItems({
      categories: tab.categories.length ? tab.categories : undefined,
      collectionId,
      favoritesOnly: one(sp.fav) === "1",
      sort: one(sp.sort) === "oldest" ? "oldest" : "recent",
      since,
    }),
    store.listCollections(),
    store.categoryCounts(),
  ]);

  const tabCounts: Record<string, number> = {};
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  for (const t of LIBRARY_TABS) tabCounts[t.slug] = t.categories.length ? t.categories.reduce((a, c: Category) => a + (counts[c] ?? 0), 0) : total;
  const filtered = Boolean(collectionId || one(sp.fav) || since || tab.categories.length);
  const limit = limitsFor(plan).maxSavedItems;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-extrabold tracking-[-0.03em]">Bibliothèque</h1>
          <p className="text-sm text-muted">
            {total} élément{total > 1 ? "s" : ""}
            {Number.isFinite(limit) ? ` sur ${limit}` : ""}
          </p>
        </div>
        <AddTrigger from="library" className={buttonClass("accent", "sm", "hidden sm:inline-flex")}>
          <Plus className="h-4 w-4" strokeWidth={2.75} /> Ajouter
        </AddTrigger>
      </div>

      {one(sp.deleted) ? <p className="mb-4 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success animate-fade-up">Élément supprimé.</p> : null}

      {total > 0 ? (
        <Suspense>
          <LibraryFilters collections={collections} counts={tabCounts} />
        </Suspense>
      ) : null}

      <div className="mt-6">
        {items.length ? (
          <ItemGrid items={items} variant={one(sp.view) === "list" ? "list" : "grid"} />
        ) : filtered ? (
          <EmptyState emoji="🔍" title="Rien ici pour l'instant." description="Aucun élément ne correspond à ces filtres." />
        ) : (
          <EmptyState
            emoji="🪄"
            title="Ton espace est encore vide."
            description="Trouve quelque chose que tu aimes et colle son lien ici."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <AddTrigger from="library_empty" className={buttonClass("accent", "md")}>
                  <Plus className="h-4 w-4" strokeWidth={2.75} /> Ajouter
                </AddTrigger>
                {examplesEnabled ? <LoadExamplesButton /> : null}
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
