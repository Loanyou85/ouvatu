import { CATEGORY_META, type Category } from "@/config/categories";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong", className)}>
      {children}
    </span>
  );
}

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const meta = CATEGORY_META[category];
  return (
    <Badge className={className}>
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </Badge>
  );
}
