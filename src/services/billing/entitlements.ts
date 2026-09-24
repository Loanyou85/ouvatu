import "server-only";
import { limitsFor, type PlanId, type PremiumFeature } from "@/config/plans";
import type { UserDataStore } from "@/db/types";
import { env } from "@/lib/env";

/** Emails listed in LIFETIME_PREMIUM_EMAILS (server-side env var) are Premium for life. */
export function isLifetimePremium(email: string | null | undefined): boolean {
  return Boolean(email) && env.lifetimePremiumEmails.includes(email!.trim().toLowerCase());
}

/** Plan stored in the database, upgraded to PREMIUM for lifetime accounts. */
export function effectivePlan(profile: { plan: PlanId; email: string } | null): PlanId {
  if (!profile) return "FREE";
  return profile.plan === "PREMIUM" || isLifetimePremium(profile.email) ? "PREMIUM" : "FREE";
}

/**
 * Plan resolution is ALWAYS server-side, from the database (users.plan is
 * derived from the Stripe subscription by a trigger / the webhook). The
 * client never tells us whether a user is premium.
 */
export async function getPlan(store: UserDataStore): Promise<PlanId> {
  return effectivePlan(await store.getProfile());
}

export function startOfMonthIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

export interface Usage {
  plan: PlanId;
  analysesThisMonth: number;
  analysesLimit: number;
  savedItems: number;
  savedLimit: number;
  collections: number;
  collectionsLimit: number;
}

export async function getUsage(store: UserDataStore): Promise<Usage> {
  const plan = await getPlan(store);
  const limits = limitsFor(plan);
  const [analysesThisMonth, savedItems, collections] = await Promise.all([
    store.countSourcesSince(startOfMonthIso()),
    store.countSavedItems(),
    store.listCollections().then((c) => c.length),
  ]);
  return {
    plan,
    analysesThisMonth,
    analysesLimit: limits.analysesPerMonth,
    savedItems,
    savedLimit: limits.maxSavedItems,
    collections,
    collectionsLimit: limits.maxCollections,
  };
}

export function hasFeature(plan: PlanId, feature: PremiumFeature): boolean {
  void feature;
  return plan === "PREMIUM";
}
