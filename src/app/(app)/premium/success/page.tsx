import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getAppContext } from "@/features/auth/context";
import { RefreshSoon } from "@/features/paywall/refresh-soon";
import { safeNextPath } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Bienvenue dans Premium" };

export default async function PremiumSuccessPage(props: PageProps<"/premium/success">) {
  const next = safeNextPath((await props.searchParams).next);
  const { plan } = await getAppContext();
  const active = plan === "PREMIUM";
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.75rem] bg-accent text-white shadow-accent animate-pop">
        <Sparkles className="h-10 w-10" />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{active ? "Bienvenue dans Premium ✨" : "Paiement reçu"}</h1>
      <p className="mt-2 text-muted">
        {active ? "Ton espace est débloqué. Profite de tout ce qu'OUVATU détecte." : "On active ton abonnement… Cela prend généralement quelques secondes."}
      </p>
      {!active ? <RefreshSoon /> : null}
      <Link href={next ?? "/"} className={buttonClass("dark", "lg", "mt-8")}>
        {next ? "Voir ma fiche complète" : "Retour à mon espace"}
      </Link>
    </div>
  );
}
