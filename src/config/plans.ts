/**
 * Single source of truth for plans, prices and limits.
 * Displayed prices live here; Stripe price IDs come from the environment.
 */
export type PlanId = "FREE" | "PREMIUM";
export type BillingInterval = "month" | "year";

export const PLAN_LIMITS = {
  FREE: {
    analysesPerMonth: 10,
    maxSavedItems: 30,
    maxCollections: 3,
    /** Number of detected elements visible in a result before the paywall. */
    previewEntities: 4,
  },
  PREMIUM: {
    analysesPerMonth: 500,
    maxSavedItems: Number.POSITIVE_INFINITY,
    maxCollections: Number.POSITIVE_INFINITY,
    previewEntities: Number.POSITIVE_INFINITY,
  },
} as const satisfies Record<PlanId, Record<string, number>>;

/** Features reserved to premium users. Checked server-side. */
export const PREMIUM_FEATURES = ["itinerary", "unlimited_results"] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

export interface PriceOffer {
  interval: BillingInterval;
  label: string;
  amountCents: number;
  currency: "EUR";
  /** Env var holding the Stripe Price ID. */
  stripePriceEnv: "STRIPE_PRICE_PREMIUM_MONTHLY" | "STRIPE_PRICE_PREMIUM_YEARLY";
  highlight?: string;
}

export const PREMIUM_OFFERS: Record<BillingInterval, PriceOffer> = {
  month: {
    interval: "month",
    label: "Mensuel",
    amountCents: 999,
    currency: "EUR",
    stripePriceEnv: "STRIPE_PRICE_PREMIUM_MONTHLY",
  },
  year: {
    interval: "year",
    label: "Annuel",
    amountCents: 4999,
    currency: "EUR",
    stripePriceEnv: "STRIPE_PRICE_PREMIUM_YEARLY",
    highlight: "−58 %",
  },
};

export function formatPrice(amountCents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amountCents / 100);
}

export function limitsFor(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
