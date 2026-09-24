import "server-only";
import { limitsFor, type PlanId, type PremiumFeature } from "@/config/plans";
import type { UserDataStore } from "@/db/types";

/**
 * Plan resolution is ALWAYS server-side, from the database (users.plan is
 * derived from the Stripe subscription by a trigger / the webhook). The
 * client never tells us whether a user is premium.
 */
export async function getPlan(store: UserDataStore): Promise<PlanId> {
  const profile = await store.getProfile();
  return profile?.plan === "PREMIUM" ? "PREMIUM" : "FREE";
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
