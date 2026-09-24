import { cn } from "@/lib/utils";

export function EmptyState({
  emoji,
  title,
  description,
  action,
  className,
}: {
  emoji: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-card border border-dashed border-line bg-card/60 px-6 py-12 text-center animate-fade-up", className)}>
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-accent-soft text-3xl" aria-hidden>
        {emoji}
      </div>
      <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-[0.95rem] text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
