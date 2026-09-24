import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAppContext } from "@/features/auth/context";
import { HomeView } from "@/features/home/home-view";
import { Landing } from "@/features/home/landing";
import { getSessionUser } from "@/services/users/auth";

export default async function RootPage() {
  const user = await getSessionUser();
  if (!user) return <Landing />;

  const { store, profile } = await getAppContext();
  if (!profile.onboardingCompleted) redirect("/onboarding");
  return (
    <AppShell profile={profile}>
      <HomeView store={store} profile={profile} />
    </AppShell>
  );
}
