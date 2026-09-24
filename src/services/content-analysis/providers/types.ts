import type { NormalizedContent } from "@/services/content-ingestion/types";
import type { AiEnvelope } from "../ai-schema";

/** Any LLM (or rule engine) able to turn normalized content into an envelope. */
export interface AnalysisProvider {
  readonly name: string;
  analyze(content: NormalizedContent): Promise<AiEnvelope>;
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly code: "unavailable" | "invalid_output" | "refused" | "not_understood",
  ) {
    super(message);
  }
}
