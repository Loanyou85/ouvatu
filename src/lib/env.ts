import "server-only";

/**
 * Server-side environment access. Secrets are only read here and never
 * shipped to the client (this module is `server-only`).
 */
/** First non-empty value among the given names (private name first, public fallback). */
function read(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

export const env = {
  // Only used server-side: the private names (SUPABASE_URL…) are preferred, NEXT_PUBLIC_ kept for compatibility.
  supabaseUrl: read("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: read("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),

  stripeSecretKey: read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  stripePriceWeekly: read("STRIPE_PRICE_PREMIUM_WEEKLY"),
  stripePriceMonthly: read("STRIPE_PRICE_PREMIUM_MONTHLY"),
  stripePriceYearly: read("STRIPE_PRICE_PREMIUM_YEARLY"),

  aiProvider: read("AI_PROVIDER"),
  aiApiKey: read("AI_API_KEY"),
  aiModel: read("AI_MODEL") ?? "claude-opus-5",

  mapsProvider: read("MAPS_PROVIDER") ?? "osm",
  mapsApiKey: read("MAPS_API_KEY"),
  mapsContactEmail: read("MAPS_CONTACT_EMAIL"),

  tmdbApiKey: read("TMDB_API_KEY"),
  metaOembedToken: read("META_OEMBED_TOKEN"),
  youtubeApiKey: read("YOUTUBE_API_KEY"),

  appUrl: read("APP_URL", "NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  sessionSecret: read("SESSION_SECRET"),
  adminEmails: (read("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  localDbPath: read("OUVATU_LOCAL_DB_PATH"),
  demoBilling: read("OUVATU_DEMO_BILLING") === "true",
  enableExamples: read("OUVATU_ENABLE_EXAMPLES"),
  isProduction: process.env.NODE_ENV === "production",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isStripeConfigured = Boolean(env.stripeSecretKey && env.stripePriceWeekly && env.stripePriceMonthly && env.stripePriceYearly);

/** Simulated checkout is allowed only outside production or when explicitly enabled. */
export const isMockBillingAllowed = !isStripeConfigured && (!env.isProduction || env.demoBilling);

/** "Voir des exemples" button — on by default in dev, opt-in in production. */
export const examplesEnabled =
  env.enableExamples === "true" || (env.enableExamples !== "false" && !env.isProduction);
