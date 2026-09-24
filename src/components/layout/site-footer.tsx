import Link from "next/link";
import { BRAND } from "@/config/brand";

export const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Confidentialité" },
  { href: "/legal/terms", label: "Conditions d'utilisation" },
  { href: "/legal/mentions", label: "Mentions légales" },
  { href: "/legal/cookies", label: "Cookies" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line/70">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.tagline}
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
