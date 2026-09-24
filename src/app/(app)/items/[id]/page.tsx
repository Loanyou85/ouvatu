import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/ui/badge";
import { ItemImage } from "@/components/ui/item-image";
import { requireOnboardedContext } from "@/features/auth/context";
import { LockedPreview } from "@/features/items/locked-preview";
import { ConvertToPlaces } from "@/features/items/views/category-fix";
import { PlaceList } from "@/features/items/views/place-list";
import { PlacesMap } from "@/features/items/views/places-map";
import { ItemToolbar, SaveBar } from "@/features/items/item-toolbar";
import { BooksView, DecorView, FashionView, FitnessView, OtherView, ProductsView, ScreenView } from "@/features/items/views/collection-views";
import type { EntryState } from "@/features/items/views/list-toggle";
import { RecipeView } from "@/features/items/views/recipe-view";
import { TravelView } from "@/features/items/views/travel-view";
import { env } from "@/lib/env";
import { formatRelativeDate, isUuid, pluralize } from "@/lib/utils";
import { hasFeature } from "@/services/billing/entitlements";
import { PLATFORM_LABEL } from "@/services/content-ingestion/url";
import { countDetected } from "@/services/entity-extraction";
import { toItemView } from "@/services/items/view";

export const metadata: Metadata = { title: "Inspiration" };

