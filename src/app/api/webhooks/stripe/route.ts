import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripe, handleStripeEvent } from "@/services/billing/stripe";

/** Stripe webhook — signature verified with STRIPE_WEBHOOK_SECRET before anything else. */
export async function POST(request: Request) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const payload = await request.text();
  let event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, env.stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error(`[stripe] failed to handle ${event.type}`, error);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
