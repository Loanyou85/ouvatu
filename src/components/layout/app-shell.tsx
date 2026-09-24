import Link from "next/link";
import { ToastProvider } from "@/components/ui/toast";
import { Logo } from "@/components/ui/logo";
import { AddProvider } from "@/features/add/add-provider";
import { PaywallProvider } from "@/features/paywall/paywall-sheet";
import type { UserProfile } from "@/types/domain";
import { Avatar } from "./avatar";
import { AddButtonDesktop, BottomNav, DesktopNav, MobileSearchLink } from "./nav";

export function AppShell({ profile, children }: { profile: UserProfile; children: React.ReactNode }) {
  // Without a subscription only the offers page and the profile are reachable: no product navigation.
  const subscribed = profile.plan === "PREMIUM";
  return (
    <ToastProvider>
      <PaywallProvider>
      <AddProvider>
        <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" aria-label="Accueil">
              <Logo />
            </Link>
            {subscribed ? <DesktopNav /> : null}
            <div className="flex items-center gap-2">
              {subscribed ? <MobileSearchLink /> : null}
              {subscribed ? <AddButtonDesktop /> : null}
              <Link href="/profile" aria-label="Mon profil" className="rounded-full transition hover:opacity-85">
                <Avatar name={profile.name} email={profile.email} className="h-9 w-9 sm:h-10 sm:w-10" />
              </Link>
            </div>
          </div>
        </header>
        <main className={`mx-auto w-full max-w-[1200px] flex-1 px-4 ${subscribed ? "pb-28" : "pb-12"} pt-5 sm:px-6 md:pb-16 md:pt-8`}>{children}</main>
        {subscribed ? <BottomNav /> : null}
      </AddProvider>
      </PaywallProvider>
    </ToastProvider>
  );
}
