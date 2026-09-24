import { ChevronRight, Download, FileText, ListChecks, LogOut, Shield, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/layout/avatar";
import { LEGAL_LINKS } from "@/components/layout/site-footer";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/config/brand";
import { PREMIUM_OFFERS, formatPrice } from "@/config/plans";
import { getAppContext } from "@/features/auth/context";
import { DemoCancelButton } from "@/features/paywall/demo-checkout";
import { DeleteAccount, ManageSubscriptionButton, NameForm } from "@/features/profile/profile-client";
import { dataBackend } from "@/db";
import { isMockBillingAllowed, isStripeConfigured } from "@/lib/env";
import { getUsage } from "@/services/billing/entitlements";
import { isAdminEmail } from "@/services/users/auth";

export const metadata: Metadata = { title: "Profil" };

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const finite = Number.isFinite(limit);
  const pct = finite ? Math.min(100, Math.round((used / limit) * 100)) : 8;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">{finite ? `${used} / ${limit}` : `${used} · illimité`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-hover">
        <div className={pct >= 90 ? "h-full rounded-full bg-error" : "h-full rounded-full bg-accent"} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const { store, profile, user } = await getAppContext();
  const [usage, subscription] = await Promise.all([getUsage(store), store.getSubscription()]);
  const premium = usage.plan === "PREMIUM";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={profile.name} email={profile.email} className="h-16 w-16 text-xl" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{profile.name ?? "Mon profil"}</h1>
          <p className="truncate text-sm text-muted">{profile.email}</p>
        </div>
      </div>

      <Card className={premium ? "bg-ink p-5 text-white" : "p-5"}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={premium ? "text-sm font-semibold text-white/60" : "text-sm font-semibold text-muted"}>Mon plan</p>
            <p className="mt-0.5 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              {premium ? (
                <>
                  <Sparkles className="h-5 w-5 text-[#a7a2ff]" /> Premium
                </>
              ) : (
                "Gratuit"
              )}
            </p>
            {premium && subscription ? (
              <p className="mt-1 text-sm text-white/60">
                {subscription.interval === "year" ? "Annuel" : "Mensuel"}
                {subscription.currentPeriodEnd
                  ? ` · ${subscription.cancelAtPeriodEnd ? "se termine le" : "renouvellement le"} ${new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR")}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
        {!premium ? (
          <div className="mt-5 space-y-4">
            <UsageBar label="Analyses ce mois-ci" used={usage.analysesThisMonth} limit={usage.analysesLimit} />
            <UsageBar label="Bibliothèque" used={usage.savedItems} limit={usage.savedLimit} />
            <UsageBar label="Collections" used={usage.collections} limit={usage.collectionsLimit} />
            <Link href="/premium" className={buttonClass("accent", "lg", "w-full")}>
              Passer à Premium · dès {formatPrice(Math.round(PREMIUM_OFFERS.year.amountCents / 12))}/mois
            </Link>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {isStripeConfigured && subscription?.stripeCustomerId ? <ManageSubscriptionButton /> : null}
            {isMockBillingAllowed && !subscription?.stripeCustomerId ? <DemoCancelButton /> : null}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-sm font-semibold text-muted">Prénom</p>
        <NameForm name={profile.name} />
      </Card>

      <Card className="p-2">
        <Link href="/lists" className="flex items-center gap-3 rounded-2xl p-3.5 font-semibold hover:bg-hover">
          <ListChecks className="h-5 w-5 text-muted" /> Mes listes <ChevronRight className="ml-auto h-4 w-4 text-subtle" />
        </Link>
        <a href="/api/account/export" className="flex items-center gap-3 rounded-2xl p-3.5 font-semibold hover:bg-hover">
          <Download className="h-5 w-5 text-muted" /> Exporter mes données <ChevronRight className="ml-auto h-4 w-4 text-subtle" />
        </a>
        {isAdminEmail(user.email) ? (
          <Link href="/admin" className="flex items-center gap-3 rounded-2xl p-3.5 font-semibold hover:bg-hover">
            <Shield className="h-5 w-5 text-muted" /> Administration <ChevronRight className="ml-auto h-4 w-4 text-subtle" />
          </Link>
        ) : null}
        <form action="/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left font-semibold hover:bg-hover">
            <LogOut className="h-5 w-5 text-muted" /> Se déconnecter
          </button>
        </form>
        <DeleteAccount />
      </Card>

      <Card className="p-2">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 rounded-2xl p-3.5 text-sm font-semibold hover:bg-hover">
            <FileText className="h-4 w-4 text-muted" /> {l.label} <ChevronRight className="ml-auto h-4 w-4 text-subtle" />
          </Link>
        ))}
      </Card>

      <p className="pb-4 text-center text-xs text-subtle">
        {BRAND.name} · {BRAND.tagline}
        {dataBackend === "local" ? " · Mode local (données de développement)" : ""}
      </p>
    </div>
  );
}
