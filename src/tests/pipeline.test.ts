import { describe, expect, it } from "vitest";
import { HeuristicProvider, splitLines } from "@/services/content-analysis/providers/heuristic";
import { envelopeToResult } from "@/services/content-analysis/normalize";
import type { AiEnvelope } from "@/services/content-analysis/ai-schema";
import type { NormalizedContent } from "@/services/content-ingestion/types";
import { applyGrounding, deriveEntities } from "@/services/entity-extraction";

function content(partial: Partial<NormalizedContent>): NormalizedContent {
  return {
    url: "https://www.tiktok.com/@someone/video/1",
    platform: "tiktok",
    title: null,
    description: null,
    text: null,
    author: null,
    siteName: null,
    thumbnailUrl: null,
    publishedAt: null,
    hashtags: [],
    jsonLd: [],
    userText: null,
    retrieval: "partial",
    raw: {},
    ...partial,
  };
}

const empty: Omit<AiEnvelope, "category" | "confidence" | "title" | "summary" | "tags"> = {
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

describe("heuristic analyzer", () => {
  const provider = new HeuristicProvider();

  it("builds a travel card from a TikTok caption list", async () => {
    const env = await provider.analyze(
      content({
        title: "10 endroits à visiter à Lisbonne 🇵🇹 1. LX Factory 2. Time Out Market 3. Miradouro da Senhora do Monte 4. Pastéis de Belém #lisbonne #travel",
        hashtags: ["lisbonne", "travel"],
      }),
    );
    expect(env.category).toBe("TRAVEL");
    expect(env.travel?.destination).toBe("Lisbonne");
    const names = env.travel?.places.map((p) => p.name) ?? [];
    expect(names).toContain("LX Factory");
    expect(names).toContain("Time Out Market");
    expect(env.travel?.places.find((p) => p.name === "Time Out Market")?.kind).not.toBeUndefined();
  });

  it("uses schema.org Recipe JSON-LD when present", async () => {
    const env = await provider.analyze(
      content({
        platform: "web",
        title: "Pâtes crémeuses",
        jsonLd: [
          {
            "@type": "Recipe",
            name: "Pâtes crémeuses au citron",
            recipeIngredient: ["200 g de spaghetti", "1 citron", "60 g parmesan"],
            recipeInstructions: [{ "@type": "HowToStep", text: "Cuire les pâtes." }, { "@type": "HowToStep", text: "Mélanger." }],
            recipeYield: "2 personnes",
            totalTime: "PT20M",
          },
        ],
      }),
    );
    expect(env.category).toBe("RECIPES");
    expect(env.recipe?.servings).toBe(2);
    expect(env.recipe?.totalMinutes).toBe(20);
    expect(env.recipe?.ingredients[0]).toMatchObject({ name: "spaghetti", quantity: 200, unit: "g" });
    expect(env.recipe?.steps).toHaveLength(2);
  });

  it("never invents a price for a product", async () => {
    const env = await provider.analyze(content({ title: "Mon sérum préféré pour la peau skincare routine", hashtags: ["skincare"] }));
    expect(env.category).toBe("PRODUCTS");
    expect(env.products?.[0].price).toBeNull();
  });

  it("splits emoji / numbered captions into lines", () => {
    expect(splitLines("Top films 1. Inception (2010) 2. Interstellar (2014)")).toEqual(["Top films", "Inception (2010)", "Interstellar (2014)"]);
  });
});

describe("normalization + validation", () => {
  it("falls back to OTHER when a list category has no items", () => {
    const result = envelopeToResult({ ...empty, category: "PLACES", confidence: 0.4, title: "Un spot", summary: "Résumé", tags: [], places: { city: null, country: null, places: [] } });
    expect(result.category).toBe("OTHER");
  });

  it("clamps confidence and cleans placeholder strings", () => {
    const result = envelopeToResult({
      ...empty,
      category: "BOOKS",
      confidence: 3,
      title: "  Livres  ",
      summary: "Deux livres",
      tags: ["#Lecture"],
      books: [{ title: "L'Étranger", author: "Information non disponible", genres: [], description: null, year: 1942 }],
    });
    expect(result.confidence).toBe(1);
    expect(result.tags).toEqual(["lecture"]);
    if (result.structuredData.category !== "BOOKS") throw new Error("wrong category");
    expect(result.structuredData.books.books[0].author).toBeNull();
    expect(deriveEntities(result.structuredData)).toEqual([{ type: "book", name: "L'Étranger", ref: 0 }]);
  });
});

describe("grounding guard", () => {
  it("removes prices and addresses absent from the source", () => {
    const result = envelopeToResult({
      ...empty,
      category: "PRODUCTS",
      confidence: 0.9,
      title: "Crème",
      summary: "Une crème",
      tags: [],
      products: [
        { brand: "X", name: "Crème A", productCategory: null, description: null, price: 29.9, currency: "EUR", url: null, features: [] },
        { brand: "X", name: "Crème B", productCategory: null, description: null, price: 12, currency: "EUR", url: null, features: [] },
      ],
    });
    const grounded = applyGrounding(result, "La crème A coûte 29,90 € et la B est top");
    if (grounded.structuredData.category !== "PRODUCTS") throw new Error("wrong category");
    expect(grounded.structuredData.products.products[0].price).toBe(29.9);
    expect(grounded.structuredData.products.products[1].price).toBeNull();
    expect(grounded.structuredData.products.products[1].currency).toBeNull();
  });

  it("keeps only streaming platforms mentioned in the content", () => {
    const result = envelopeToResult({
      ...empty,
      category: "MOVIES",
      confidence: 0.9,
      title: "Films",
      summary: "Films",
      tags: [],
      screen: [{ kind: "movie", title: "Dune", year: 2021, genres: [], overview: null, cast: [], streamingPlatforms: ["Netflix", "Max"] }],
    });
    const grounded = applyGrounding(result, "Dune est dispo sur Max en ce moment");
    if (grounded.structuredData.category !== "MOVIES") throw new Error("wrong category");
    expect(grounded.structuredData.screen.titles[0].streamingPlatforms).toEqual(["Max"]);
  });
});

describe("social post context", () => {
  it("uses hashtags and cover text as real content", async () => {
    const { contentCorpus } = await import("@/services/content-ingestion/types");
    const { buildUserPrompt } = await import("@/services/content-analysis/prompt");
    const c = content({ hashtags: ["biidaasigepark", "toronto"], coverText: "3 spots à Toronto\nBiidaasige Park" });
    expect(contentCorpus(c)).toContain("biidaasigepark");
    expect(contentCorpus(c)).toContain("Biidaasige Park");
    expect(buildUserPrompt(c)).toContain("Texte écrit sur l'image de couverture :\n3 spots à Toronto");
  });
});
