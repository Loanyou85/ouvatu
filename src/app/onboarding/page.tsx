import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppContext } from "@/features/auth/context";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const { profile } = await getAppContext();
  if (profile.onboardingCompleted) redirect("/");
  return <OnboardingFlow name={profile.name} />;
}
