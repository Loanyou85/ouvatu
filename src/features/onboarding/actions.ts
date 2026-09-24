"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ONBOARDING_INTERESTS } from "@/config/categories";
import { getAppContext } from "@/features/auth/context";
import { track } from "@/services/analytics";

const ids = ONBOARDING_INTERESTS.map((i) => i.id) as [string, ...string[]];

export async function completeOnboarding(interests: string[]): Promise<void> {
  const { store, user } = await getAppContext();
  const parsed = z.array(z.enum(ids)).max(ids.length).safeParse(interests);
  const clean = parsed.success ? parsed.data : [];
  await store.updateProfile({ onboardingCompleted: true, interests: clean });
  await track(user.id, "onboarding_completed", { interests: clean });
  redirect("/");
}
