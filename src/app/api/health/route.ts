import { NextResponse } from "next/server";
import { env, isStripeConfigured, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — configuration diagnostic. Reports only yes/no and short
 * messages, never a key or a secret value.
 */
export async function GET() {
  const checks: Record<string, string> = {
    "Base de données (SUPABASE_URL + SUPABASE_ANON_KEY)": isSupabaseConfigured ? "OK" : "MANQUANT",
    "Clé secrète Supabase (SUPABASE_SERVICE_ROLE_KEY)": env.supabaseServiceRoleKey ? "OK" : "MANQUANT",
    "Paiement Stripe (clé + 3 prix)": isStripeConfigured ? "OK" : "MANQUANT (paiement désactivé)",
    "Webhook Stripe (STRIPE_WEBHOOK_SECRET)": env.stripeWebhookSecret ? "OK" : "MANQUANT",
    "IA (AI_API_KEY)": env.aiApiKey ? "OK" : "MANQUANT (analyseur de secours utilisé)",
    "Adresse du site (APP_URL)": env.appUrl.includes("localhost") ? "MANQUANT (localhost)" : "OK",
  };

  if (isSupabaseConfigured && env.supabaseServiceRoleKey) {
    const admin = createSupabaseAdminClient();
    for (const table of ["users", "content_items", "subscriptions"]) {
      const { error } = await admin.from(table).select("*", { count: "exact", head: true });
      checks[`Table ${table}`] = error
        ? `ERREUR : ${error.message.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205" ? "table absente, lance la migration SQL" : error.message}`
        : "OK";
    }
  }

  const ok = Object.values(checks).every((v) => v === "OK" || v.startsWith("MANQUANT ("));
  return NextResponse.json({ ok, checks }, { headers: { "cache-control": "no-store" } });
}
