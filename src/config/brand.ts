/** Central branding. Change the product name here and everywhere follows. */
export const BRAND = {
  name: "OUVATU",
  wordmark: "OUVATU",
  tagline: "Tes découvertes. Enfin utilisables.",
  secondaryTagline: "Tu trouves. On s'occupe du reste.",
  description:
    "Colle un lien TikTok, Instagram, YouTube ou Pinterest et laisse OUVATU s'occuper du reste.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@ouvatu.app",
  legalEntity: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "OUVATU (éditeur à compléter)",
} as const;
