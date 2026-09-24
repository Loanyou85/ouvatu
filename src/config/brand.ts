/** Central branding. Change the product name here and everywhere follows. */
export const BRAND = {
  name: "NOMA",
  wordmark: "noma",
  tagline: "Tes découvertes. Enfin utilisables.",
  secondaryTagline: "Tu trouves. On s'occupe du reste.",
  description:
    "Colle un lien TikTok, Instagram, YouTube ou Pinterest et laisse NOMA s'occuper du reste.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@noma.app",
  legalEntity: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "NOMA (éditeur à compléter)",
} as const;
