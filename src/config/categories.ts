export const CATEGORIES = [
  "RECIPES",
  "TRAVEL",
  "PLACES",
  "PRODUCTS",
  "MOVIES",
  "SERIES",
  "BOOKS",
  "FASHION",
  "HOME_DECOR",
  "FITNESS",
  "OTHER",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CategoryMeta {
  id: Category;
  label: string;
  plural: string;
  emoji: string;
  /** Slug used in URLs (?category=recettes). */
  slug: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  RECIPES: { id: "RECIPES", label: "Recette", plural: "Recettes", emoji: "🍝", slug: "recettes" },
  TRAVEL: { id: "TRAVEL", label: "Voyage", plural: "Voyages", emoji: "✈️", slug: "voyages" },
  PLACES: { id: "PLACES", label: "Lieu", plural: "Lieux", emoji: "📍", slug: "lieux" },
  PRODUCTS: { id: "PRODUCTS", label: "Produit", plural: "Produits", emoji: "🛍️", slug: "produits" },
  MOVIES: { id: "MOVIES", label: "Film", plural: "Films", emoji: "🎬", slug: "films" },
  SERIES: { id: "SERIES", label: "Série", plural: "Séries", emoji: "📺", slug: "series" },
  BOOKS: { id: "BOOKS", label: "Livre", plural: "Livres", emoji: "📚", slug: "livres" },
  FASHION: { id: "FASHION", label: "Mode", plural: "Mode", emoji: "👕", slug: "mode" },
  HOME_DECOR: { id: "HOME_DECOR", label: "Déco", plural: "Déco", emoji: "🛋️", slug: "deco" },
  FITNESS: { id: "FITNESS", label: "Fitness", plural: "Fitness", emoji: "💪", slug: "fitness" },
  OTHER: { id: "OTHER", label: "Autre", plural: "Autres", emoji: "✨", slug: "autres" },
};

/** Library navigation order (films + séries are grouped under "Films"). */
export const LIBRARY_TABS: { slug: string; label: string; categories: Category[] }[] = [
  { slug: "tout", label: "Tout", categories: [] },
  { slug: "recettes", label: "Recettes", categories: ["RECIPES"] },
  { slug: "voyages", label: "Voyages", categories: ["TRAVEL"] },
  { slug: "lieux", label: "Lieux", categories: ["PLACES"] },
  { slug: "produits", label: "Produits", categories: ["PRODUCTS"] },
  { slug: "films", label: "Films", categories: ["MOVIES", "SERIES"] },
  { slug: "livres", label: "Livres", categories: ["BOOKS"] },
  { slug: "mode", label: "Mode", categories: ["FASHION"] },
  { slug: "deco", label: "Déco", categories: ["HOME_DECOR"] },
  { slug: "fitness", label: "Fitness", categories: ["FITNESS"] },
];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

export const ONBOARDING_INTERESTS = [
  { id: "travel", label: "Voyages", emoji: "✈️" },
  { id: "food", label: "Food", emoji: "🍝" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "movies", label: "Films", emoji: "🎬" },
  { id: "fashion", label: "Mode", emoji: "👕" },
  { id: "decor", label: "Déco", emoji: "🛋️" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "books", label: "Livres", emoji: "📚" },
  { id: "other", label: "Autre", emoji: "✨" },
] as const;
