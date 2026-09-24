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

function configuredPriceId(interval: BillingInterval): string {
  const raw = { week: env.stripePriceWeekly, month: env.stripePriceMonthly, year: env.stripePriceYearly }[interval];
  const id = raw?.replace(/^["']|["']$/g, "").trim();
  if (!id) throw new Error(`${PREMIUM_OFFERS[interval].stripePriceEnv} is not configured`);
  return id;
}

/**
 * Resolves the configured value to a Stripe price id. A product id (prod_…)
 * pasted by mistake is accepted: its default price is used.
 */
async function resolvePriceId(interval: BillingInterval): Promise<string> {
  const id = configuredPriceId(interval);
  if (!id.startsWith("prod_")) return id;
  const product = await getStripe().products.retrieve(id);
  const price = typeof product.default_price === "string" ? product.default_price : product.default_price?.id;
  if (!price) throw new Error(`Product ${id} has no default price`);
  return price;
}

export interface StripeProblem {
  reason: string;
  fix: string;
}

/** Turns a Stripe/config error into a readable French explanation (no secret values). */
export function explainStripeError(error: unknown, interval?: BillingInterval): StripeProblem {
  const e = error as { type?: string; code?: string; statusCode?: number; message?: string; param?: string };
  const message = e?.message ?? "";
  const m = message.toLowerCase();
  const envName = interval ? PREMIUM_OFFERS[interval].stripePriceEnv : "STRIPE_PRICE_PREMIUM_…";
  if (e?.type === "StripePermissionError" || e?.statusCode === 403 || m.includes("required permissions")) {
    return {
      reason: "La clé Stripe (rk_…) n'a pas les autorisations nécessaires.",
      fix: "Stripe → Développeurs → Clés API → ta clé limitée → Modifier : mets « Écriture » sur Checkout Sessions, Customer portal, Customers, Subscriptions, et « Lecture » sur Prices, Products, Invoices. Ou utilise la clé secrète standard (sk_…).",
    };
  }
  if (e?.type === "StripeAuthenticationError" || e?.statusCode === 401 || m.includes("invalid api key")) {
    return { reason: "La clé STRIPE_SECRET_KEY est refusée par Stripe.", fix: "Recopie la clé dans Vercel (sans espace ni guillemets), puis Redeploy." };
  }
  if (e?.code === "resource_missing" || m.includes("no such price") || m.includes("no such product")) {
    const otherMode = m.includes("similar object exists in") ? " Elle existe dans l'autre mode (test / production) : la clé et les prix doivent venir du même mode." : "";
    return {
      reason: `Le prix ${envName} est introuvable dans ton compte Stripe.${otherMode}`,
      fix: "Stripe → Catalogue de produits → ton produit → dans « Tarifs », clique sur le tarif → copie l'ID qui commence par price_… → colle-le dans Vercel, puis Redeploy.",
    };
  }
  if (m.includes("recurring") || m.includes("one-time") || m.includes("subscription mode")) {
    return {
      reason: `Le prix ${envName} n'est pas un abonnement (paiement unique).`,
      fix: "Stripe → Catalogue de produits → ajoute un tarif « Récurrent » (hebdomadaire / mensuel / annuel) et utilise son ID price_….",
    };
  }
  if (m.includes("is not configured")) {
    return { reason: `Variable manquante : ${message.replace(" is not configured", "")}.`, fix: "Ajoute-la dans Vercel → Settings → Environment Variables, puis Redeploy." };
  }
  if (m.includes("default price")) {
    return { reason: `${envName} contient un ID de produit (prod_…) sans tarif par défaut.`, fix: "Copie plutôt l'ID du tarif (price_…) et colle-le dans Vercel, puis Redeploy." };
  }
  if (m.includes("url") && (m.includes("invalid") || m.includes("not a valid"))) {
    return { reason: "L'adresse de retour du paiement est invalide.", fix: "Vérifie APP_URL dans Vercel, ex. https://ouvatu.vercel.app (sans / à la fin)." };
  }
  return { reason: message.slice(0, 200) || "Erreur Stripe inconnue.", fix: "Ouvre /setup pour vérifier la configuration Stripe." };
}

/** Diagnostic: checks that each configured price exists, is recurring and matches the key's mode. */
export async function checkStripePrices(): Promise<{ interval: BillingInterval; ok: boolean; detail: string; fix?: string }[]> {
  const results: { interval: BillingInterval; ok: boolean; detail: string; fix?: string }[] = [];
  for (const interval of ["week", "month", "year"] as const) {
    try {
      const price = await getStripe().prices.retrieve(await resolvePriceId(interval));
      if (!price.recurring) {
        const p = explainStripeError(new Error("price is one-time, not recurring"), interval);
        results.push({ interval, ok: false, detail: p.reason, fix: p.fix });
      } else if (!price.active) {
        results.push({ interval, ok: false, detail: "tarif archivé dans Stripe", fix: "Réactive le tarif ou crée-en un nouveau et copie son ID price_…" });
      } else {
        const amount = ((price.unit_amount ?? 0) / 100).toFixed(2).replace(".", ",");
        results.push({ interval, ok: true, detail: `OK (${amount} ${price.currency.toUpperCase()} / ${price.recurring.interval})` });
      }
    } catch (error) {
      const p = explainStripeError(error, interval);
      results.push({ interval, ok: false, detail: p.reason, fix: p.fix });
    }
  }
  return results;
}

export async function createCheckoutSession(user: { id: string; email: string }, interval: BillingInterval, origin: string = env.appUrl, next: string | null = null): Promise<string> {
  if (!isStripeConfigured) throw new Error("Stripe is not configured");
  const stripe = getStripe();
  const admin = getAdminStore();
  const customerId = await admin?.getStripeCustomerId(user.id).catch(() => null);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: await resolvePriceId(interval), quantity: 1 }],
    ...(customerId ? { customer: customerId } : { customer_email: user.email }),
    client_reference_id: user.id,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    locale: "fr",
    success_url: `${origin}/premium/success?session_id={CHECKOUT_SESSION_ID}${next ? `&next=${encodeURIComponent(next)}` : ""}`,
    cancel_url: `${origin}/premium?canceled=1`,
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
