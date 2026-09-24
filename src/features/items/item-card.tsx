import { Heart } from "lucide-react";
import Link from "next/link";
import { CategoryBadge } from "@/components/ui/badge";
import { ItemImage } from "@/components/ui/item-image";
import { cn, formatRelativeDate } from "@/lib/utils";
import { itemHighlights } from "@/services/items/highlights";
import type { ContentItem } from "@/types/domain";

export function ItemCard({ item, index = 0, variant = "grid" }: { item: ContentItem; index?: number; variant?: "grid" | "list" }) {
  const facts = itemHighlights(item.data);
  if (variant === "list") {
    return (
      <Link
        href={`/items/${item.id}`}
        className="group flex items-center gap-4 rounded-card bg-card p-2.5 pr-4 shadow-card transition hover:-translate-y-0.5 animate-fade-up"
        style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
      >
        <ItemImage src={item.imageUrl} category={item.category} className="h-20 w-20 shrink-0 rounded-2xl" emojiClassName="text-3xl" />
        <div className="min-w-0 flex-1">
          <CategoryBadge category={item.category} />
          <h3 className="mt-1.5 line-clamp-1 font-bold tracking-tight">{item.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted">{[...facts.slice(0, 2), formatRelativeDate(item.createdAt)].join(" · ")}</p>
        </div>
        {item.isFavorite ? <Heart className="h-4 w-4 shrink-0 fill-accent text-accent" /> : null}
      </Link>
    );
  }
  return (
    <Link
      href={`/items/${item.id}`}
      className="group block animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <div className="relative overflow-hidden rounded-card bg-card shadow-card">
        <ItemImage
          src={item.imageUrl}
          category={item.category}
          alt=""
          className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.03]"
          emojiClassName="text-5xl"
        />
        <div className="absolute inset-x-2 top-2 flex items-start justify-between">
          <CategoryBadge category={item.category} className="bg-white/90 text-ink shadow-sm backdrop-blur" />
          {item.isFavorite ? (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/90 backdrop-blur">
              <Heart className="h-3.5 w-3.5 fill-accent text-accent" />
            </span>
          ) : null}
        </div>
        {item.isExample ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-ink/75 px-2 py-0.5 text-[0.65rem] font-semibold text-white">Exemple</span>
        ) : null}
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-[0.95rem] font-bold leading-snug tracking-tight">{item.title}</h3>
      <p className={cn("mt-0.5 line-clamp-1 text-[0.8rem] text-muted")}>{[facts[0], formatRelativeDate(item.createdAt)].filter(Boolean).join(" · ")}</p>
    </Link>
  );
}

export function ItemGrid({ items, variant = "grid" }: { items: ContentItem[]; variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item, i) => (
          <ItemCard key={item.id} item={item} index={i} variant="list" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
      {items.map((item, i) => (
        <ItemCard key={item.id} item={item} index={i} />
      ))}
    </div>
  );
}
