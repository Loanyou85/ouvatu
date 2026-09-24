import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  LOCAL_SESSION_COOKIE,
  createSessionToken,
  localGetEmail,
  localSignIn,
  localSignUp,
  readSessionToken,
} from "./local-auth";

export interface SessionUser {
  id: string;
  email: string;
}

export type AuthResult = { ok: true; needsEmailConfirmation?: boolean } | { ok: false; error: string };

/** Current authenticated user, validated server-side. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
  }
  const cookieStore = await cookies();
  const userId = readSessionToken(cookieStore.get(LOCAL_SESSION_COOKIE)?.value);
  if (!userId) return null;
  return { id: userId, email: localGetEmail(userId) ?? "" };
});

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdminEmail(email: string): boolean {
  return env.adminEmails.includes(email.toLowerCase());
}

async function setLocalSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 30 * 86_400,
  });
}

export async function signUp(email: string, password: string, name: string | null): Promise<AuthResult & { userId?: string }> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: `${env.appUrl}/auth/callback` },
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    return { ok: true, needsEmailConfirmation: !data.session, userId: data.user?.id };
  }
  const result = localSignUp(email, password, name);
  if ("error" in result) return { ok: false, error: result.error };
  await setLocalSession(result.userId);
  return { ok: true, userId: result.userId };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    return { ok: true };
  }
  const result = localSignIn(email, password);
  if ("error" in result) return { ok: false, error: result.error };
  await setLocalSession(result.userId);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_SESSION_COOKIE);
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already exists")) return "Un compte existe déjà avec cet email.";
  if (m.includes("email not confirmed")) return "Confirme ton email avant de te connecter.";
  if (m.includes("password")) return "Ce mot de passe n'est pas assez solide (8 caractères minimum).";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessaie dans quelques minutes.";
  return "Impossible de se connecter pour le moment. Réessaie.";
}
