import { ArrowRight, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { CategoryBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ItemImage } from "@/components/ui/item-image";
import { pluralize } from "@/lib/utils";
import { deriveEntities } from "@/services/entity-extraction";
import type { ContentItem } from "@/types/domain";
import type { StructuredData } from "@/types/schemas";

/** What was generated, as counts ("12 ingrédients", "6 étapes"). Only real, non-zero numbers. */
function generatedFacts(data: StructuredData): string[] {
  const facts: (string | null)[] = (() => {
    switch (data.category) {
      case "RECIPES":
        return [
          data.recipe.ingredients.length ? pluralize(data.recipe.ingredients.length, "ingrédient") : null,
          data.recipe.steps.length ? pluralize(data.recipe.steps.length, "étape") : null,
          data.recipe.tips.length ? pluralize(data.recipe.tips.length, "astuce") : null,
        ];
      case "TRAVEL":
        return [pluralize(data.travel.places.length, "lieu", "lieux"), data.travel.durationDays ? pluralize(data.travel.durationDays, "jour") : null];
      case "PLACES":
        return [pluralize(data.places.places.length, "adresse")];
      case "PRODUCTS":
        return [pluralize(data.products.products.length, "produit")];
      case "MOVIES":
        return [pluralize(data.screen.titles.length, "film")];
      case "SERIES":
        return [pluralize(data.screen.titles.length, "série")];
      case "BOOKS":
        return [pluralize(data.books.books.length, "livre")];
      case "FASHION":
        return [pluralize(data.fashion.pieces.length, "pièce")];
      case "HOME_DECOR":
        return [pluralize(data.decor.objects.length, "objet")];
      case "FITNESS":
        return [pluralize(data.fitness.exercises.length, "exercice")];
      case "OTHER":
        return [data.other.keyPoints.length ? pluralize(data.other.keyPoints.length, "point clé", "points clés") : null];
    }
  })();
  return facts.filter((f): f is string => Boolean(f) && !f!.startsWith("0 "));
}

const ACTION_LABEL: Record<StructuredData["category"], string> = {
  RECIPES: "Liste de courses en 1 clic",
  TRAVEL: "Itinéraire jour par jour et carte",
  PLACES: "Carte de toutes les adresses",
  PRODUCTS: "Liste d'envies",
  MOVIES: "Liste « À regarder »",
  SERIES: "Liste « À regarder »",
  BOOKS: "Liste de lecture",
  FASHION: "Liste d'envies",
  HOME_DECOR: "Liste d'envies",
  FITNESS: "Séance prête à suivre",
  OTHER: "Fiche résumée et rangée",
};

/**
 * Card generated during onboarding, shown to a user without a subscription:
 * header + first entries visible, the rest blurred. Only the first entries'
 * names reach the browser — the blurred rows are placeholders, not real data.
 */
export function LockedPreview({ item }: { item: ContentItem }) {
  const entities = deriveEntities(item.data);
  const visible = entities.slice(0, 2);
  const hidden = Math.max(entities.length - visible.length, 0);
  const facts = generatedFacts(item.data);
  const paywallHref = `/premium?reason=preview&next=${encodeURIComponent(`/items/${item.id}`)}`;

  return (
    <div className="mx-auto max-w-xl pb-10">
      <div className="mb-5 flex items-center gap-3 rounded-card bg-success-soft p-4 animate-pop">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="font-extrabold text-success">Ta fiche est prête.</p>
          <p className="text-sm text-ink/80">{facts.length ? `${facts.join(" · ")} trouvés dans ton lien.` : "Créée à partir des informations publiques de ton lien."}</p>
        </div>
      </div>

      <ItemImage
        src={item.imageUrl}
        category={item.category}
        alt=""
        className={item.imageUrl ? "aspect-[4/3] w-full rounded-[1.75rem] shadow-card" : "aspect-[16/7] w-full rounded-[1.75rem]"}
        emojiClassName="text-6xl"
      />
      <div className="mt-5">
        <CategoryBadge category={item.category} />
        <h1 className="mt-3 text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.03em]">{item.title}</h1>
        <p className="mt-3 line-clamp-2 text-[1.02rem] leading-relaxed text-ink/80">{item.summary}</p>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-card p-5 shadow-card">
        <ul className="space-y-3">
          {visible.map((e) => (
            <li key={e.ref} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
              <span className="font-semibold">{e.name}</span>
            </li>
          ))}
          {Array.from({ length: Math.min(Math.max(hidden, 3), 6) }, (_, i) => (
            <li key={`blur-${i}`} aria-hidden className="flex select-none items-center gap-3 blur-[5px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent/60" />
              <span className="h-3.5 rounded-full bg-ink/15" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            </li>
          ))}
        </ul>
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/90 to-transparent" />
        <div className="relative -mt-10 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-ink text-white">
            <Lock className="h-5 w-5" />
          </span>
          <p className="mt-3 font-extrabold">{hidden > 0 ? `+ ${pluralize(hidden, "élément")} à découvrir` : "Ta fiche complète t'attend"}</p>
          <p className="mt-1 text-sm text-muted">{ACTION_LABEL[item.category]}, sauvegarde et collections.</p>
        </div>
      </div>

      <Link href={paywallHref} className={buttonClass("accent", "lg", "mt-6 w-full")}>
        Voir ma fiche complète <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
