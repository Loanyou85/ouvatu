import { NextResponse } from "next/server";
import { getUserStore } from "@/db";
import { analysisErrorCopy } from "@/config/messages";
import { isUuid } from "@/lib/utils";
import { getSessionUser } from "@/services/users/auth";

/** GET /api/analyze/:id — progress of an analysis owned by the current user. */
export async function GET(_request: Request, ctx: RouteContext<"/api/analyze/[id]">) {
  const { id } = await ctx.params;
  if (!(await getSessionUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const store = await getUserStore();
  const source = await store.getSource(id);
  if (!source) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    status: source.analysisStatus,
    step: source.analysisStep,
    itemId: source.contentItemId,
    platform: source.platform,
    title: source.title,
    thumbnailUrl: source.thumbnailUrl,
    error:
      source.analysisStatus === "failed"
        ? {
            ...analysisErrorCopy(source.analysisError),
            // Technical reason, shown small under the message (helps support; no secrets in it).
            detail: source.analysisError?.split(":").slice(1).join(":").trim().slice(0, 240) || null,
          }
        : null,
  });
}
