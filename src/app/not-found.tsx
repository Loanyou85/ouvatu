import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Cette page n&apos;existe pas.</h1>
      <p className="mt-2 text-muted">Elle a peut-être été supprimée, ou le lien est incorrect.</p>
      <Link href="/" className={buttonClass("dark", "md", "mt-6")}>
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
