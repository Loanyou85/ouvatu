import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { BRAND } from "@/config/brand";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8 sm:justify-center">
      <Link href="/" className="mb-10 sm:mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight">{title}</h1>
        <p className="mb-7 mt-1.5 text-muted">{subtitle}</p>
        {children}
        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </div>
      <p className="mt-auto pt-10 text-xs text-subtle">{BRAND.tagline}</p>
    </div>
  );
}
