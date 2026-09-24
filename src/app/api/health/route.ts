import { NextResponse } from "next/server";
import { runHealthChecks } from "@/services/health";

export const dynamic = "force-dynamic";

/** GET /api/health — configuration diagnostic (never exposes secret values). */
export async function GET() {
  const checks = await runHealthChecks();
  const ok = checks.every((c) => c.status === "ok" || c.status === "optional");
  return NextResponse.json({ ok, checks }, { headers: { "cache-control": "no-store" } });
}
