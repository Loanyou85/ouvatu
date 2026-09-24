import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { Logo } from "@/components/ui/logo";
import { LEGAL_PAGES } from "@/config/legal";

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: LEGAL_PAGES[slug]?.title ?? "Légal" };
}

export default async function LegalPage(props: PageProps<"/legal/[slug]">) {
  const { slug } = await props.params;
  const page = LEGAL_PAGES[slug];
  if (!page) notFound();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">{page.title}</h1>
        <p className="mt-1 text-sm text-muted">Dernière mise à jour : {page.updated}</p>
        <div className="mt-8 space-y-8">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-extrabold">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-2 leading-relaxed text-ink/85">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
