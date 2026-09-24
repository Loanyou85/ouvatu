import { normalizeText } from "@/lib/utils";
import type { Entity, EntityType } from "@/types/domain";
import type { AnalysisResult, PlaceKind, StructuredData } from "@/types/schemas";

const PLACE_ENTITY: Partial<Record<PlaceKind, EntityType>> = {
  restaurant: "restaurant",
  cafe: "cafe",
  bar: "restaurant",
  activity: "activity",
  hotel: "hotel",
};

/** Entities are derived from validated structured data (never from raw AI text). */
export function deriveEntities(data: StructuredData): Entity[] {
  switch (data.category) {
    case "TRAVEL":
      return data.travel.places.map((p, ref) => ({ type: PLACE_ENTITY[p.kind] ?? "place", name: p.name, ref }));
    case "PLACES":
      return data.places.places.map((p, ref) => ({ type: PLACE_ENTITY[p.kind] ?? "place", name: p.name, ref }));
    case "PRODUCTS":
      return data.products.products.map((p, ref) => ({ type: "product", name: p.brand ? `${p.brand} ${p.name}` : p.name, ref }));
    case "MOVIES":
    case "SERIES":
      return data.screen.titles.map((s, ref) => ({ type: s.kind === "series" ? "series" : "movie", name: s.title, ref }));
    case "BOOKS":
      return data.books.books.map((b, ref) => ({ type: "book", name: b.title, ref }));
    case "FITNESS":
      return data.fitness.exercises.map((e, ref) => ({ type: "exercise", name: e.name, ref }));
    case "FASHION":
      return data.fashion.pieces.map((p, ref) => ({ type: "garment", name: p.name, ref }));
    case "HOME_DECOR":
      return data.decor.objects.map((o, ref) => ({ type: "decor_object", name: o.name, ref }));
    case "RECIPES":
      return data.recipe.ingredients.map((i, ref) => ({ type: "ingredient", name: i.name, ref }));
    default:
      return [];
  }
}

/** Main list length used for "N éléments détectés" and premium previews. */
export function countDetected(data: StructuredData): number {
  return data.category === "RECIPES" ? data.recipe.ingredients.length : deriveEntities(data).length;
}

// ---------------------------------------------------------------------------
// Grounding guard — removes facts that do not appear in the source material.
// ---------------------------------------------------------------------------

function priceAppears(price: number, corpus: string): boolean {
  const variants = new Set([
    String(price),
    price.toFixed(2),
    price.toFixed(2).replace(".", ","),
    String(price).replace(".", ","),
    Number.isInteger(price) ? `${price},00` : "",
  ]);
  return [...variants].some((v) => v && new RegExp(`(^|[^0-9])${v.replace(/[.]/g, "\\.")}([^0-9]|$)`).test(corpus));
}

function textAppears(value: string, normCorpus: string): boolean {
  const tokens = normalizeText(value)
    .split(" ")
    .filter((tok) => tok.length > 2 || /\d/.test(tok));
  if (tokens.length === 0) return false;
  const needed = tokens.slice(0, 3);
  return needed.every((tok) => normCorpus.includes(tok));
}

/**
 * Enforce "no invented data": prices, addresses, price ranges and streaming
 * platforms are kept only if they literally appear in the retrieved content.
 */
export function applyGrounding(result: AnalysisResult, corpus: string): AnalysisResult {
  const norm = normalizeText(corpus);
  const d = structuredClone(result.structuredData);

  const groundPrice = <T extends { price: number | null; currency: string | null }>(x: T): T =>
    x.price != null && !priceAppears(x.price, corpus) ? { ...x, price: null, currency: null } : x;

  switch (d.category) {
    case "TRAVEL":
    case "PLACES": {
      const places = d.category === "TRAVEL" ? d.travel.places : d.places.places;
      for (const p of places) {
        if (p.address && !textAppears(p.address, norm)) p.address = null;
        if (p.priceText && !textAppears(p.priceText, norm) && !corpus.includes(p.priceText)) p.priceText = null;
      }
      if (d.category === "TRAVEL" && d.travel.budgetText && !textAppears(d.travel.budgetText, norm)) d.travel.budgetText = null;
      break;
    }
    case "PRODUCTS":
      d.products.products = d.products.products.map(groundPrice);
      break;
    case "FASHION":
      d.fashion.pieces = d.fashion.pieces.map(groundPrice);
      break;
    case "HOME_DECOR":
      d.decor.objects = d.decor.objects.map(groundPrice);
      break;
    case "MOVIES":
    case "SERIES":
      for (const s of d.screen.titles) {
        s.streamingPlatforms = s.streamingPlatforms.filter((p) => norm.includes(normalizeText(p)));
      }
      break;
    default:
      break;
  }
  return { ...result, structuredData: d };
}
