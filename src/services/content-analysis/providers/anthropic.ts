import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { env } from "@/lib/env";
import type { NormalizedContent } from "@/services/content-ingestion/types";
import { AiEnvelopeSchema, type AiEnvelope } from "../ai-schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "../prompt";
import { AnalysisError, type AnalysisProvider } from "./types";

/** Models that support the server-side refusal fallback chain. */
function supportsServerFallbacks(model: string): boolean {
  return model.startsWith("claude-opus-5") || model.startsWith("claude-fable-5");
}

export class AnthropicProvider implements AnalysisProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 2 });
  }

  async analyze(content: NormalizedContent): Promise<AiEnvelope> {
    const fallbacks = supportsServerFallbacks(this.model);
    try {
      const response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(content) }],
        output_config: { format: betaZodOutputFormat(AiEnvelopeSchema), effort: "medium" },
        ...(fallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
      if (response.stop_reason === "refusal") {
        throw new AnalysisError("The model declined to analyze this content", "refused");
      }
      if (response.stop_reason === "max_tokens") {
        throw new AnalysisError("The analysis was too long", "invalid_output");
      }
      if (!response.parsed_output) {
        throw new AnalysisError("The model did not return a valid structure", "invalid_output");
      }
      return response.parsed_output;
    } catch (error) {
      if (error instanceof AnalysisError) throw error;
      if (error instanceof Anthropic.RateLimitError) throw new AnalysisError("AI rate limited", "unavailable");
      if (error instanceof Anthropic.AuthenticationError) throw new AnalysisError("AI key rejected", "unavailable");
      if (error instanceof Anthropic.BadRequestError) throw new AnalysisError(`AI bad request: ${error.message}`, "invalid_output");
      if (error instanceof Anthropic.APIError) throw new AnalysisError(`AI error ${error.status}`, "unavailable");
      throw new AnalysisError(error instanceof Error ? error.message : "AI call failed", "unavailable");
    }
  }
}

export function createAnthropicProvider(): AnthropicProvider | null {
  return env.aiApiKey ? new AnthropicProvider(env.aiApiKey, env.aiModel) : null;
}