export default async function ItemPage(props: PageProps<"/items/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  if (!isUuid(id)) notFound();
  const { store, plan } = await requireOnboardedContext();
  const item = await store.getItem(id);
  if (!item) notFound();
  // No subscription: the card generated during onboarding is shown blurred, the rest leads to the offers.
  if (plan !== "PREMIUM") return <LockedPreview item={item} />;

  const view = toItemView(item, plan);
  // Cards built without the AI (key missing / rejected): say it, so the owner can fix the setup.
  const source = item.sourceId && !item.isExample ? await store.getSource(item.sourceId).catch(() => null) : null;
  const simplified = source?.rawMetadata?.analyzer === "heuristic";
  const [collections, saved] = await Promise.all([store.listCollections(), store.listSaved()]);
  const entries: Record<string, EntryState> = {};
  for (const s of saved.filter((s) => s.contentItemId === id)) entries[String(s.entityRef ?? "item")] = { id: s.id, done: s.status === "done" };

  const isNew = searchParams.new === "1";
  const detected = countDetected(item.data);
  const d = view.data;
  const canItinerary = hasFeature(plan, "itinerary") || item.isExample;
  // Tile server chosen on the server (MAP_TILE_URL), OpenStreetMap otherwise.
  const tiles = env.mapTileUrl
    ? { url: env.mapTileUrl, attribution: env.mapTileAttribution ?? "&copy; OpenStreetMap contributors" }
    : undefined;

  return (
    <div className={view.isSaved ? "" : "pb-28"}>
      <Link href="/library" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Bibliothèque
      </Link>

      {isNew ? (
        <div className="mb-6 flex items-center gap-3 rounded-card bg-success-soft p-4 animate-pop">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-extrabold text-success">Ton inspiration est prête.</p>
            <p className="text-sm text-ink/80">
              {detected > 0 ? `${pluralize(detected, "élément")} détecté${detected > 1 ? "s" : ""}.` : "Fiche créée à partir des informations publiques."}
              {view.lockedCount > 0 ? ` ${view.lockedCount} à débloquer avec Premium.` : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ItemImage
            src={view.imageUrl}
            category={view.category}
            alt=""
            className={view.imageUrl ? "aspect-[4/3] w-full rounded-[1.75rem] shadow-card lg:aspect-[4/5]" : "aspect-[16/7] w-full rounded-[1.75rem] lg:aspect-square"}
            emojiClassName="text-6xl lg:text-7xl"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={view.category} />
            {view.isExample ? <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">Exemple</span> : null}
            <span className="text-xs font-semibold text-muted">Ajouté {formatRelativeDate(view.createdAt).toLowerCase()}</span>
          </div>
          <h1 className="mt-3 text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-4xl">{view.title}</h1>
          <p className="mt-3 text-[1.02rem] leading-relaxed text-ink/80">{view.summary}</p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <ItemToolbar itemId={view.id} title={view.title} isFavorite={view.isFavorite} collections={collections} memberOf={view.collectionIds} />
            {view.sourceUrl && !view.isExample ? (
              <a href={view.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                {view.sourcePlatform ? `Voir sur ${PLATFORM_LABEL[view.sourcePlatform]}` : "Voir la source"}
                {view.sourceAuthor ? ` · ${view.sourceAuthor}` : ""} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          {view.tags.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {view.tags.map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="rounded-full bg-hover px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink">
                  #{t}
                </Link>
              ))}
            </div>
          ) : null}

          {simplified ? (
            <div className="mt-6 rounded-2xl bg-hover p-4 text-sm">
              <p className="font-bold">Analyse simplifiée (sans IA)</p>
              <p className="mt-0.5 text-muted">
                L&apos;IA n&apos;a pas pu être utilisée pour cette fiche : la catégorie et les détails peuvent être imprécis.
                {typeof source?.rawMetadata?.aiError === "string" ? ` Raison : ${source.rawMetadata.aiError}` : " Vérifie la ligne « IA » sur /setup."}
              </p>
            </div>
          ) : null}
          {d.category !== "TRAVEL" && d.category !== "PLACES" && !view.isExample && !view.userData.locations?.length ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Mauvaise catégorie ?</span>
              <ConvertToPlaces itemId={view.id} />
            </div>
          ) : null}

          <div className="mt-8">
            {d.category === "RECIPES" ? <RecipeView itemId={view.id} recipe={d.recipe} /> : null}
            {d.category === "TRAVEL" ? (
              <TravelView
                tiles={tiles}
                defaultCity={d.travel.destination ?? d.travel.cities[0] ?? null}
                itemId={view.id}
                places={d.travel.places}
                lockedCount={view.lockedCount}
                itinerary={view.userData.itinerary ?? null}
                canItinerary={canItinerary}
                facts={[
                  { label: "Destination", value: d.travel.destination },
                  { label: "Pays", value: d.travel.country },
                  { label: "Durée", value: d.travel.durationDays ? pluralize(d.travel.durationDays, "jour") : null },
                  { label: "Budget", value: d.travel.budgetText },
                ]}
              />
            ) : null}
            {d.category === "PLACES" ? (
              <TravelView tiles={tiles} defaultCity={d.places.city} itemId={view.id} places={d.places.places} lockedCount={view.lockedCount} itinerary={view.userData.itinerary ?? null} canItinerary={canItinerary} />
            ) : null}
            {d.category === "PRODUCTS" ? <ProductsView itemId={view.id} data={d.products} lockedCount={view.lockedCount} entries={entries} sourceUrl={view.isExample ? null : view.sourceUrl} /> : null}
            {d.category === "MOVIES" || d.category === "SERIES" ? <ScreenView itemId={view.id} data={d.screen} lockedCount={view.lockedCount} entries={entries} /> : null}
            {d.category === "BOOKS" ? <BooksView itemId={view.id} data={d.books} lockedCount={view.lockedCount} entries={entries} /> : null}
            {d.category === "FASHION" ? <FashionView itemId={view.id} data={d.fashion} entries={entries} /> : null}
            {d.category === "HOME_DECOR" ? <DecorView itemId={view.id} data={d.decor} entries={entries} /> : null}
            {d.category === "FITNESS" ? <FitnessView itemId={view.id} data={d.fitness} entries={entries} /> : null}
            {d.category === "OTHER" ? <OtherView data={d.other} /> : null}
          </div>

          {/* Places mentioned in any other kind of content (a look shot in a park…): map right under the card. */}
          {d.category !== "TRAVEL" && d.category !== "PLACES" && view.userData.locations?.length ? (
            <div className="mt-10 space-y-6">
              <PlacesMap places={view.userData.locations} tiles={tiles} title="Les lieux sur la carte" />
              <PlaceList places={view.userData.locations} />
            </div>
          ) : null}
        </div>
      </div>

      {!view.isSaved ? <SaveBar itemId={view.id} /> : null}
    </div>
  );
}
