import "server-only";
import Stripe from "stripe";
import { PREMIUM_OFFERS, type BillingInterval } from "@/config/plans";
import { getAdminStore } from "@/db";
import { env, isStripeConfigured } from "@/lib/env";
import { track } from "@/services/analytics";
import type { SubscriptionStatus } from "@/types/domain";

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!env.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  client ??= new Stripe(env.stripeSecretKey);
  return client;
}

function priceIdFor(interval: BillingInterval): string {
  const id = { week: env.stripePriceWeekly, month: env.stripePriceMonthly, year: env.stripePriceYearly }[interval];
  if (!id) throw new Error(`${PREMIUM_OFFERS[interval].stripePriceEnv} is not configured`);
  return id;
}

export async function createCheckoutSession(user: { id: string; email: string }, interval: BillingInterval): Promise<string> {
  if (!isStripeConfigured) throw new Error("Stripe is not configured");
  const stripe = getStripe();
  const admin = getAdminStore();
  const customerId = await admin?.getStripeCustomerId(user.id);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceIdFor(interval), quantity: 1 }],
    ...(customerId ? { customer: customerId } : { customer_email: user.email }),
    client_reference_id: user.id,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    locale: "fr",
    success_url: `${env.appUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/premium?canceled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createPortalSession(userId: string): Promise<string | null> {
  const customerId = await getAdminStore()?.getStripeCustomerId(userId);
  if (!customerId) return null;
  const portal = await getStripe().billingPortal.sessions.create({ customer: customerId, return_url: `${env.appUrl}/profile` });
  return portal.url;
}

/** Persist a Stripe subscription. The webhook is the ONLY writer of premium status. */
export async function syncSubscription(subscription: Stripe.Subscription, fallbackUserId?: string | null): Promise<void> {
  const admin = getAdminStore();
  if (!admin) throw new Error("Admin store unavailable (SUPABASE_SERVICE_ROLE_KEY missing)");
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = subscription.metadata?.userId || fallbackUserId || (await admin.findUserIdByStripeCustomer(customerId));
  if (!userId) {
    console.warn(`[stripe] subscription ${subscription.id} has no matching user`);
    return;
  }
  const item = subscription.items.data[0];
  const interval = item?.price.recurring?.interval;
  await admin.upsertSubscription({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status as SubscriptionStatus,
    interval: interval === "year" ? "year" : interval === "month" ? "month" : interval === "week" ? "week" : null,
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripe();
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription, session.client_reference_id);
      await track(session.client_reference_id ?? null, "subscription_started", { interval: subscription.items.data[0]?.price.recurring?.interval });
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(event.data.object);
      return;
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object);
      await track(event.data.object.metadata?.userId ?? null, "subscription_cancelled", {});
      return;
    }
    default:
      return;
  }
}

/** Monthly recurring revenue estimate from active subscriptions (admin dashboard). */
export async function stripeRevenueLast30Days(): Promise<{ amountCents: number; currency: string } | null> {
  if (!env.stripeSecretKey) return null;
  try {
    const since = Math.floor(Date.now() / 1000) - 30 * 86_400;
    const invoices = await getStripe().invoices.list({ status: "paid", created: { gte: since }, limit: 100 });
    const amountCents = invoices.data.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0);
    return { amountCents, currency: (invoices.data[0]?.currency ?? "eur").toUpperCase() };
  } catch (error) {
    console.warn("[stripe] could not load revenue", error);
    return null;
  }
}
