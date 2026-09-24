import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUserStore } from "@/db";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { effectivePlan } from "@/services/billing/entitlements";
import { requireSessionUser } from "@/services/users/auth";

/**
 * Accounts created before the database migration (or before the sign-up
 * trigger existed) have no row in public.users: create it on the fly.
 */
async function ensureProfile(id: string, email: string): Promise<boolean> {
  if (!isSupabaseConfigured || !env.supabaseServiceRoleKey) return false;
  const { error } = await createSupabaseAdminClient()
    .from("users")
    .upsert({ id, email }, { onConflict: "id", ignoreDuplicates: true });
  if (error) console.error("[auth] could not create missing profile", error.message);
  return !error;
}

/** Everything an authenticated page needs, resolved once per request. */
export const getAppContext = cache(async () => {
  const user = await requireSessionUser();
  const store = await getUserStore();
  let profile;
  try {
    profile = await store.getProfile();
  } catch (error) {
    console.error("[auth] could not load the profile (database not ready?)", error);
    // Short, non-secret reason (e.g. "permission denied for table users") shown on /setup.
    const reason = (error instanceof Error ? error.message : "unknown").replace(/^\[supabase\]\s*/, "").slice(0, 160);
    redirect(`/setup?reason=${encodeURIComponent(reason)}`);
  }
  if (!profile && (await ensureProfile(user.id, user.email))) profile = await store.getProfile();
  if (!profile) redirect("/logout");
  profile = { ...profile, plan: effectivePlan(profile) };
  return { user, store, profile, plan: profile.plan };
});

export async function requireOnboardedContext() {
  const ctx = await getAppContext();
  if (!ctx.profile.onboardingCompleted) redirect("/onboarding");
  return ctx;
}

/**
 * There is no free tier: every product page requires an active subscription.
 * Without one, users land on the offers page (/premium). Profile, legal pages
 * and billing pages stay reachable (account deletion, export, checkout).
 */
export async function requireSubscribedContext() {
  const ctx = await requireOnboardedContext();
  if (ctx.plan !== "PREMIUM") redirect("/premium");
  return ctx;
}
