import { NextResponse } from "next/server";
import { z } from "zod";
import { isMockBillingAllowed, isStripeConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { track } from "@/services/analytics";
import { createCheckoutSession, explainStripeError } from "@/services/billing/stripe";
import { getSessionUser } from "@/services/users/auth";

const Body = z.object({ interval: z.enum(["week", "month", "year"]) });

/** Public origin of the request (the site's real address, even if APP_URL is wrong). */
function originOf(request: Request): string {
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return new URL(request.url).origin;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** POST /api/billing/checkout — returns the URL to redirect to (Stripe Checkout or dev simulation). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`checkout:${user.id}`, 5, 60_000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await track(user.id, "checkout_started", { interval: parsed.data.interval, provider: isStripeConfigured ? "stripe" : "mock" });
  try {
    if (isStripeConfigured) {
      return NextResponse.json({ url: await createCheckoutSession(user, parsed.data.interval, originOf(request)) });
    }
    if (isMockBillingAllowed) {
      return NextResponse.json({ url: `/premium/checkout-demo?interval=${parsed.data.interval}` });
    }
    return NextResponse.json(
      { error: "billing_unavailable", reason: "Stripe n'est pas configuré.", fix: "Ajoute STRIPE_SECRET_KEY et les 3 variables STRIPE_PRICE_PREMIUM_… dans Vercel, puis Redeploy." },
      { status: 503 },
    );
  } catch (error) {
    console.error("[billing] checkout failed", error);
    return NextResponse.json({ error: "billing_unavailable", ...explainStripeError(error, parsed.data.interval) }, { status: 502 });
  }
}
