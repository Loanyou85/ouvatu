import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppContext } from "@/features/auth/context";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { isTrialAvailable } from "@/services/pipeline/analyze";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const { profile, store } = await getAppContext();
  if (profile.onboardingCompleted) {
    // Onboarding done but the free first card not obtained yet: straight back to "paste your link".
    if (profile.plan === "PREMIUM" || !(await isTrialAvailable(store))) redirect("/");
    return <OnboardingFlow name={profile.name} initialStep={2} initialInterests={profile.interests} />;
  }
  return <OnboardingFlow name={profile.name} />;
}
