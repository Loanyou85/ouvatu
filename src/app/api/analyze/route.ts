import { after, NextResponse } from "next/server";
import { getUserStore } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { track } from "@/services/analytics";
import { ContentInputSchema } from "@/services/content-ingestion/types";
import { PipelineError, runAnalysis, startAnalysis } from "@/services/pipeline/analyze";
import { getSessionUser } from "@/services/users/auth";

export const maxDuration = 120;

/**
 * POST /api/analyze — body: ContentInput ({ url, sharedText?, channel? })
 * Starts an asynchronous analysis and returns immediately with the source id.
 * Poll GET /api/analyze/:id for progress. Same endpoint for every input channel.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = rateLimit(`analyze:${user.id}`, 8, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const parsed = ContentInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const store = await getUserStore();
  try {
    const source = await startAnalysis(store, parsed.data);
    await track(user.id, "url_submitted", { platform: source.platform, channel: parsed.data.channel });
    after(() => runAnalysis(store, source, parsed.data));
    return NextResponse.json({ sourceId: source.id, status: source.analysisStatus }, { status: 202 });
  } catch (error) {
    if (error instanceof PipelineError) {
      const paywall = error.code === "quota_exceeded" || error.code === "subscription_required";
      if (paywall) await track(user.id, "paywall_viewed", { reason: error.code });
      return NextResponse.json({ error: error.code }, { status: paywall ? 402 : 400 });
    }
    console.error("[api/analyze] unexpected error", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
