import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { runHealthChecks } from "@/services/health";

export const metadata: Metadata = { title: "Diagnostic", robots: { index: false } };
export const dynamic = "force-dynamic";

const ICON = { ok: "✅", missing: "❌", error: "❌", optional: "⚪" } as const;

/** Human-readable configuration diagnostic (linked from the error page). */
export default async function SetupPage() {
  const checks = await runHealthChecks();
  const blocking = checks.filter((c) => c.status === "missing" || c.status === "error");
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Diagnostic du site</h1>
      <p className="mt-2 text-muted">
        {blocking.length
          ? `${blocking.length} réglage${blocking.length > 1 ? "s" : ""} à corriger. Après chaque correction sur Vercel : Deployments → ⋯ → Redeploy.`
          : "Tout est configuré ✅"}
      </p>
      <ul className="mt-6 space-y-2.5">
        {checks.map((c) => (
          <li key={c.label} className="rounded-2xl bg-card p-4 shadow-card">
            <p className="font-bold">
              {ICON[c.status]} {c.label} : <span className="font-semibold text-muted">{c.detail}</span>
            </p>
            {c.fix && c.status !== "ok" ? <p className="mt-1 text-sm text-muted">➡️ {c.fix}</p> : null}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-subtle">Cette page n&apos;affiche jamais la valeur de tes clés.</p>
    </main>
  );
}
