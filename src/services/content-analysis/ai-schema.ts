import { z } from "zod";
import { CATEGORIES } from "@/config/categories";
import { PLACE_KINDS } from "@/types/schemas";

/**
 * Schema the LLM must fill (structured output). Deliberately flat and
 * constraint-free so it maps cleanly to JSON Schema; every field is nullable
 * and only the block matching `category` is filled. The result is then
 * converted and validated against the strict domain schemas.
 */
const s = z.string().nullable();
const n = z.number().nullable();
const list = z.array(z.string());

const AiPlace = z.object({
  name: z.string(),
  kind: z.enum(PLACE_KINDS),
  description: s,
  address: s,
  city: s,
  country: s,
  priceText: s,
  cuisine: s,
});

export const AiEnvelopeSchema = z.object({
  category: z.enum(CATEGORIES),
  confidence: z.number(),
  title: z.string(),
  summary: z.string(),
  tags: list,
  recipe: z
    .object({
      description: s,
      prepMinutes: n,
      cookMinutes: n,
      totalMinutes: n,
      servings: n,
      difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
      ingredients: z.array(z.object({ name: z.string(), quantity: n, unit: s, note: s })),
      steps: list,
      tips: list,
    })
    .nullable(),
  travel: z
    .object({
      destination: s,
      country: s,
      cities: list,
      durationDays: n,
      bestPeriod: s,
      budgetText: s,
      places: z.array(AiPlace),
    })
    .nullable(),
  places: z.object({ city: s, country: s, places: z.array(AiPlace) }).nullable(),
  products: z
    .array(
      z.object({
        brand: s,
        name: z.string(),
        productCategory: s,
        description: s,
        price: n,
        currency: s,
        url: s,
        features: list,
      }),
    )
    .nullable(),
  screen: z
    .array(
      z.object({
        kind: z.enum(["movie", "series"]),
        title: z.string(),
        year: n,
        genres: list,
        overview: s,
        cast: list,
        streamingPlatforms: list,
      }),
    )
    .nullable(),
  books: z
    .array(z.object({ title: z.string(), author: s, genres: list, description: s, year: n }))
    .nullable(),
  fashion: z
    .object({
      style: s,
      colors: list,
      occasions: list,
      pieces: z.array(
        z.object({ name: z.string(), brand: s, pieceCategory: s, color: s, price: n, currency: s }),
      ),
    })
    .nullable(),
  decor: z
    .object({
      style: s,
      colors: list,
      rooms: list,
      objects: z.array(
        z.object({ name: z.string(), brand: s, objectCategory: s, material: s, color: s, price: n, currency: s }),
      ),
    })
    .nullable(),
  fitness: z
    .object({
      goal: s,
      level: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
      durationMinutes: n,
      muscleGroups: list,
      equipment: list,
      exercises: z.array(
        z.object({
          name: z.string(),
          sets: n,
          reps: s,
          durationSeconds: n,
          restSeconds: n,
          muscleGroup: s,
          notes: s,
        }),
      ),
    })
    .nullable(),
  other: z.object({ keyPoints: list }).nullable(),
  /** Every place mentioned, whatever the category (a look shot in a park, a recipe from a restaurant…). */
  locations: z.array(AiPlace),
});
export type AiEnvelope = z.infer<typeof AiEnvelopeSchema>;

/**
 * The full envelope above is too large to be compiled as one structured-output
 * grammar. The AI therefore answers in two small steps:
 *   1. the category only,
 *   2. the fields of THAT category (+ the places mentioned, for non-place categories).
 */
export const AiCategoryStepSchema = z.object({ category: z.enum(CATEGORIES), confidence: z.number() });

type BlockKey = "recipe" | "travel" | "places" | "products" | "screen" | "books" | "fashion" | "decor" | "fitness" | "other";

export const BLOCK_FOR_CATEGORY: Record<(typeof CATEGORIES)[number], BlockKey> = {
  RECIPES: "recipe",
  TRAVEL: "travel",
  PLACES: "places",
  PRODUCTS: "products",
  MOVIES: "screen",
  SERIES: "screen",
  BOOKS: "books",
  FASHION: "fashion",
  HOME_DECOR: "decor",
  FITNESS: "fitness",
  OTHER: "other",
};

/** Step-2 schema: common fields + the single block of the chosen category. */
export function detailStepSchema(category: (typeof CATEGORIES)[number], includeLocations = true) {
  const key = BLOCK_FOR_CATEGORY[category];
  const block = (AiEnvelopeSchema.shape[key] as z.ZodNullable<z.ZodType>).unwrap();
  const withLocations = includeLocations && category !== "TRAVEL" && category !== "PLACES";
  return z.object({
    title: z.string(),
    summary: z.string(),
    tags: list,
    confidence: z.number(),
    [key]: block,
    ...(withLocations ? { locations: z.array(AiPlace) } : {}),
  });
}

const EMPTY_BLOCKS = {
  recipe: null,
  travel: null,
  places: null,
  products: null,
  screen: null,
  books: null,
  fashion: null,
  decor: null,
  fitness: null,
  other: null,
};

/** Rebuilds the full envelope from the two steps. */
export function assembleEnvelope(category: (typeof CATEGORIES)[number], detail: Record<string, unknown>): AiEnvelope {
  const key = BLOCK_FOR_CATEGORY[category];
  return AiEnvelopeSchema.parse({
    ...EMPTY_BLOCKS,
    category,
    confidence: detail.confidence,
    title: detail.title,
    summary: detail.summary,
    tags: detail.tags ?? [],
    [key]: detail[key] ?? null,
    locations: Array.isArray(detail.locations) ? detail.locations : [],
  });
}
