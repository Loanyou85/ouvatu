import "server-only";
import { env, isStripeConfigured, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface HealthCheck {
  label: string;
  status: "ok" | "missing" | "error" | "optional";
  detail: string;
  fix?: string;
}

function describeDbError(message: string, code?: string): string {
  const m = message.toLowerCase();
  if (code === "42P01" || code === "PGRST205" || m.includes("does not exist") || m.includes("could not find the table")) {
    return "table absente";
  }
  if (m.includes("invalid api key") || m.includes("jwt") || m.includes("unauthorized") || m.includes("invalid key")) return "clé Supabase refusée";
  if (m.includes("fetch failed") || m.includes("enotfound") || m.includes("getaddrinfo")) return "adresse Supabase injoignable";
  return message.slice(0, 160);
}

/** Configuration diagnostic: reports presence/validity only, never secret values. */
export async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const urlLooksRight = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(env.supabaseUrl ?? "");

  checks.push({
    label: "SUPABASE_URL",
    status: !env.supabaseUrl ? "missing" : urlLooksRight ? "ok" : "error",
    detail: !env.supabaseUrl ? "manquante" : urlLooksRight ? "OK" : "format inhabituel",
    fix: "Supabase → Project Settings → API → Project URL, du type https://xxxx.supabase.co",
  });
  checks.push({
    label: "SUPABASE_ANON_KEY",
    status: env.supabaseAnonKey ? "ok" : "missing",
    detail: env.supabaseAnonKey ? "OK" : "manquante",
    fix: "Supabase → Project Settings → API Keys → Publishable key (ou Legacy → anon)",
  });
  checks.push({
    label: "SUPABASE_SERVICE_ROLE_KEY",
    status: env.supabaseServiceRoleKey ? "ok" : "missing",
    detail: env.supabaseServiceRoleKey ? "OK" : "manquante",
    fix: "Supabase → Project Settings → API Keys → Secret key (ou Legacy → service_role)",
  });

  if (isSupabaseConfigured && env.supabaseServiceRoleKey) {
    try {
      const admin = createSupabaseAdminClient();
      for (const table of ["users", "content_items", "subscriptions", "collections"]) {
        const { error } = await admin.from(table).select("*", { count: "exact", head: true });
        checks.push({
          label: `Table « ${table} »`,
          status: error ? "error" : "ok",
          detail: error ? describeDbError(error.message, error.code) : "OK",
          fix: !error
            ? undefined
            : describeDbError(error.message, error.code) === "table absente"
              ? "Supabase → SQL Editor : exécute supabase/migrations/20260924000000_init.sql puis 20260924120000_weekly_plan.sql"
              : "Vérifie SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (même projet Supabase, sans espace)",
        });
      }
    } catch (error) {
      checks.push({
        label: "Connexion à Supabase",
        status: "error",
        detail: describeDbError(error instanceof Error ? error.message : "erreur inconnue"),
        fix: "Vérifie SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY",
      });
    }
  }

  checks.push({
    label: "APP_URL",
    status: env.appUrl.includes("localhost") ? "missing" : "ok",
    detail: env.appUrl.includes("localhost") ? "manquante (localhost)" : "OK",
    fix: "L'adresse de ton site, ex. https://ouvatu.vercel.app (sans / à la fin)",
  });
  checks.push({
    label: "Paiement Stripe",
    status: isStripeConfigured ? "ok" : "optional",
    detail: isStripeConfigured ? "OK" : "non configuré (paiement indisponible)",
    fix: "STRIPE_SECRET_KEY + STRIPE_PRICE_PREMIUM_WEEKLY / MONTHLY / YEARLY",
  });
  checks.push({
    label: "IA (AI_API_KEY)",
    status: env.aiApiKey ? "ok" : "optional",
    detail: env.aiApiKey ? "OK" : "non configurée (analyseur de secours)",
  });
  return checks;
}
