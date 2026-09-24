import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BRAND } from "@/config/brand";
import { CATEGORY_META, LIBRARY_TABS, type Category } from "@/config/categories";
import { LIST_TABS } from "@/config/lists";
import { AddTrigger } from "@/features/add/add-provider";
import { CollectionCard } from "@/features/collections/collection-card";
import { ItemGrid } from "@/features/items/item-card";
import { examplesEnabled } from "@/lib/env";
import type { UserDataStore } from "@/db/types";
import type { UserProfile } from "@/types/domain";
import { LoadExamplesButton } from "./load-examples-button";

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "Pinterest", "Web"];

export async function HomeView({ store, profile }: { store: UserDataStore; profile: UserProfile }) {
  const [items, collections, counts, shopping, saved] = await Promise.all([
    store.listItems({ limit: 8 }),
    store.listCollections(),
    store.categoryCounts(),
    store.listShopping(),
    store.listSaved(),
  ]);
  const listCounts = LIST_TABS.map((t) => ({
    ...t,
    count: t.listType === "SHOPPING" ? shopping.filter((s) => !s.checked).length : saved.filter((s) => s.listType === t.listType && s.status === "todo").length,
  })).filter((t) => t.count > 0);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const firstName = profile.name?.split(" ")[0];

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-9 text-white sm:px-10 sm:py-12 animate-fade-up">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/50 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative max-w-xl">
          {firstName ? <p className="mb-3 text-sm font-semibold text-white/60">Salut {firstName} 👋</p> : null}
          <h1 className="text-[2rem] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-5xl">{BRAND.tagline}</h1>
          <p className="mt-4 max-w-md text-[1.02rem] text-white/70">{BRAND.description}</p>
          <AddTrigger
            from="home_hero"
            className="mt-7 inline-flex h-14 items-center gap-2.5 rounded-full bg-accent px-7 font-semibold text-white shadow-accent transition hover:bg-accent-strong active:scale-[0.97]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.75} /> Ajouter une inspiration
          </AddTrigger>
          <div className="mt-6 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <span key={p} className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/70">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Dernières inspirations"
          action={
            items.length ? (
              <Link href="/library" className="text-sm font-semibold text-muted hover:text-ink">
                Tout voir
              </Link>
            ) : null
          }
        />
        {items.length ? (
          <ItemGrid items={items} />
        ) : (
          <EmptyState
            emoji="🪄"
            title="Ton espace est encore vide."
            description="Trouve quelque chose que tu aimes et colle son lien ici."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <AddTrigger from="home_empty" className={buttonClass("accent", "md")}>
                  <Plus className="h-4 w-4" strokeWidth={2.75} /> Ajouter
                </AddTrigger>
                {examplesEnabled ? <LoadExamplesButton /> : null}
              </div>
            }
          />
        )}
      </section>

      <section>
        <SectionTitle
          title="Mes collections"
          action={
            <Link href="/collections" className="text-sm font-semibold text-muted hover:text-ink">
              {collections.length ? "Tout voir" : "Créer"}
            </Link>
          }
        />
        {collections.length ? (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0">
            {collections.slice(0, 4).map((c) => (
              <CollectionCard key={c.id} collection={c} className="w-[42%] shrink-0 sm:w-auto" />
            ))}
          </div>
        ) : (
          <Link href="/collections" className="flex items-center gap-4 rounded-card border border-dashed border-line bg-card/60 p-5 transition hover:bg-card">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-2xl">🗂️</span>
            <span>
              <span className="block font-bold">Crée ta première collection.</span>
              <span className="text-sm text-muted">🇯🇵 Japon, 🍝 Recettes rapides, 🛍️ À acheter…</span>
            </span>
          </Link>
        )}
      </section>

      {listCounts.length ? (
        <section>
          <SectionTitle title="Mes listes" />
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {listCounts.map((t) => (
              <Link key={t.slug} href={`/lists?tab=${t.slug}`} className="flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-bold shadow-card transition hover:bg-hover">
                <span aria-hidden>{t.emoji}</span> {t.label}
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-strong">{t.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {total > 0 ? (
        <section>
          <SectionTitle title="Explorer mon espace" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {LIBRARY_TABS.filter((t) => t.categories.length).map((tab, i) => {
              const count = tab.categories.reduce((a, c: Category) => a + (counts[c] ?? 0), 0);
              return (
                <Link
                  key={tab.slug}
                  href={`/library?category=${tab.slug}`}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card transition hover:-translate-y-0.5 animate-fade-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-xl" aria-hidden>
                    {CATEGORY_META[tab.categories[0]].emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{tab.label}</span>
                    <span className="text-sm text-muted">{count}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
