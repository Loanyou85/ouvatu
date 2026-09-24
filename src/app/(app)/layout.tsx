import { AppShell } from "@/components/layout/app-shell";
import { requireOnboardedContext } from "@/features/auth/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOnboardedContext();
  return <AppShell profile={profile}>{children}</AppShell>;
}
