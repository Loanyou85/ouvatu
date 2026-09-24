import { z } from "zod";
import { CATEGORIES } from "@/config/categories";

/**
 * Domain schemas for structured data. Every AI output is validated against
 * these before being stored. `null` always means "information not available"
 * — the UI renders it as such and nothing is ever invented to fill it.
 */

const str = z.string().trim().min(1).max(600);
const nstr = str.nullable();
const longText = z.string().trim().min(1).max(4000).nullable();
const nnum = z.number().finite().nullable();
const strList = z.array(z.string().trim().min(1).max(120)).max(40);

export const CategorySchema = z.enum(CATEGORIES);

export const PlatformSchema = z.enum(["tiktok", "instagram", "youtube", "pinterest", "web"]);
export type Platform = z.infer<typeof PlatformSchema>;

// ---------- Recipes ----------
export const IngredientSchema = z.object({
  name: str,
  quantity: nnum,
  unit: nstr,
  note: nstr,
});
export type Ingredient = z.infer<typeof IngredientSchema>;

export const RecipeDataSchema = z.object({
  description: longText,
  prepMinutes: nnum,
  cookMinutes: nnum,
  totalMinutes: nnum,
  servings: nnum,
  difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
  ingredients: z.array(IngredientSchema).max(80),
  steps: z.array(z.object({ text: z.string().trim().min(1).max(1500) })).max(60),
  tips: z.array(z.string().trim().min(1).max(600)).max(20),
});
export type RecipeData = z.infer<typeof RecipeDataSchema>;

// ---------- Places / Travel ----------
export const PLACE_KINDS = [
  "sight",
  "restaurant",
  "cafe",
  "bar",
  "activity",
  "hotel",
  "beach",
  "museum",
  "shop",
  "park",
  "viewpoint",
  "other",
] as const;
export const PlaceKindSchema = z.enum(PLACE_KINDS);
export type PlaceKind = z.infer<typeof PlaceKindSchema>;

export const GeoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Where the coordinates come from. Never the AI. */
  provider: z.string().max(40),
  /** Human label returned by the geocoder (not an invented address). */
  label: nstr,
});
export type Geo = z.infer<typeof GeoSchema>;

export const PlaceSchema = z.object({
  name: str,
  kind: PlaceKindSchema,
  description: longText,
  address: nstr,
  city: nstr,
  country: nstr,
  priceText: nstr,
  cuisine: nstr,
  url: nstr,
  geo: GeoSchema.nullable(),
});
export type Place = z.infer<typeof PlaceSchema>;

export const TravelDataSchema = z.object({
  destination: nstr,
  country: nstr,
  cities: strList,
  durationDays: nnum,
  bestPeriod: nstr,
  budgetText: nstr,
  places: z.array(PlaceSchema).max(60),
});
export type TravelData = z.infer<typeof TravelDataSchema>;

export const PlacesDataSchema = z.object({
  city: nstr,
  country: nstr,
  places: z.array(PlaceSchema).min(1).max(60),
});
export type PlacesData = z.infer<typeof PlacesDataSchema>;

