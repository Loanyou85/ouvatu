import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/config/categories";
import { AiCategoryStepSchema, AiEnvelopeSchema, assembleEnvelope, detailStepSchema } from "@/services/content-analysis/ai-schema";

const size = (schema: Parameters<typeof betaZodOutputFormat>[0]) => JSON.stringify(betaZodOutputFormat(schema)).length;

describe("AI structured-output schemas", () => {
  it("keeps every step far smaller than the former single envelope", () => {
    const full = size(AiEnvelopeSchema);
    const steps = CATEGORIES.map((c) => size(detailStepSchema(c)));
    console.log("full envelope:", full, "| category step:", size(AiCategoryStepSchema), "| detail steps max:", Math.max(...steps));
    expect(Math.max(...steps)).toBeLessThan(full / 2);
  });

  it("rebuilds a full envelope from the two steps", () => {
    const env = assembleEnvelope("FASHION", {
      title: "Look",
      summary: "Un look",
      tags: ["mode"],
      confidence: 0.8,
      fashion: { style: null, colors: [], occasions: [], pieces: [] },
      locations: [{ name: "Biidaasige Park", kind: "park", description: null, address: null, city: "Toronto", country: "Canada", priceText: null, cuisine: null }],
    });
    expect(env.category).toBe("FASHION");
    expect(env.recipe).toBeNull();
    expect(env.locations[0].name).toBe("Biidaasige Park");
  });
});
