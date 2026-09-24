import { BRAND } from "@/config/brand";
import { OFFER_ORDER, PLAN_LIMITS, PREMIUM_OFFERS, formatPrice } from "@/config/plans";

/**
 * Legal copy (FR). Templates to be reviewed by a lawyer before launch:
 * fill in the legal entity, address, SIREN, host and DPO details.
 */
export interface LegalPage {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}

const UPDATED = "24 septembre 2026";

export const LEGAL_PAGES: Record<string, LegalPage> = {
  privacy: {
    title: "Politique de confidentialité",
    updated: UPDATED,
    sections: [
      {
        heading: "Qui sommes-nous ?",
        body: [`${BRAND.name} est édité par ${BRAND.legalEntity}. Pour toute question relative à tes données : ${BRAND.supportEmail}.`],
      },
      {
        heading: "Données que nous traitons",
        body: [
          "Compte : adresse email, prénom (facultatif), centres d'intérêt choisis à l'inscription.",
          "Contenus : les liens que tu soumets, les métadonnées publiques associées (titre, auteur, miniature) et les fiches structurées générées.",
          "Usage : événements produit anonymisables (ex. « analyse lancée ») servant à améliorer le service. Aucun traceur publicitaire.",
          "Paiement : géré par Stripe. Nous ne voyons ni ne stockons jamais ton numéro de carte.",
        ],
      },
      {
        heading: "Pourquoi ?",
        body: [
          "Fournir le service (exécution du contrat), sécuriser les comptes et prévenir les abus (intérêt légitime), mesurer l'usage de façon agrégée (intérêt légitime), gérer la facturation (obligation légale).",
        ],
      },
      {
        heading: "Contenus externes",
        body: [
          "Nous ne récupérons que des informations publiquement accessibles (métadonnées officielles, balises publiques des pages). Nous ne conservons pas le texte intégral des pages analysées : seuls la fiche générée et quelques métadonnées légères sont stockées.",
          "Le texte analysé peut être transmis à notre fournisseur d'IA pour produire la fiche. Il n'est pas utilisé pour entraîner des modèles selon les conditions de ce fournisseur.",
        ],
      },
      {
        heading: "Sous-traitants",
        body: ["Hébergement (Vercel), base de données et authentification (Supabase, région UE recommandée), paiement (Stripe), analyse IA (Anthropic), cartographie (OpenStreetMap / fournisseur configuré)."],
      },
      {
        heading: "Durée de conservation",
        body: ["Tes données sont conservées tant que ton compte est actif. Tu peux supprimer un élément à tout moment ; la suppression du compte efface toutes tes données. Les données de facturation sont conservées selon les obligations légales."],
      },
      {
        heading: "Tes droits",
        body: [
          "Accès, rectification, effacement, portabilité, opposition et limitation. Depuis ton Profil : « Exporter mes données » (JSON) et « Supprimer mon compte ».",
          `Pour toute autre demande : ${BRAND.supportEmail}. Tu peux aussi saisir la CNIL (www.cnil.fr).`,
        ],
      },
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    updated: UPDATED,
    sections: [
      { heading: "Le service", body: [`${BRAND.name} transforme des liens de contenus trouvés en ligne en fiches structurées que tu peux organiser et utiliser.`] },
      {
        heading: "Ton compte",
        body: ["Tu dois fournir une adresse email valide et garder ton mot de passe confidentiel. Un compte est personnel."],
      },
      {
        heading: "Contenus soumis",
        body: [
          "Tu ne soumets que des liens vers des contenus auxquels tu as légalement accès. Les contenus d'origine restent la propriété de leurs auteurs ; OUVATU conserve un lien vers la source.",
          "Les fiches sont générées automatiquement à partir d'informations publiques et peuvent être incomplètes. Quand une information n'est pas disponible, OUVATU l'indique au lieu de l'inventer. Vérifie les informations importantes (horaires, prix, allergènes…) auprès de la source.",
        ],
      },
      {
        heading: "Offres",
        body: [
          `L'utilisation du service nécessite un abonnement : ${OFFER_ORDER.map((k) => `${PREMIUM_OFFERS[k].label.toLowerCase()} à ${formatPrice(PREMIUM_OFFERS[k].amountCents)}/${PREMIUM_OFFERS[k].unit}`).join(", ")}. L'abonnement est renouvelé automatiquement et résiliable à tout moment depuis ton profil ; la résiliation prend effet à la fin de la période en cours. Usage raisonnable : ${PLAN_LIMITS.PREMIUM.analysesPerMonth} analyses par mois.`,
          "Droit de rétractation : en demandant l'accès immédiat au service, tu reconnais que le service commence avant la fin du délai de rétractation de 14 jours.",
        ],
      },
      { heading: "Usage acceptable", body: ["Pas d'automatisation abusive, de contournement des limites ni d'usage illégal du service."] },
      { heading: "Résiliation", body: ["Tu peux supprimer ton compte à tout moment depuis ton profil."] },
      { heading: "Droit applicable", body: ["Droit français. En cas de litige, une solution amiable sera recherchée avant toute action."] },
    ],
  },
  mentions: {
    title: "Mentions légales",
    updated: UPDATED,
    sections: [
      { heading: "Éditeur", body: [`${BRAND.legalEntity} — adresse, forme sociale, capital et SIREN à compléter. Contact : ${BRAND.supportEmail}.`] },
      { heading: "Directeur de la publication", body: ["À compléter."] },
      { heading: "Hébergement", body: ["Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — à adapter selon l'hébergement retenu."] },
    ],
  },
  cookies: {
    title: "Cookies",
    updated: UPDATED,
    sections: [
      {
        heading: "Cookies utilisés",
        body: [
          "Uniquement des cookies strictement nécessaires : maintien de ta session de connexion. Ils sont exemptés de consentement (article 82 de la loi Informatique et Libertés).",
          "Nous n'utilisons aucun cookie publicitaire ni traceur tiers. La mesure d'usage est réalisée côté serveur, sans cookie.",
          "Aucun bandeau de consentement n'est donc nécessaire. Si des traceurs non essentiels étaient ajoutés un jour, ton consentement préalable serait demandé.",
        ],
      },
    ],
  },
};