// ---------- Products ----------
export const ProductSchema = z.object({
  brand: nstr,
  name: str,
  productCategory: nstr,
  description: longText,
  price: nnum,
  currency: z.string().trim().max(8).nullable(),
  url: nstr,
  imageUrl: nstr,
  features: strList,
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductsDataSchema = z.object({
  products: z.array(ProductSchema).min(1).max(40),
});
export type ProductsData = z.infer<typeof ProductsDataSchema>;

// ---------- Movies / Series ----------
export const ScreenTitleSchema = z.object({
  kind: z.enum(["movie", "series"]),
  title: str,
  year: z.number().int().min(1870).max(2100).nullable(),
  genres: strList,
  overview: longText,
  posterUrl: nstr,
  cast: strList,
  streamingPlatforms: strList,
  externalId: nstr,
});
export type ScreenTitle = z.infer<typeof ScreenTitleSchema>;

export const ScreenDataSchema = z.object({
  titles: z.array(ScreenTitleSchema).min(1).max(40),
});
export type ScreenData = z.infer<typeof ScreenDataSchema>;

// ---------- Books ----------
export const BookSchema = z.object({
  title: str,
  author: nstr,
  coverUrl: nstr,
  genres: strList,
  description: longText,
  year: z.number().int().min(-3000).max(2100).nullable(),
});
export type Book = z.infer<typeof BookSchema>;

export const BooksDataSchema = z.object({
  books: z.array(BookSchema).min(1).max(40),
});
export type BooksData = z.infer<typeof BooksDataSchema>;

// ---------- Fashion ----------
export const FashionPieceSchema = z.object({
  name: str,
  brand: nstr,
  pieceCategory: nstr,
  color: nstr,
  price: nnum,
  currency: z.string().trim().max(8).nullable(),
  url: nstr,
});
export const FashionDataSchema = z.object({
  style: nstr,
  colors: strList,
  occasions: strList,
  pieces: z.array(FashionPieceSchema).max(40),
});
export type FashionData = z.infer<typeof FashionDataSchema>;

// ---------- Home decor ----------
export const DecorObjectSchema = z.object({
  name: str,
  brand: nstr,
  objectCategory: nstr,
  material: nstr,
  color: nstr,
  price: nnum,
  currency: z.string().trim().max(8).nullable(),
});
export const DecorDataSchema = z.object({
  style: nstr,
  colors: strList,
  rooms: strList,
  objects: z.array(DecorObjectSchema).max(40),
});
export type DecorData = z.infer<typeof DecorDataSchema>;

// ---------- Fitness ----------
export const ExerciseSchema = z.object({
  name: str,
  sets: nnum,
  reps: nstr,
  durationSeconds: nnum,
  restSeconds: nnum,
  muscleGroup: nstr,
  notes: nstr,
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const FitnessDataSchema = z.object({
  goal: nstr,
  level: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
  durationMinutes: nnum,
  muscleGroups: strList,
  equipment: strList,
  exercises: z.array(ExerciseSchema).min(1).max(40),
});
export type FitnessData = z.infer<typeof FitnessDataSchema>;

// ---------- Other ----------
export const OtherDataSchema = z.object({
  keyPoints: z.array(z.string().trim().min(1).max(400)).max(20),
});
export type OtherData = z.infer<typeof OtherDataSchema>;

/** Discriminated union of all structured payloads. */
export const StructuredDataSchema = z.discriminatedUnion("category", [
  z.object({ category: z.literal("RECIPES"), recipe: RecipeDataSchema }),
  z.object({ category: z.literal("TRAVEL"), travel: TravelDataSchema }),
  z.object({ category: z.literal("PLACES"), places: PlacesDataSchema }),
  z.object({ category: z.literal("PRODUCTS"), products: ProductsDataSchema }),
  z.object({ category: z.literal("MOVIES"), screen: ScreenDataSchema }),
  z.object({ category: z.literal("SERIES"), screen: ScreenDataSchema }),
  z.object({ category: z.literal("BOOKS"), books: BooksDataSchema }),
  z.object({ category: z.literal("FASHION"), fashion: FashionDataSchema }),
  z.object({ category: z.literal("HOME_DECOR"), decor: DecorDataSchema }),
  z.object({ category: z.literal("FITNESS"), fitness: FitnessDataSchema }),
  z.object({ category: z.literal("OTHER"), other: OtherDataSchema }),
]);
export type StructuredData = z.infer<typeof StructuredDataSchema>;

/** Generic envelope produced by the analysis pipeline (after validation). */
export const AnalysisResultSchema = z.object({
  category: CategorySchema,
  confidence: z.number().min(0).max(1),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1200),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  structuredData: StructuredDataSchema,
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
