import "server-only";
import { TRIAL, limitsFor } from "@/config/plans";
import type { UserDataStore } from "@/db/types";
import { env } from "@/lib/env";
import { track } from "@/services/analytics";
import { getPlan, startOfMonthIso } from "@/services/billing/entitlements";
import { createAnthropicProvider } from "@/services/content-analysis/providers/anthropic";
import { HeuristicProvider } from "@/services/content-analysis/providers/heuristic";
import { AnalysisError, type AnalysisProvider } from "@/services/content-analysis/providers/types";
import { envelopeToResult } from "@/services/content-analysis/normalize";
import { IngestionError, ingestUrl } from "@/services/content-ingestion/ingest";
import { contentCorpus, type ContentInput, type NormalizedContent } from "@/services/content-ingestion/types";
import { detectPlatform, normalizeInputUrl } from "@/services/content-ingestion/url";
import { enrichResult } from "@/services/enrichment";
import { applyGrounding, countDetected, deriveEntities } from "@/services/entity-extraction";
import type { Source } from "@/types/domain";
import type { AnalysisResult } from "@/types/schemas";

/** Error codes persisted on the source and translated to human copy in the UI. */
export type PipelineErrorCode =
  | "invalid_url"
  | "subscription_required"
  | "quota_exceeded"
  | "unreachable"
  | "empty"
  | "not_understood"
  | "unavailable"
  | "internal";

export class PipelineError extends Error {
  constructor(readonly code: PipelineErrorCode, message?: string) {
    super(message ?? code);
  }
}

export function getAnalysisProvider(): AnalysisProvider {
  if (env.aiProvider === "heuristic") return new HeuristicProvider();
  return createAnthropicProvider() ?? new HeuristicProvider();
}

/** Free onboarding analysis: allowed until the user got one card (or used all attempts). */
export async function isTrialAvailable(store: UserDataStore): Promise<boolean> {
  const attempts = await store.countSourcesSince(new Date(0).toISOString());
  if (attempts >= TRIAL.maxAttempts) return false;
  const items = (await store.listItems({ savedOnly: false })).filter((i) => !i.isExample);
  return items.length < TRIAL.maxItems;
}

/** Step 1–2 of the API: validate, check quota, create the source row. Fast. */
export async function startAnalysis(store: UserDataStore, input: ContentInput): Promise<Source> {
  const url = normalizeInputUrl(input.url);
  if (!url) throw new PipelineError("invalid_url");

  const plan = await getPlan(store);
  if (plan !== "PREMIUM") {
    if (!(await isTrialAvailable(store))) throw new PipelineError("subscription_required");
  } else if ((await store.countSourcesSince(startOfMonthIso())) >= limitsFor(plan).analysesPerMonth) {
    throw new PipelineError("quota_exceeded");
  }

  const source = await store.createSource({ url, platform: detectPlatform(url), inputChannel: input.channel });
  await track(store.userId, "analysis_started", { platform: source.platform, channel: input.channel });
  return source;
}

function pickImage(result: AnalysisResult, content: NormalizedContent): string | null {
  const d = result.structuredData;
  if (d.category === "BOOKS") return d.books.books.find((b) => b.coverUrl)?.coverUrl ?? content.thumbnailUrl;
  if (d.category === "MOVIES" || d.category === "SERIES") return content.thumbnailUrl ?? d.screen.titles.find((t) => t.posterUrl)?.posterUrl ?? null;
  return content.thumbnailUrl;
}

/** Steps 3–11: fetch → normalize → AI → Zod → grounding → enrich → save. */
export async function runAnalysis(store: UserDataStore, source: Source, input: ContentInput): Promise<void> {
  const startedAt = Date.now();
  try {
    await store.updateSource(source.id, { analysisStatus: "fetching" });
    let content: NormalizedContent;
    try {
      content = await ingestUrl(source.url, input.sharedText ?? null);
    } catch (error) {
      if (error instanceof IngestionError) throw new PipelineError(error.code === "empty" ? "empty" : "unreachable", error.message);
      throw new PipelineError("unreachable", error instanceof Error ? error.message : undefined);
    }
    await store.updateSource(source.id, {
      title: content.title,
      thumbnailUrl: content.thumbnailUrl,
      author: content.author,
      publishedAt: content.publishedAt && !Number.isNaN(Date.parse(content.publishedAt)) ? new Date(content.publishedAt).toISOString() : null,
      // Only lightweight public metadata is kept — never the full page text.
      rawMetadata: { ...content.raw, retrieval: content.retrieval, hashtags: content.hashtags },
      analysisStatus: "analyzing",
      analysisStep: 1,
    });

    let provider = getAnalysisProvider();
    let envelope;
    try {
      envelope = await provider.analyze(content);
    } catch (error) {
      if (error instanceof AnalysisError && error.code === "unavailable" && provider.name !== "heuristic") {
        console.warn("[pipeline] AI provider unavailable, falling back to heuristic analyzer:", error.message);
        provider = new HeuristicProvider();
        envelope = await provider.analyze(content);
      } else {
        throw error;
      }
    }
    await store.updateSource(source.id, { analysisStep: 2 });

    const validated = envelopeToResult(envelope);
    const grounded = applyGrounding(validated, contentCorpus(content));
    await store.updateSource(source.id, { analysisStatus: "enriching", analysisStep: 3 });

    const enriched = await enrichResult(grounded);
    await store.updateSource(source.id, { analysisStep: 4 });

    if (enriched.category === "OTHER" && content.retrieval === "minimal" && !content.userText) {
      throw new PipelineError("not_understood", "Too little public information to build a useful card");
    }

    const item = await store.createItem({
      sourceId: source.id,
      category: enriched.category,
      confidence: enriched.confidence,
      title: enriched.title,
      summary: enriched.summary,
      imageUrl: pickImage(enriched, content),
      tags: enriched.tags,
      entities: deriveEntities(enriched.structuredData),
      data: enriched.structuredData,
      sourceUrl: content.url,
      sourcePlatform: content.platform,
      sourceAuthor: content.author,
    });
    await store.updateSource(source.id, {
      analysisStatus: "completed",
      analysisStep: 5,
      contentItemId: item.id,
      rawMetadata: {
        ...content.raw,
        retrieval: content.retrieval,
        hashtags: content.hashtags,
        analyzer: provider.name,
      },
    });
    await store.incrementAnalysisCount();
    await track(store.userId, "analysis_completed", {
      category: enriched.category,
      confidence: enriched.confidence,
      detected: countDetected(enriched.structuredData),
      platform: content.platform,
      analyzer: provider.name,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const code: PipelineErrorCode =
      error instanceof PipelineError
        ? error.code
        : error instanceof AnalysisError
          ? error.code === "unavailable"
            ? "unavailable"
            : "not_understood"
          : "internal";
    console.error(`[pipeline] analysis ${source.id} failed (${code})`, error);
    await store
      .updateSource(source.id, {
        analysisStatus: "failed",
        analysisError: `${code}: ${error instanceof Error ? error.message : "unknown"}`.slice(0, 500),
      })
      .catch(() => undefined);
    await track(store.userId, "analysis_failed", { code, platform: source.platform });
  }
}
