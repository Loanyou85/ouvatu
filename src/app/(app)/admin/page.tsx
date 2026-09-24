import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CATEGORY_META } from "@/config/categories";
import { formatPrice, monthlyEquivalentCents } from "@/config/plans";
import { getAdminStore } from "@/db";
import { getAppContext } from "@/features/auth/context";
import { stripeRevenueLast30Days } from "@/services/billing/stripe";
import { isAdminEmail } from "@/services/users/auth";
import { ANALYTICS_EVENTS } from "@/types/domain";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
    </Card>
  );
}

const date = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminPage() {
  const { user } = await getAppContext();
  if (!isAdminEmail(user.email)) notFound();
  const admin = getAdminStore();
  if (!admin) return <p>Configure SUPABASE_SERVICE_ROLE_KEY pour accéder à l&apos;administration.</p>;

  const [overview, revenue] = await Promise.all([admin.overview(), stripeRevenueLast30Days()]);
  const active = overview.subscriptions.filter((s) => s.status === "active" || s.status === "trialing");
  const mrrCents = active.reduce((sum, s) => sum + monthlyEquivalentCents(s.interval ?? "month"), 0);
  const failureRate = overview.totals.analyses ? Math.round((overview.totals.failedAnalyses / overview.totals.analyses) * 100) : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-[1.9rem] font-extrabold tracking-[-0.03em]">Administration</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Utilisateurs" value={overview.totals.users} />
        <Stat label="Premium" value={overview.totals.premium} />
        <Stat label="Analyses (total)" value={overview.totals.analyses} />
        <Stat label="Analyses (7 j)" value={overview.totals.analyses7d} />
        <Stat label="Taux d'échec" value={`${failureRate} %`} />
        <Stat label={revenue ? "Revenus Stripe (30 j)" : "MRR estimé"} value={revenue ? formatPrice(revenue.amountCents, revenue.currency) : formatPrice(Math.round(mrrCents))} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">Funnel (30 derniers jours)</h2>
        <Card className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-3">
          {ANALYTICS_EVENTS.map((e) => (
            <div key={e} className="flex justify-between border-b border-line/60 py-1.5">
              <span className="font-mono text-xs text-muted">{e}</span>
              <span className="font-bold">{overview.eventCounts[e] ?? 0}</span>
            </div>
          ))}
        </Card>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-extrabold">Erreurs d&apos;analyse récentes</h2>
          <Card className="divide-y divide-line/60 text-sm">
            {overview.recentErrors.length === 0 ? <p className="p-4 text-muted">Aucune erreur 🎉</p> : null}
            {overview.recentErrors.map((s) => (
              <div key={s.id} className="p-3.5">
                <p className="truncate font-semibold">{s.url}</p>
                <p className="text-xs text-error">{s.analysisError}</p>
                <p className="text-xs text-muted">
                  {s.platform} · {date(s.importedAt)}
                </p>
              </div>
            ))}
          </Card>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-extrabold">Contenus analysés récemment</h2>
          <Card className="divide-y divide-line/60 text-sm">
            {overview.recentItems.length === 0 ? <p className="p-4 text-muted">Aucun contenu.</p> : null}
            {overview.recentItems.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-3.5">
                <span className="truncate font-semibold">
                  {CATEGORY_META[i.category].emoji} {i.title}
                </span>
                <span className="shrink-0 text-xs text-muted">{date(i.createdAt)}</span>
              </div>
            ))}
          </Card>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-extrabold">Utilisateurs récents</h2>
          <Card className="divide-y divide-line/60 text-sm">
            {overview.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 p-3.5">
                <span className="truncate">{u.email}</span>
                <span className="shrink-0 text-xs text-muted">
                  {u.plan} · {u.analysisCount} analyses · {date(u.createdAt)}
                </span>
              </div>
            ))}
          </Card>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-extrabold">Abonnements</h2>
          <Card className="divide-y divide-line/60 text-sm">
            {overview.subscriptions.length === 0 ? <p className="p-4 text-muted">Aucun abonnement.</p> : null}
            {overview.subscriptions.map((s) => (
              <div key={s.userId} className="flex items-center justify-between gap-3 p-3.5">
                <span className="truncate font-mono text-xs">{s.stripeSubscriptionId ?? s.userId}</span>
                <span className="shrink-0 text-xs text-muted">
                  {s.status} · {s.interval ?? "—"}
                </span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
