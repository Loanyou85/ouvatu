import { AnalysisResultSchema, type AnalysisResult, type Place, type StructuredData } from "@/types/schemas";
import type { AiEnvelope } from "./ai-schema";
import { AnalysisError } from "./providers/types";

/** Trim, drop empty strings, and cap length — the LLM output is untrusted too. */
function t(value: string | null | undefined, max = 600): string | null {
  if (value == null) return null;
  const v = value.replace(/\s+/g, " ").trim();
  if (!v || /^(null|n\/a|inconnu|non disponible|information non disponible)$/i.test(v)) return null;
  return v.slice(0, max);
}
function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
function list(values: (string | null | undefined)[] | null | undefined, max = 40): string[] {
  return [...new Set((values ?? []).map((v) => t(v, 120)).filter((v): v is string => Boolean(v)))].slice(0, max);
}
function year(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 1000 && value < 2100 ? value : null;
}
function nonEmpty<T extends { name?: string; title?: string }>(items: T[]): T[] {
  return items.filter((i) => Boolean(t(i.name ?? i.title ?? null)));
}

type AiPlace = NonNullable<AiEnvelope["places"]>["places"][number];
function place(p: AiPlace): Place {
  return {
    name: t(p.name, 160)!,
    kind: p.kind,
    description: t(p.description, 1000),
    address: t(p.address, 300),
    city: t(p.city, 120),
    country: t(p.country, 120),
    priceText: t(p.priceText, 120),
    cuisine: t(p.cuisine, 80),
    url: null,
    geo: null,
  };
}

