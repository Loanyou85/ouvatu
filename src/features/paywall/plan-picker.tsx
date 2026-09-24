"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/input";
import { PREMIUM_OFFERS, formatPrice, type BillingInterval } from "@/config/plans";
import { cn } from "@/lib/utils";

export function PlanPicker() {
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ interval }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { url?: string } | null;
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    setLoading(false);
    setError("Le paiement est momentanément indisponible. Réessaie dans quelques instants.");
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />
      {(["year", "month"] as const).map((key) => {
        const offer = PREMIUM_OFFERS[key];
        const active = interval === key;
        const perMonth = key === "year" ? formatPrice(Math.round(offer.amountCents / 12)) : null;
        return (
          <button
            key={key}
            onClick={() => setInterval(key)}
            aria-pressed={active}
            className={cn("flex w-full items-center gap-4 rounded-card border-2 bg-card p-4 text-left transition", active ? "border-accent shadow-card" : "border-line")}
          >
            <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", active ? "border-accent bg-accent text-white" : "border-line")}>
              {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-2 font-extrabold">
                {offer.label}
                {offer.highlight ? <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success">{offer.highlight}</span> : null}
              </span>
              {perMonth ? <span className="text-sm text-muted">soit {perMonth}/mois</span> : <span className="text-sm text-muted">Sans engagement</span>}
            </span>
            <span className="text-right">
              <span className="block text-lg font-extrabold">{formatPrice(offer.amountCents)}</span>
              <span className="text-xs text-muted">/{key === "year" ? "an" : "mois"}</span>
            </span>
          </button>
        );
      })}
      <Button variant="accent" size="lg" className="w-full" loading={loading} onClick={checkout}>
        Débloquer mon espace <ArrowRight className="h-5 w-5" />
      </Button>
      <p className="text-center text-xs text-subtle">Paiement sécurisé par Stripe · Résiliable à tout moment</p>
    </div>
  );
}
