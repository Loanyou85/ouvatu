"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input, Label } from "@/components/ui/input";
import { signInAction, signUpAction, type AuthFormState } from "./actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(mode === "login" ? signInAction : signUpAction, {});

  if (state.info) {
    return (
      <div className="rounded-card bg-success-soft p-5 text-center">
        <p className="text-2xl" aria-hidden>
          📬
        </p>
        <p className="mt-2 font-semibold text-success">{state.info}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {mode === "signup" ? (
        <div>
          <Label htmlFor="name">Prénom</Label>
          <Input id="name" name="name" autoComplete="given-name" placeholder="Camille" defaultValue={state.values?.name} maxLength={60} />
        </div>
      ) : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="toi@exemple.com" defaultValue={state.values?.email} />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : 1}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "8 caractères minimum" : "••••••••"}
        />
      </div>
      {mode === "signup" ? (
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#6C63FF]" />
          <span>
            J&apos;accepte les{" "}
            <Link href="/legal/terms" className="font-semibold text-ink underline underline-offset-2">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/legal/privacy" className="font-semibold text-ink underline underline-offset-2">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
      ) : null}
      <Button type="submit" variant="dark" size="lg" className="w-full" loading={pending}>
        {mode === "login" ? "Se connecter" : "Créer mon compte"}
      </Button>
      {mode === "signup" ? (
        <p className="text-center text-xs text-subtle">
          Uniquement des cookies nécessaires à ta connexion, aucun traceur publicitaire.{" "}
          <Link href="/legal/cookies" className="underline underline-offset-2">
            En savoir plus
          </Link>
        </p>
      ) : null}
    </form>
  );
}
