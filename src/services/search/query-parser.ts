import type { Category } from "@/config/categories";
import { normalizeText } from "@/lib/utils";

/**
 * Natural-language query understanding for V1.
 * "mes restaurants japonais à Paris" → categories [PLACES, TRAVEL], terms [japonais, paris, restaurant]
 * The output feeds Postgres full-text search (or the local store scorer).
 * Designed to be replaced/augmented by embeddings (see match_content_items).
 */

const CATEGORY_KEYWORDS: { words: string[]; categories: Category[]; keepAsTerm?: boolean }[] = [
  { words: ["recette", "recettes", "cuisine", "plat", "plats", "dessert", "desserts", "diner", "dejeuner"], categories: ["RECIPES"] },
  { words: ["voyage", "voyages", "trip", "vacances", "week", "weekend", "itineraire"], categories: ["TRAVEL"] },
  {
    words: ["restaurant", "restaurants", "resto", "restos", "cafe", "cafes", "bar", "bars", "brunch", "endroit", "endroits", "lieu", "lieux", "adresse", "adresses", "visiter", "hotel", "hotels"],
    categories: ["PLACES", "TRAVEL"],
    keepAsTerm: true,
  },
  { words: ["produit", "produits", "acheter", "achat", "achats", "shopping", "wishlist"], categories: ["PRODUCTS", "FASHION", "HOME_DECOR"] },
  { words: ["film", "films", "cinema", "movie", "movies"], categories: ["MOVIES"] },
  { words: ["serie", "series"], categories: ["SERIES"] },
  { words: ["livre", "livres", "lecture", "lire", "roman", "romans", "bouquin", "bouquins"], categories: ["BOOKS"] },
  { words: ["mode", "look", "looks", "tenue", "tenues", "outfit", "outfits", "vetement", "vetements", "style"], categories: ["FASHION"] },
  { words: ["deco", "decoration", "interieur", "appartement", "salon", "chambre", "meuble", "meubles"], categories: ["HOME_DECOR"] },
  { words: ["fitness", "sport", "workout", "seance", "seances", "exercice", "exercices", "entrainement", "muscu", "musculation"], categories: ["FITNESS"] },
];

const QUICK_WORDS = new Set(["rapide", "rapides", "express", "vite"]);

const STOPWORDS = new Set(
  "mes mon ma les le la l des de du d un une et ou a au aux en dans pour sur avec que qui je j veux voudrais aimerais tous toutes tout mes idees idee que quoi ce ces cet cette y faire voir sont est trouver trouve montre moi my the of in".split(
    " ",
  ),
);

export interface ParsedQuery {
  raw: string;
  terms: string[];
  categories: Category[] | null;
  maxTotalMinutes: number | null;
}

/** Very light French singularization so "japonais" / "restaurants" match stems. */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("is")) return word.slice(0, -1);
  if (word.length > 4 && word.endsWith("x")) return word.slice(0, -1);
  return word;
}

export function parseSearchQuery(raw: string): ParsedQuery {
  const words = normalizeText(raw).split(" ").filter(Boolean);
  const categories = new Set<Category>();
  const terms: string[] = [];
  let maxTotalMinutes: number | null = null;

  for (const word of words) {
    if (QUICK_WORDS.has(word)) {
      categories.add("RECIPES");
      maxTotalMinutes = 30;
      continue;
    }
    const match = CATEGORY_KEYWORDS.find((k) => k.words.includes(word));
    if (match) {
      match.categories.forEach((c) => categories.add(c));
      if (match.keepAsTerm) terms.push(stem(word));
      continue;
    }
    if (STOPWORDS.has(word) || word.length < 2) continue;
    terms.push(stem(word));
  }

  // A term such as "restaurant" alone should filter by category, not require the word.
  const keptTerms = [...new Set(terms)].filter((t) => /^[a-z0-9]+$/.test(t)).slice(0, 8);
  return {
    raw,
    terms: keptTerms,
    categories: categories.size ? [...categories] : null,
    maxTotalMinutes,
  };
}
