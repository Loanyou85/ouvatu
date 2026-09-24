"use client";

import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { PREMIUM_OFFERS, formatPrice } from "@/config/plans";

const PaywallContext = createContext<(reason?: string) => void>(() => undefined);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [reason, setReason] = useState<string | null>(null);
  const open = useCallback((r = "Débloque tout NOMA") => setReason(r), []);
  return (
    <PaywallContext.Provider value={open}>
      {children}
      <Sheet open={reason !== null} onClose={() => setReason(null)} hideClose>
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-accent animate-pop">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight">{reason}</h2>
          <p className="mt-1 text-muted">Passe à Premium et profite de tout ce que NOMA détecte.</p>
          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-[0.95rem]">
            {["Tous les éléments détectés", "Itinéraires de voyage", "Bibliothèque et collections illimitées", "Beaucoup plus d'analyses"].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-success" strokeWidth={3} /> {f}
              </li>
            ))}
          </ul>
          <Link href="/premium" className={buttonClass("accent", "lg", "mt-6 w-full")}>
            Débloquer mon espace
          </Link>
          <p className="mt-3 text-xs text-subtle">
            {formatPrice(PREMIUM_OFFERS.month.amountCents)}/mois ou {formatPrice(PREMIUM_OFFERS.year.amountCents)}/an · Sans engagement
          </p>
          <button onClick={() => setReason(null)} className="mt-3 text-sm font-semibold text-muted hover:text-ink">
            Plus tard
          </button>
        </div>
      </Sheet>
    </PaywallContext.Provider>
  );
}

export function useOpenPaywall() {
  return useContext(PaywallContext);
}
