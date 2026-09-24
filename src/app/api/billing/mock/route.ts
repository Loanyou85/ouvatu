import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStore } from "@/db";
import { isMockBillingAllowed } from "@/lib/env";
import { track } from "@/services/analytics";
import { getSessionUser } from "@/services/users/auth";

const Body = z.object({ action: z.enum(["subscribe", "cancel"]), interval: z.enum(["month", "year"]).optional() });

/**
 * DEVELOPMENT ONLY — simulates what the Stripe webhook does, so the full
 * premium flow can be tested without Stripe keys. Disabled when Stripe is
 * configured or in production (unless NOMA_DEMO_BILLING=true).
 */
export async function POST(request: Request) {
  if (!isMockBillingAllowed) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const admin = getAdminStore();
  if (!parsed.success || !admin) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const subscribe = parsed.data.action === "subscribe";
  const interval = parsed.data.interval ?? "month";
  const periodEnd = new Date(Date.now() + (interval === "year" ? 365 : 30) * 86_400_000).toISOString();
  await admin.upsertSubscription({
    userId: user.id,
    stripeCustomerId: null,
    stripeSubscriptionId: `demo_${user.id.slice(0, 8)}`,
    status: subscribe ? "active" : "canceled",
    interval,
    currentPeriodEnd: subscribe ? periodEnd : null,
    cancelAtPeriodEnd: false,
  });
  await track(user.id, subscribe ? "subscription_started" : "subscription_cancelled", { interval, provider: "mock" });
  return NextResponse.json({ ok: true });
}
