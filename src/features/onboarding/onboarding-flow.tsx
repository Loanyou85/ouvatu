"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { BRAND } from "@/config/brand";
import { ONBOARDING_INTERESTS } from "@/config/categories";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "./actions";

export function OnboardingFlow({ name }: { name: string | null }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-6">
      <div className="flex gap-1.5" aria-label={`Étape ${step + 1} sur 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-ink" : "bg-line")} />
        ))}
      </div>

      <div key={step} className="flex flex-1 flex-col animate-fade-up">
        {step === 0 ? (
          <div className="flex flex-1 flex-col justify-center text-center">
            <LogoMark className="mx-auto h-20 w-20 animate-pop" />
            <h1 className="mt-8 text-[2rem] font-extrabold leading-tight tracking-tight">
              Bienvenue sur {BRAND.name}{name ? `, ${name}` : ""}.
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-lg text-muted">
              Tu trouves quelque chose en ligne. On le transforme en quelque chose d&apos;utile.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-1 flex-col pt-10">
            <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight">Qu&apos;est-ce que tu sauvegardes le plus ?</h1>
            <p className="mt-2 text-muted">Choisis autant que tu veux.</p>
            <div className="mt-7 grid grid-cols-3 gap-2.5">
              {ONBOARDING_INTERESTS.map((interest) => {
                const active = selected.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggle(interest.id)}
                    aria-pressed={active}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border-2 bg-card text-sm font-semibold transition-all active:scale-95",
                      active ? "border-accent bg-accent-soft" : "border-transparent shadow-card",
                    )}
                  >
                    {active ? (
                      <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-accent text-white animate-pop">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : null}
                    <span className="text-3xl" aria-hidden>
                      {interest.emoji}
                    </span>
                    {interest.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-1 flex-col justify-center text-center">
            <div className="mx-auto grid w-full max-w-[260px] gap-2.5 text-left">
              {["Copie un lien", "Colle-le dans NOMA", "Profite de ta fiche"].map((label, i) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card animate-fade-up" style={{ animationDelay: `${i * 120}ms` }}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-sm font-extrabold text-accent-strong">{i + 1}</span>
                  <span className="font-semibold">{label}</span>
                </div>
              ))}
            </div>
            <h1 className="mt-10 text-[2rem] font-extrabold leading-tight tracking-tight">Prêt à transformer tes découvertes ?</h1>
          </div>
        ) : null}
      </div>

      <Button
        variant={step === 2 ? "accent" : "dark"}
        size="lg"
        className="w-full"
        loading={pending}
        onClick={() => {
          if (step < 2) setStep(step + 1);
          else startTransition(() => completeOnboarding(selected));
        }}
      >
        {step === 0 ? "C'est parti" : step === 1 ? (selected.length ? "Continuer" : "Passer") : "Commencer"}
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
