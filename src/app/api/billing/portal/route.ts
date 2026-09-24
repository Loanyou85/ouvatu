import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/env";
import { createPortalSession } from "@/services/billing/stripe";
import { getSessionUser } from "@/services/users/auth";

/** POST /api/billing/portal — Stripe customer portal (manage / cancel subscription). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isStripeConfigured) return NextResponse.json({ error: "billing_unavailable" }, { status: 503 });
  try {
    const url = await createPortalSession(user.id);
    return url ? NextResponse.json({ url }) : NextResponse.json({ error: "no_customer" }, { status: 404 });
  } catch (error) {
    console.error("[billing] portal failed", error);
    return NextResponse.json({ error: "billing_unavailable" }, { status: 502 });
  }
}
