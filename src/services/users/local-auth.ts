import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getLocalDb, mutateLocalDb } from "@/db/local/db";
import { env } from "@/lib/env";
import { newId, nowIso } from "@/lib/utils";

/**
 * Minimal email/password auth for local development when Supabase is not
 * configured. Passwords are hashed with scrypt; the session cookie is HMAC-signed.
 */
export const LOCAL_SESSION_COOKIE = "ouvatu_session";

function secret(): string {
  if (env.sessionSecret) return env.sessionSecret;
  if (env.isProduction) throw new Error("SESSION_SECRET is required when running local auth in production");
  return "ouvatu-dev-only-session-secret";
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const expires = Date.now() + 30 * 86_400_000;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  const expected = sign(`${userId}.${expires}`);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  if (Number(expires) < Date.now()) return null;
  return getLocalDb().users.some((u) => u.id === userId) ? userId : null;
}

export function localSignUp(email: string, password: string, name: string | null): { userId: string } | { error: string } {
  const normalized = email.trim().toLowerCase();
  if (getLocalDb().users.some((u) => u.email === normalized)) {
    return { error: "Un compte existe déjà avec cet email." };
  }
  const id = newId();
  mutateLocalDb((db) =>
    db.users.push({
      id,
      email: normalized,
      name,
      avatarUrl: null,
      plan: "FREE",
      createdAt: nowIso(),
      onboardingCompleted: false,
      interests: [],
      analysisCount: 0,
      passwordHash: hashPassword(password),
    }),
  );
  return { userId: id };
}

export function localSignIn(email: string, password: string): { userId: string } | { error: string } {
  const user = getLocalDb().users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Email ou mot de passe incorrect." };
  }
  return { userId: user.id };
}

export function localGetEmail(userId: string): string | null {
  return getLocalDb().users.find((u) => u.id === userId)?.email ?? null;
}
