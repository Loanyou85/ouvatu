import "server-only";
import { env, isStripeConfigured, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { checkStripePrices } from "@/services/billing/stripe";
import { checkAnthropicSetup } from "@/services/content-analysis/providers/anthropic";

export interface HealthCheck {
  label: string;
  status: "ok" | "missing" | "error" | "optional";
  detail: string;
  fix?: string;
}

function describeDbError(message: string, code?: string): string {
  const m = message.toLowerCase();
  if (code === "42P01" || code === "PGRST205" || m.includes("does not exist") || m.includes("could not find the table") || m.includes("schema cache")) {
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
        // Real GET (not HEAD): HEAD responses carry no error body, which hid missing tables.
        const { error } = await admin.from(table).select("*").limit(1);
        checks.push({
          label: `Table « ${table} »`,
          status: error ? "error" : "ok",
          detail: error ? describeDbError(error.message, error.code) : "OK",
          fix: !error
            ? undefined
            : describeDbError(error.message, error.code) === "table absente"
              ? "Supabase → SQL Editor → New query : colle tout le fichier supabase/setup.sql → Run"
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
  const stripeVars = {
    STRIPE_SECRET_KEY: env.stripeSecretKey,
    STRIPE_PRICE_PREMIUM_WEEKLY: env.stripePriceWeekly,
    STRIPE_PRICE_PREMIUM_MONTHLY: env.stripePriceMonthly,
    STRIPE_PRICE_PREMIUM_YEARLY: env.stripePriceYearly,
  };
  const missingStripe = Object.entries(stripeVars).filter(([, v]) => !v).map(([k]) => k);
  if (!isStripeConfigured) {
    checks.push({
      label: "Paiement Stripe",
      status: "missing",
      detail: `manquant : ${missingStripe.join(", ")}`,
      fix: "Vercel → Settings → Environment Variables : ajoute ces variables puis Redeploy",
    });
  } else {
    const key = env.stripeSecretKey ?? "";
    const keyKind = /^(sk|rk)_test_/.test(key) ? "test" : /^(sk|rk)_live_/.test(key) ? "production" : null;
    checks.push({
      label: "STRIPE_SECRET_KEY",
      status: keyKind ? "ok" : "error",
      detail: keyKind ? `OK (mode ${keyKind}${key.startsWith("rk_") ? ", clé limitée rk_" : ""})` : "format inattendu (doit commencer par sk_ ou rk_)",
      fix: keyKind ? undefined : "Stripe → Développeurs → Clés API → copie la clé secrète",
    });
    const labels = { week: "STRIPE_PRICE_PREMIUM_WEEKLY", month: "STRIPE_PRICE_PREMIUM_MONTHLY", year: "STRIPE_PRICE_PREMIUM_YEARLY" } as const;
    for (const r of await checkStripePrices()) {
      checks.push({ label: labels[r.interval], status: r.ok ? "ok" : "error", detail: r.detail, fix: r.fix });
    }
  }
  const ai = await checkAnthropicSetup();
  checks.push({
    label: "IA (AI_API_KEY)",
    status: ai.ok ? "ok" : env.aiApiKey ? "error" : "missing",
    detail: ai.detail,
    fix: ai.fix,
  });
  return checks;
}
