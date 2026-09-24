import { ArrowRight, Check, Link2, Sparkles } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { BRAND } from "@/config/brand";
import { OFFER_ORDER, PLAN_LIMITS, PREMIUM_OFFERS, formatPrice } from "@/config/plans";
import { SiteFooter } from "@/components/layout/site-footer";

const DEMOS = [
  {
    source: "TikTok",
    input: "« 10 endroits à visiter à Lisbonne »",
    emoji: "✈️",
    title: "Lisbonne — 3 jours",
    facts: ["7 lieux", "3 restaurants", "2 cafés"],
    action: "Créer mon itinéraire",
  },
  {
    source: "Instagram",
    input: "« Ma recette de pâtes crémeuses »",
    emoji: "🍝",
    title: "Pâtes crémeuses au citron",
    facts: ["20 min", "2 pers.", "6 ingrédients"],
    action: "Ajouter aux courses",
  },
  {
    source: "YouTube",
    input: "« 5 films qui vont te retourner le cerveau »",
    emoji: "🎬",
    title: "5 films à voir",
    facts: ["Science-fiction", "Thriller"],
    action: "Ajouter à ma watchlist",
  },
];

export function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/login" className={buttonClass("ghost", "sm")}>
            Se connecter
          </Link>
          <Link href="/signup" className={buttonClass("dark", "sm")}>
            Commencer
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-6">
        <section className="grid items-center gap-12 pb-16 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-strong">
              <Sparkles className="h-3.5 w-3.5" /> {BRAND.secondaryTagline}
            </span>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{BRAND.tagline}</h1>
            <p className="mt-5 max-w-md text-lg text-muted">{BRAND.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClass("accent", "lg")}>
                Créer mon espace <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/login" className={buttonClass("secondary", "lg")}>
                J&apos;ai déjà un compte
              </Link>
            </div>
            <p className="mt-4 text-sm text-subtle">Sans engagement · Dès {formatPrice(PREMIUM_OFFERS.week.amountCents)}/semaine</p>
          </div>

          <div className="relative mx-auto w-full max-w-sm animate-fade-up [animation-delay:120ms]">
            <div aria-hidden className="absolute -inset-6 -z-10 rounded-[3rem] bg-accent-soft blur-2xl" />
            <div className="rounded-[2rem] bg-card p-4 shadow-float">
              <div className="flex items-center gap-2 rounded-2xl bg-bg px-4 py-3.5 text-sm text-muted">
                <Link2 className="h-4 w-4" /> tiktok.com/@…/video/742…
              </div>
              <div className="my-3 flex items-center justify-center gap-2 text-xs font-bold text-accent-strong">
                <Sparkles className="h-4 w-4 animate-breathe" /> OUVATU analyse…
              </div>
              <div className="overflow-hidden rounded-2xl border border-line">
                <div className="grid h-36 place-items-center bg-gradient-to-br from-accent-soft via-[#f4f3ff] to-bg text-6xl">🇵🇹</div>
                <div className="p-4">
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">✈️ Voyage</span>
                  <p className="mt-2 text-lg font-extrabold tracking-tight">Lisbonne — 3 jours</p>
                  <p className="text-sm text-muted">7 lieux · 3 restaurants · 2 cafés</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <span className={buttonClass("dark", "sm", "w-full")}>Voir la carte</span>
                    <span className={buttonClass("soft", "sm", "w-full")}>Itinéraire</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <h2 className="text-center text-3xl font-extrabold tracking-tight">Un lien. Une fiche utile.</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-muted">OUVATU comprend ce que tu as trouvé et le transforme en quelque chose que tu peux vraiment utiliser.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {DEMOS.map((demo, i) => (
              <div key={demo.title} className="rounded-card bg-card p-5 shadow-card animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
                <p className="text-xs font-bold uppercase tracking-wider text-subtle">{demo.source}</p>
                <p className="mt-1 font-semibold text-muted">{demo.input}</p>
                <div className="my-4 flex items-center gap-2 text-accent">
                  <span className="h-px flex-1 bg-line" />
                  <ArrowRight className="h-4 w-4" />
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-2xl">{demo.emoji}</span>
                  <div>
                    <p className="font-extrabold tracking-tight">{demo.title}</p>
                    <p className="text-sm text-muted">{demo.facts.join(" · ")}</p>
                  </div>
                </div>
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white">{demo.action}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12" id="offres">
          <h2 className="text-center text-3xl font-extrabold tracking-tight">Choisis ton rythme.</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-muted">Toutes les fonctionnalités, quelle que soit l&apos;offre. Sans engagement.</p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
            {OFFER_ORDER.map((key) => {
              const offer = PREMIUM_OFFERS[key];
              const featured = key === "year";
              return (
                <div key={key} className={featured ? "rounded-card bg-ink p-6 text-white shadow-float" : "rounded-card bg-card p-6 shadow-card"}>
                  <p className="flex items-center gap-2 font-extrabold">
                    {offer.label}
                    {offer.highlight ? <span className="rounded-full bg-success px-2 py-0.5 text-xs font-bold text-white">{offer.highlight}</span> : null}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight">
                    {formatPrice(offer.amountCents)}
                    <span className={featured ? "text-base font-semibold text-white/60" : "text-base font-semibold text-muted"}> /{offer.unit}</span>
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm">
                    {["Tous les éléments détectés", "Itinéraires de voyage", "Bibliothèque et collections illimitées"].map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className={featured ? "h-4 w-4 shrink-0 text-[#a7a2ff]" : "h-4 w-4 shrink-0 text-success"} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className={buttonClass(featured ? "accent" : "dark", "md", "mt-6 w-full")}>
                    Choisir
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-subtle">Usage raisonnable : {PLAN_LIMITS.PREMIUM.analysesPerMonth} analyses par mois.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