function toStructuredData(env: AiEnvelope): StructuredData {
  const other = (): StructuredData => ({
    category: "OTHER",
    other: { keyPoints: list(env.other?.keyPoints, 20).length ? list(env.other?.keyPoints, 20) : [t(env.summary, 400) ?? env.title] },
  });

  switch (env.category) {
    case "RECIPES": {
      const r = env.recipe;
      if (!r) return other();
      return {
        category: "RECIPES",
        recipe: {
          description: t(r.description, 2000),
          prepMinutes: num(r.prepMinutes),
          cookMinutes: num(r.cookMinutes),
          totalMinutes:
            num(r.totalMinutes) ??
            (num(r.prepMinutes) != null || num(r.cookMinutes) != null ? (num(r.prepMinutes) ?? 0) + (num(r.cookMinutes) ?? 0) : null),
          servings: num(r.servings),
          difficulty: r.difficulty,
          ingredients: nonEmpty(r.ingredients)
            .slice(0, 80)
            .map((i) => ({ name: t(i.name, 160)!, quantity: num(i.quantity), unit: t(i.unit, 40), note: t(i.note, 200) })),
          steps: list(r.steps, 60).map((text) => ({ text })),
          tips: list(r.tips, 20),
        },
      };
    }
    case "TRAVEL": {
      const tr = env.travel;
      if (!tr) return other();
      return {
        category: "TRAVEL",
        travel: {
          destination: t(tr.destination, 120),
          country: t(tr.country, 120),
          cities: list(tr.cities, 20),
          durationDays: num(tr.durationDays),
          bestPeriod: t(tr.bestPeriod, 120),
          budgetText: t(tr.budgetText, 200),
          places: nonEmpty(tr.places).slice(0, 60).map(place),
        },
      };
    }
    case "PLACES": {
      const pl = env.places;
      const places = nonEmpty(pl?.places ?? []).slice(0, 60).map(place);
      if (!pl || places.length === 0) return other();
      return { category: "PLACES", places: { city: t(pl.city, 120), country: t(pl.country, 120), places } };
    }
    case "PRODUCTS": {
      const products = nonEmpty(env.products ?? []).slice(0, 40);
      if (products.length === 0) return other();
      return {
        category: "PRODUCTS",
        products: {
          products: products.map((p) => ({
            brand: t(p.brand, 120),
            name: t(p.name, 200)!,
            productCategory: t(p.productCategory, 120),
            description: t(p.description, 1500),
            price: num(p.price),
            currency: num(p.price) != null ? t(p.currency, 8) ?? "EUR" : null,
            url: t(p.url, 1000),
            imageUrl: null,
            features: list(p.features, 12),
          })),
        },
      };
    }
    case "MOVIES":
    case "SERIES": {
      const titles = nonEmpty(env.screen ?? []).slice(0, 40);
      if (titles.length === 0) return other();
      return {
        category: env.category,
        screen: {
          titles: titles.map((s) => ({
            kind: s.kind,
            title: t(s.title, 200)!,
            year: year(s.year),
            genres: list(s.genres, 8),
            overview: t(s.overview, 1500),
            posterUrl: null,
            cast: list(s.cast, 8),
            streamingPlatforms: list(s.streamingPlatforms, 6),
            externalId: null,
          })),
        },
      };
    }
    case "BOOKS": {
      const books = nonEmpty(env.books ?? []).slice(0, 40);
      if (books.length === 0) return other();
      return {
        category: "BOOKS",
        books: {
          books: books.map((b) => ({
            title: t(b.title, 200)!,
            author: t(b.author, 160),
            coverUrl: null,
            genres: list(b.genres, 8),
            description: t(b.description, 1500),
            year: year(b.year),
          })),
        },
      };
    }
    case "FASHION": {
      const f = env.fashion;
      if (!f) return other();
      return {
        category: "FASHION",
        fashion: {
          style: t(f.style, 120),
          colors: list(f.colors, 12),
          occasions: list(f.occasions, 8),
          pieces: nonEmpty(f.pieces).slice(0, 40).map((p) => ({
            name: t(p.name, 160)!,
            brand: t(p.brand, 120),
            pieceCategory: t(p.pieceCategory, 80),
            color: t(p.color, 60),
            price: num(p.price),
            currency: num(p.price) != null ? t(p.currency, 8) ?? "EUR" : null,
            url: null,
          })),
        },
      };
    }
    case "HOME_DECOR": {
      const d = env.decor;
      if (!d) return other();
      return {
        category: "HOME_DECOR",
        decor: {
          style: t(d.style, 120),
          colors: list(d.colors, 12),
          rooms: list(d.rooms, 8),
          objects: nonEmpty(d.objects).slice(0, 40).map((o) => ({
            name: t(o.name, 160)!,
            brand: t(o.brand, 120),
            objectCategory: t(o.objectCategory, 80),
            material: t(o.material, 80),
            color: t(o.color, 60),
            price: num(o.price),
            currency: num(o.price) != null ? t(o.currency, 8) ?? "EUR" : null,
          })),
        },
      };
    }
    case "FITNESS": {
      const f = env.fitness;
      const exercises = nonEmpty(f?.exercises ?? []).slice(0, 40);
      if (!f || exercises.length === 0) return other();
      return {
        category: "FITNESS",
        fitness: {
          goal: t(f.goal, 160),
          level: f.level,
          durationMinutes: num(f.durationMinutes),
          muscleGroups: list(f.muscleGroups, 10),
          equipment: list(f.equipment, 10),
          exercises: exercises.map((e) => ({
            name: t(e.name, 160)!,
            sets: num(e.sets),
            reps: t(e.reps, 40),
            durationSeconds: num(e.durationSeconds),
            restSeconds: num(e.restSeconds),
            muscleGroup: t(e.muscleGroup, 80),
            notes: t(e.notes, 300),
          })),
        },
      };
    }
    default:
      return other();
  }
}

/** Convert the raw envelope to a validated domain result. Throws if invalid. */
export function envelopeToResult(env: AiEnvelope): AnalysisResult {
  const structuredData = toStructuredData(env);
  const candidate = {
    category: structuredData.category,
    confidence: Math.max(0, Math.min(1, Number.isFinite(env.confidence) ? env.confidence : 0.5)),
    title: t(env.title, 160) ?? "Inspiration",
    summary: t(env.summary, 1200) ?? t(env.title, 160) ?? "Inspiration",
    tags: list(env.tags.map((x) => x.toLowerCase().replace(/^#/, "")), 12).map((x) => x.slice(0, 40)),
    structuredData,
    // Travel / places cards already hold their places.
    locations:
      structuredData.category === "TRAVEL" || structuredData.category === "PLACES"
        ? []
        : (env.locations ?? []).filter((p) => p.name?.trim()).slice(0, 30).map(place),
  };
  const parsed = AnalysisResultSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new AnalysisError(`Invalid structured output: ${parsed.error.issues[0]?.message ?? "unknown"}`, "invalid_output");
  }
  return parsed.data;
}
