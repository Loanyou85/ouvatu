import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUserStore } from "@/db";
import { requireSessionUser } from "@/services/users/auth";

/** Everything an authenticated page needs, resolved once per request. */
export const getAppContext = cache(async () => {
  const user = await requireSessionUser();
  const store = await getUserStore();
  const profile = await store.getProfile();
  if (!profile) redirect("/logout");
  return { user, store, profile, plan: profile.plan };
});

export async function requireOnboardedContext() {
  const ctx = await getAppContext();
  if (!ctx.profile.onboardingCompleted) redirect("/onboarding");
  return ctx;
}
