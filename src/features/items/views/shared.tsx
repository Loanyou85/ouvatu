import { Lock } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn, pluralize } from "@/lib/utils";

export const NOT_AVAILABLE = "Information non disponible";

export function Fact({ label, value, className }: { label: string; value: React.ReactNode | null | undefined; className?: string }) {
  const empty = value == null || value === "";
  return (
    <div className={cn("rounded-2xl bg-card p-3.5 shadow-card", className)}>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={cn("mt-0.5 font-bold", empty && "text-sm font-medium text-subtle")}>{empty ? NOT_AVAILABLE : value}</p>
    </div>
  );
}

export function Block({ title, children, action, className }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("animate-fade-up", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chips({ values, empty = NOT_AVAILABLE }: { values: string[]; empty?: string }) {
  if (values.length === 0) return <p className="text-sm text-subtle">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <span key={v} className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-card">
          {v}
        </span>
      ))}
    </div>
  );
}

/** Premium preview: remaining detected elements are blurred and locked. */
export function LockedPreview({ count, noun = "élément", plural }: { count: number; noun?: string; plural?: string }) {
  if (count <= 0) return null;
  return (
    <div className="relative mt-3 overflow-hidden rounded-card">
      <div className="space-y-2 blur-[5px] select-none" aria-hidden>
        {Array.from({ length: Math.min(count, 3) }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card">
            <div className="h-11 w-11 rounded-xl bg-accent-soft" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-line" />
              <div className="h-3 w-1/3 rounded bg-line/70" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-bg/30 to-bg/90 p-4 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white">
          <Lock className="h-4 w-4" />
        </span>
        <p className="mt-2 font-extrabold">+ {pluralize(count, noun, plural)} détecté{count > 1 ? "s" : ""}</p>
        <Link href="/premium?reason=preview" className={buttonClass("accent", "sm", "mt-3")}>
          Débloquer mon espace
        </Link>
      </div>
    </div>
  );
}
