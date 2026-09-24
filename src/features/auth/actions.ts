"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { track } from "@/services/analytics";
import { signIn, signOut, signUp } from "@/services/users/auth";
import { headers } from "next/headers";

export interface AuthFormState {
  error?: string;
  info?: string;
  values?: { email?: string; name?: string };
}

const SignUpSchema = z.object({
  name: z.string().trim().max(60).optional(),
  email: z.email("Adresse email invalide.").max(200),
  password: z.string().min(8, "8 caractères minimum.").max(200),
  consent: z.literal("on", { error: "Accepte les conditions pour continuer." }),
});

const SignInSchema = z.object({
  email: z.email("Adresse email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? ""), name: String(formData.get("name") ?? "") };
  if (!rateLimit(`auth:${await clientKey()}`, 10, 60_000).ok) return { error: "Trop de tentatives. Réessaie dans une minute.", values };
  const parsed = SignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide.", values };

  const result = await signUp(parsed.data.email, parsed.data.password, parsed.data.name || null);
  if (!result.ok) return { error: result.error, values };
  await track(result.userId ?? null, "user_signed_up", {});
  if (result.needsEmailConfirmation) {
    return { info: "Presque fini ! Clique sur le lien reçu par email pour activer ton compte.", values };
  }
  redirect("/onboarding");
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? "") };
  if (!rateLimit(`auth:${await clientKey()}`, 10, 60_000).ok) return { error: "Trop de tentatives. Réessaie dans une minute.", values };
  const parsed = SignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide.", values };
  const result = await signIn(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: result.error, values };
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
