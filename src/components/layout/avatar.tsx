import { cn } from "@/lib/utils";

export function Avatar({ name, email, className }: { name: string | null; email: string; className?: string }) {
  const initials = (name ?? email).trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <span className={cn("grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-bold text-white", className)} aria-hidden>
      {initials}
    </span>
  );
}
