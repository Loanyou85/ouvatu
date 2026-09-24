/**
 * Single source of truth for plans, prices and limits.
 * Displayed prices live here; Stripe price IDs come from the environment.
 */
export type PlanId = "FREE" | "PREMIUM";
export type BillingInterval = "week" | "month" | "year";

/** Display order of the offers (paywall, landing, legal). */
export const OFFER_ORDER: BillingInterval[] = ["week", "month", "year"];

export const PLAN_LIMITS = {
  /** No active subscription: OUVATU has no free tier, everything requires an offer. */
  FREE: {
    analysesPerMonth: 0,
    maxSavedItems: 0,
    maxCollections: 0,
    previewEntities: 0,
  },
  PREMIUM: {
    analysesPerMonth: 500,
    maxSavedItems: Number.POSITIVE_INFINITY,
    maxCollections: Number.POSITIVE_INFINITY,
    previewEntities: Number.POSITIVE_INFINITY,
  },
} as const satisfies Record<PlanId, Record<string, number>>;

/**
 * Onboarding trial: before paying, a new user can analyse ONE link (a few
 * attempts in case the first ones fail). The result is only shown blurred;
 * seeing the full card leads to the paywall.
 */
export const TRIAL = { maxAttempts: 3, maxItems: 1 } as const;

/** Features reserved to premium users. Checked server-side. */
export const PREMIUM_FEATURES = ["itinerary", "unlimited_results"] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

export interface PriceOffer {
  interval: BillingInterval;
  label: string;
  amountCents: number;
  currency: "EUR";
  /** Env var holding the Stripe Price ID. */
  stripePriceEnv: "STRIPE_PRICE_PREMIUM_WEEKLY" | "STRIPE_PRICE_PREMIUM_MONTHLY" | "STRIPE_PRICE_PREMIUM_YEARLY";
  /** Short unit for "/semaine", "/mois", "/an". */
  unit: string;
  highlight?: string;
}

export const PREMIUM_OFFERS: Record<BillingInterval, PriceOffer> = {
  week: {
    interval: "week",
    label: "Hebdomadaire",
    amountCents: 499,
    currency: "EUR",
    stripePriceEnv: "STRIPE_PRICE_PREMIUM_WEEKLY",
    unit: "semaine",
  },
  month: {
    interval: "month",
    label: "Mensuel",
    amountCents: 999,
    currency: "EUR",
    stripePriceEnv: "STRIPE_PRICE_PREMIUM_MONTHLY",
    unit: "mois",
    /** vs. the weekly offer: 9,99 € instead of ~21,62 € (4,99 € × 52 / 12). */
    highlight: "−50 %",
  },
  year: {
    interval: "year",
    label: "Annuel",
    amountCents: 4999,
    currency: "EUR",
    stripePriceEnv: "STRIPE_PRICE_PREMIUM_YEARLY",
    unit: "an",
    highlight: "−58 %",
  },
};

export function formatPrice(amountCents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amountCents / 100);
}

/** Approximate monthly value of an offer (admin MRR estimate). */
export function monthlyEquivalentCents(interval: BillingInterval): number {
  const { amountCents } = PREMIUM_OFFERS[interval];
  if (interval === "week") return (amountCents * 52) / 12;
  if (interval === "year") return amountCents / 12;
  return amountCents;
}

export function limitsFor(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
