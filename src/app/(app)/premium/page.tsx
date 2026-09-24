import { Check, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { PLAN_LIMITS } from "@/config/plans";
import { getAppContext } from "@/features/auth/context";
import { PlanPicker } from "@/features/paywall/plan-picker";
import { track } from "@/services/analytics";

export const metadata: Metadata = { title: "Premium" };

const FEATURES = [
  { title: "Tous les éléments détectés", text: "Plus d'aperçu limité : chaque lieu, film, livre ou produit." },
  { title: "Itinéraires de voyage", text: "Tes lieux organisés jour par jour, en regroupant ceux qui sont proches." },
  { title: "Bibliothèque illimitée", text: "Garde toutes tes découvertes et crée autant de collections que tu veux." },
  { title: `Jusqu'à ${PLAN_LIMITS.PREMIUM.analysesPerMonth} analyses / mois`, text: "Transforme tout ce que tu trouves, chaque semaine." },
];

export default async function PremiumPage(props: PageProps<"/premium">) {
  const sp = await props.searchParams;
  const { user, plan } = await getAppContext();
  if (plan !== "PREMIUM") await track(user.id, "paywall_viewed", { reason: typeof sp.reason === "string" ? sp.reason.slice(0, 30) : "page" });

  if (plan === "PREMIUM") {
    return (
      <div className="mx-auto max-w-md py-10 text-center animate-fade-up">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent text-white shadow-accent">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Tu es Premium ✨</h1>
        <p className="mt-2 text-muted">Toutes les fonctionnalités d&apos;OUVATU sont débloquées.</p>
        <Link href="/profile" className={buttonClass("dark", "lg", "mt-8")}>
          Gérer mon abonnement
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-start md:gap-10 md:pt-6">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-strong">
          <Sparkles className="h-3.5 w-3.5" /> OUVATU Premium
        </span>
        <h1 className="mt-4 text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">Débloque ton espace.</h1>
        <p className="mt-3 text-lg text-muted">Tout ce qu&apos;OUVATU détecte, sans limite.</p>
        {sp.canceled ? <p className="mt-4 rounded-2xl bg-hover px-4 py-3 text-sm">Paiement annulé. Tu peux réessayer quand tu veux.</p> : null}
      </div>
      <div className="rounded-[1.75rem] bg-card p-5 shadow-float sm:p-6 animate-fade-up [animation-delay:100ms] md:col-start-2 md:row-start-1 md:row-span-3">
        <PlanPicker />
      </div>
      <div className="animate-fade-up md:col-start-1">
        <ul className="space-y-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span>
                <span className="block font-bold">{f.title}</span>
                <span className="text-sm text-muted">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
