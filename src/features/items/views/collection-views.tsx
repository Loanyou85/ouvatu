import { ExternalLink } from "lucide-react";
import { ItemImage } from "@/components/ui/item-image";
import { formatPrice } from "@/config/plans";
import { formatMinutes } from "@/lib/utils";
import type { BooksData, DecorData, FashionData, FitnessData, OtherData, ProductsData, ScreenData } from "@/types/schemas";
import { ListToggle, type EntryState } from "./list-toggle";
import { Block, Chips, Fact, LockedPreview, NOT_AVAILABLE } from "./shared";

type Entries = Record<string, EntryState>;
const key = (ref: number | null) => String(ref ?? "item");

function money(price: number | null, currency: string | null): string {
  if (price == null) return "Prix non disponible";
  try {
    return formatPrice(Math.round(price * 100), currency ?? "EUR");
  } catch {
    return `${price} ${currency ?? ""}`.trim();
  }
}

export function ScreenView({ itemId, data, lockedCount, entries }: { itemId: string; data: ScreenData; lockedCount: number; entries: Entries }) {
  return (
    <Block title={`${data.titles.length + lockedCount > 1 ? "Titres" : "Titre"} détecté${data.titles.length + lockedCount > 1 ? "s" : ""}`}>
      <ul className="space-y-3">
        {data.titles.map((t, i) => (
          <li key={`${t.title}-${i}`} className="flex gap-4 rounded-card bg-card p-3.5 shadow-card animate-fade-up">
            <ItemImage src={t.posterUrl} category={t.kind === "series" ? "SERIES" : "MOVIES"} className="h-32 w-[5.5rem] shrink-0 rounded-xl" emojiClassName="text-3xl" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold leading-tight tracking-tight">{t.title}</p>
              <p className="mt-0.5 text-sm font-semibold text-muted">{[t.year ?? "Année non disponible", t.genres.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}</p>
              {t.overview ? <p className="mt-2 line-clamp-3 text-sm text-ink/80">{t.overview}</p> : null}
              {t.cast.length ? <p className="mt-1.5 text-xs text-muted">Avec {t.cast.slice(0, 3).join(", ")}</p> : null}
              <p className="mt-1.5 text-xs text-muted">
                Où regarder : {t.streamingPlatforms.length ? t.streamingPlatforms.join(", ") : NOT_AVAILABLE.toLowerCase()}
              </p>
              <div className="mt-3">
                <ListToggle itemId={itemId} entityRef={i} entry={entries[key(i)] ?? null} addLabel="Watchlist" addedLabel="Dans ma watchlist" doneLabel="Vu" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <LockedPreview count={lockedCount} noun="titre" />
    </Block>
  );
}

export function BooksView({ itemId, data, lockedCount, entries }: { itemId: string; data: BooksData; lockedCount: number; entries: Entries }) {
  return (
    <Block title="Livres">
      <ul className="space-y-3">
        {data.books.map((b, i) => (
          <li key={`${b.title}-${i}`} className="flex gap-4 rounded-card bg-card p-3.5 shadow-card animate-fade-up">
            <ItemImage src={b.coverUrl} category="BOOKS" className="h-32 w-[5.5rem] shrink-0 rounded-xl" emojiClassName="text-3xl" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold leading-tight tracking-tight">{b.title}</p>
              <p className="mt-0.5 text-sm font-semibold text-muted">{b.author ?? "Auteur non disponible"}{b.year ? ` · ${b.year}` : ""}</p>
              {b.genres.length ? <p className="mt-1 text-xs text-muted">{b.genres.join(", ")}</p> : null}
              {b.description ? <p className="mt-2 line-clamp-3 text-sm text-ink/80">{b.description}</p> : null}
              <div className="mt-3">
                <ListToggle itemId={itemId} entityRef={i} entry={entries[key(i)] ?? null} addLabel="À lire" addedLabel="Dans mes lectures" doneLabel="Lu" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <LockedPreview count={lockedCount} noun="livre" />
    </Block>
  );
}

export function ProductsView({ itemId, data, lockedCount, entries, sourceUrl }: { itemId: string; data: ProductsData; lockedCount: number; entries: Entries; sourceUrl: string | null }) {
  return (
    <Block title={data.products.length > 1 ? "Produits" : "Produit"}>
      <ul className="space-y-3">
        {data.products.map((p, i) => (
          <li key={`${p.name}-${i}`} className="rounded-card bg-card p-4 shadow-card animate-fade-up">
            <div className="flex gap-4">
              <ItemImage src={p.imageUrl} category="PRODUCTS" className="h-20 w-20 shrink-0 rounded-xl" emojiClassName="text-3xl" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{p.brand ?? "Marque non disponible"}</p>
                <p className="text-lg font-extrabold leading-tight tracking-tight">{p.name}</p>
                <p className={p.price == null ? "mt-1 text-sm text-subtle" : "mt-1 font-extrabold text-accent-strong"}>{money(p.price, p.currency)}</p>
              </div>
            </div>
            {p.description ? <p className="mt-3 text-sm text-ink/80">{p.description}</p> : null}
            {p.features.length ? (
              <div className="mt-3">
                <Chips values={p.features} />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ListToggle itemId={itemId} entityRef={i} entry={entries[key(i)] ?? null} addLabel="Wishlist" addedLabel="Dans ma wishlist" variant="accent" />
              {p.url ?? sourceUrl ? (
                <a href={(p.url ?? sourceUrl)!} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-semibold hover:bg-hover">
                  Ouvrir la source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <LockedPreview count={lockedCount} noun="produit" />
    </Block>
  );
}

export function FashionView({ itemId, data, entries }: { itemId: string; data: FashionData; entries: Entries }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-2.5">
        <Fact label="Style" value={data.style} />
        <Fact label="Occasions" value={data.occasions.join(", ") || null} />
      </div>
      <Block title="Couleurs">
        <Chips values={data.colors} />
      </Block>
      <Block title="Pièces du look">
        {data.pieces.length ? (
          <ul className="space-y-2.5">
            {data.pieces.map((p, i) => (
              <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 rounded-card bg-card p-3.5 shadow-card">
                <div className="min-w-0">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-muted">{[p.brand ?? "Marque non disponible", p.color, p.price != null ? money(p.price, p.currency) : null].filter(Boolean).join(" · ")}</p>
                </div>
                <ListToggle itemId={itemId} entityRef={i} entry={entries[key(i)] ?? null} addLabel="Wishlist" addedLabel="Ajouté" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">Aucune pièce précise n&apos;est identifiable dans ce contenu.</p>
        )}
      </Block>
    </div>
  );
}

export function DecorView({ itemId, data, entries }: { itemId: string; data: DecorData; entries: Entries }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-2.5">
        <Fact label="Style" value={data.style} />
        <Fact label="Pièces" value={data.rooms.join(", ") || null} />
      </div>
      <Block title="Palette">
        <Chips values={data.colors} />
      </Block>
      <Block title="Objets & mobilier">
        {data.objects.length ? (
          <ul className="space-y-2.5">
            {data.objects.map((o, i) => (
              <li key={`${o.name}-${i}`} className="flex items-center justify-between gap-3 rounded-card bg-card p-3.5 shadow-card">
                <div className="min-w-0">
                  <p className="font-bold">{o.name}</p>
                  <p className="text-xs text-muted">{[o.material, o.color, o.brand, o.price != null ? money(o.price, o.currency) : null].filter(Boolean).join(" · ") || NOT_AVAILABLE}</p>
                </div>
                <ListToggle itemId={itemId} entityRef={i} entry={entries[key(i)] ?? null} addLabel="Wishlist" addedLabel="Ajouté" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">Aucun objet précis n&apos;est identifiable dans ce contenu.</p>
        )}
      </Block>
    </div>
  );
}

const LEVEL = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" } as const;

export function FitnessView({ itemId, data, entries }: { itemId: string; data: FitnessData; entries: Entries }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Fact label="Objectif" value={data.goal} />
        <Fact label="Niveau" value={data.level ? LEVEL[data.level] : null} />
        <Fact label="Durée" value={formatMinutes(data.durationMinutes)} />
        <Fact label="Matériel" value={data.equipment.length ? data.equipment.join(", ") : null} />
      </div>
      <ListToggle itemId={itemId} entityRef={null} entry={entries[key(null)] ?? null} addLabel="Ajouter à ma séance" addedLabel="Dans ma séance" doneLabel="Faite" size="lg" variant="accent" />
      <Block title="Routine">
        <ol className="space-y-2.5">
          {data.exercises.map((e, i) => (
            <li key={`${e.name}-${i}`} className="flex items-center gap-4 rounded-card bg-card p-4 shadow-card">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-extrabold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{e.name}</p>
                <p className="text-sm text-muted">
                  {[
                    e.sets ? `${e.sets} séries` : null,
                    e.reps ? `${e.reps} répétitions` : null,
                    e.durationSeconds ? `${e.durationSeconds} s` : null,
                    e.restSeconds ? `repos ${e.restSeconds} s` : null,
                    e.muscleGroup,
                  ]
                    .filter(Boolean)
                    .join(" · ") || NOT_AVAILABLE}
                </p>
                {e.notes ? <p className="mt-0.5 text-xs text-muted">{e.notes}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </Block>
    </div>
  );
}

export function OtherView({ data }: { data: OtherData }) {
  return (
    <Block title="À retenir">
      <ul className="space-y-2">
        {data.keyPoints.map((p) => (
          <li key={p} className="rounded-card bg-card p-4 shadow-card">
            {p}
          </li>
        ))}
      </ul>
    </Block>
  );
}
