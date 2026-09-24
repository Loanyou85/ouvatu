import { notFound } from "next/navigation";
import { PREMIUM_OFFERS, formatPrice } from "@/config/plans";
import { DemoCheckoutButton } from "@/features/paywall/demo-checkout";
import { isMockBillingAllowed } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next";

/** Development stand-in for Stripe Checkout (never available when Stripe is configured). */
export default async function DemoCheckoutPage(props: PageProps<"/premium/checkout-demo">) {
  if (!isMockBillingAllowed) notFound();
  const sp = await props.searchParams;
  const interval = sp.interval === "week" || sp.interval === "month" ? sp.interval : "year";
  const offer = PREMIUM_OFFERS[interval];
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-5 rounded-2xl border border-dashed border-accent bg-accent-soft p-4 text-sm">
        <p className="font-bold text-accent-strong">Paiement simulé — mode développement</p>
        <p className="mt-1 text-ink/80">Stripe n&apos;est pas configuré. Aucun paiement réel n&apos;est effectué. Configure les clés Stripe pour activer le vrai paiement (voir README).</p>
      </div>
      <div className="rounded-[1.75rem] bg-card p-6 shadow-float">
        <p className="text-sm font-semibold text-muted">OUVATU Premium · {offer.label}</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatPrice(offer.amountCents)}</p>
        <p className="text-sm text-muted">par {offer.unit}</p>
        <div className="mt-6">
          <DemoCheckoutButton interval={interval} label="Simuler le paiement" next={safeNextPath(sp.next)} />
        </div>
      </div>
    </div>
  );
}
