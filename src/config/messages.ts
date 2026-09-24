/** Human-facing error copy. Never show raw technical errors to users. */
export const ANALYSIS_ERRORS: Record<string, { title: string; hint: string }> = {
  invalid_url: {
    title: "Ce lien ne semble pas valide.",
    hint: "Copie le lien complet depuis l'application (bouton Partager → Copier le lien).",
  },
  subscription_required: {
    title: "Un abonnement est nécessaire pour analyser un lien.",
    hint: "Choisis une offre pour commencer à transformer tes découvertes.",
  },
  quota_exceeded: {
    title: "Tu as atteint la limite d'analyses de ce mois.",
    hint: "Ton quota se renouvelle au début du mois prochain.",
  },
  unreachable: {
    title: "On n'a pas réussi à ouvrir ce lien.",
    hint: "Vérifie qu'il est public, ou essaie avec un autre lien.",
  },
  empty: {
    title: "Ce contenu ne partage presque aucune information publique.",
    hint: "Colle la légende ou la description dans le champ « Ajouter du texte » pour aider ouvatu.",
  },
  not_understood: {
    title: "On n'a pas réussi à comprendre ce contenu.",
    hint: "Essaie avec un autre lien, ou ajoute la légende de la vidéo.",
  },
  unavailable: {
    title: "L'analyse est momentanément indisponible.",
    hint: "Réessaie dans quelques instants.",
  },
  rate_limited: {
    title: "Doucement, tu vas trop vite !",
    hint: "Attends quelques secondes avant de relancer une analyse.",
  },
  internal: {
    title: "On n'a pas réussi à comprendre ce contenu.",
    hint: "Essaie avec un autre lien.",
  },
};

export function analysisErrorCopy(raw: string | null | undefined) {
  const code = (raw ?? "internal").split(":")[0].trim();
  return { code, ...(ANALYSIS_ERRORS[code] ?? ANALYSIS_ERRORS.internal) };
}
