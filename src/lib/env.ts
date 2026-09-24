import "server-only";

/**
 * Server-side environment access. Secrets are only read here and never
 * shipped to the client (this module is `server-only`).
 */
function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const env = {
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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

  appUrl: read("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
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
