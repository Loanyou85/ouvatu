import { formatMinutes, pluralize } from "@/lib/utils";
import { placeBreakdown } from "@/services/travel/stats";
import type { StructuredData } from "@/types/schemas";

/** Short facts shown on cards: "7 lieux détectés", "25 min · 4 pers."… */
export function itemHighlights(data: StructuredData, lockedCount = 0): string[] {
  switch (data.category) {
    case "RECIPES": {
      const r = data.recipe;
      return [
        formatMinutes(r.totalMinutes),
        r.servings ? `${r.servings} pers.` : null,
        r.ingredients.length ? pluralize(r.ingredients.length, "ingrédient") : null,
      ].filter((x): x is string => Boolean(x));
    }
    case "TRAVEL": {
      const total = data.travel.places.length + lockedCount;
      return [
        total ? `${pluralize(total, "lieu", "lieux")} détecté${total > 1 ? "s" : ""}` : null,
        data.travel.durationDays ? pluralize(data.travel.durationDays, "jour") : null,
      ].filter((x): x is string => Boolean(x));
    }
    case "PLACES": {
      const b = placeBreakdown(data.places.places);
      return [lockedCount ? pluralize(data.places.places.length + lockedCount, "lieu", "lieux") : b[0]?.label, data.places.city].filter(
        (x): x is string => Boolean(x),
      );
    }
    case "PRODUCTS":
      return [pluralize(data.products.products.length + lockedCount, "produit")];
    case "MOVIES":
    case "SERIES": {
      const n = data.screen.titles.length + lockedCount;
      return [pluralize(n, data.category === "SERIES" ? "série" : "film")];
    }
    case "BOOKS":
      return [pluralize(data.books.books.length + lockedCount, "livre")];
    case "FITNESS":
      return [pluralize(data.fitness.exercises.length, "exercice"), formatMinutes(data.fitness.durationMinutes)].filter(
        (x): x is string => Boolean(x),
      );
    case "FASHION":
      return [data.fashion.style, data.fashion.pieces.length ? pluralize(data.fashion.pieces.length, "pièce") : null].filter(
        (x): x is string => Boolean(x),
      );
    case "HOME_DECOR":
      return [data.decor.style, data.decor.objects.length ? pluralize(data.decor.objects.length, "objet") : null].filter(
        (x): x is string => Boolean(x),
      );
    default:
      return [];
  }
}
