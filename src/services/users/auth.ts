import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
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

const NOT_CONNECTED =
  "Le site n'est pas encore relié à la base de données : ajoute SUPABASE_URL et SUPABASE_ANON_KEY sur Vercel, puis redéploie.";

/** Local JSON auth is a development tool: never silently use it in production. */
function localAuthUnavailable(): boolean {
  return env.isProduction && !env.sessionSecret;
}

export type AuthResult = { ok: true; needsEmailConfirmation?: boolean } | { ok: false; error: string };

/** Current authenticated user, validated server-side. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (isSupabaseConfigured) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
    } catch (error) {
      // A misconfigured Supabase must not take the whole site down (landing, login…).
      console.error("[auth] could not read the Supabase session", error);
      return null;
    }
  }
  if (localAuthUnavailable()) return null;
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

/**
 * Sign-up WITHOUT email confirmation: the account is created already confirmed
 * (Supabase admin API) and the user is signed in immediately. No email is sent.
 * Falls back to the regular sign-up flow only if the service role key is missing.
 * @param confirmUrl used by the fallback flow only (confirmation link target).
 */
export async function signUp(
  email: string,
  password: string,
  name: string | null,
  confirmUrl?: string,
): Promise<AuthResult & { userId?: string }> {
  if (isSupabaseConfigured) {
    if (env.supabaseServiceRoleKey) {
      const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) return { ok: false, error: translateAuthError(error.message) };
      const signedIn = await signIn(email, password);
      if (!signedIn.ok) return signedIn;
      return { ok: true, userId: data.user?.id };
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: confirmUrl ?? `${env.appUrl}/auth/callback` },
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    return { ok: true, needsEmailConfirmation: !data.session, userId: data.user?.id };
  }
  if (localAuthUnavailable()) return { ok: false, error: NOT_CONNECTED };
  const result = localSignUp(email, password, name);
  if ("error" in result) return { ok: false, error: result.error };
  await setLocalSession(result.userId);
  return { ok: true, userId: result.userId };
}

/**
 * Accounts created while email confirmation was still enabled may be stuck as
 * "unconfirmed". Supabase only reports that after checking the password, so we
 * confirm the account (admin API) and retry once.
 */
async function confirmPendingAccount(email: string): Promise<boolean> {
  if (!env.supabaseServiceRoleKey) return false;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("users").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (!id) return false;
  const { error } = await admin.auth.admin.updateUserById(id, { email_confirm: true });
  return !error;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && error.message.toLowerCase().includes("email not confirmed") && (await confirmPendingAccount(email))) {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    }
    if (error) return { ok: false, error: translateAuthError(error.message) };
    return { ok: true };
  }
  if (localAuthUnavailable()) return { ok: false, error: NOT_CONNECTED };
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
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("already exists")) return "Un compte existe déjà avec cet email.";
  if (m.includes("email not confirmed")) return "Confirme ton email avant de te connecter.";
  if (m.includes("password")) return "Ce mot de passe n'est pas assez solide (8 caractères minimum).";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessaie dans quelques minutes.";
  return "Impossible de se connecter pour le moment. Réessaie.";
}
