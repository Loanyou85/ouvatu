"use client";

import { Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { ItemImage } from "@/components/ui/item-image";
import { useServerAction } from "@/features/items/use-action";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/services/recipes";
import type { SavedEntry, ShoppingListItem } from "@/types/domain";
import type { Category } from "@/config/categories";
import { clearCheckedShoppingAction, removeListEntryAction, removeShoppingAction, setListStatusAction, toggleShoppingAction } from "./actions";

export function ShoppingList({ items }: { items: ShoppingListItem[] }) {
  const { pending, run } = useServerAction();
  const groups = new Map<string, ShoppingListItem[]>();
  for (const item of items) {
    const key = item.recipeTitle ?? "Autres";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const checked = items.filter((i) => i.checked).length;
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([title, group]) => (
        <section key={title}>
          <h3 className="mb-2 text-sm font-bold text-muted">{title}</h3>
          <ul className="divide-y divide-line/70 rounded-card bg-card shadow-card">
            {group.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  aria-label={item.checked ? `Décocher ${item.name}` : `Cocher ${item.name}`}
                  aria-pressed={item.checked}
                  onClick={() => run(() => toggleShoppingAction(item.id, !item.checked))}
                  className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition", item.checked ? "border-success bg-success text-white" : "border-line")}
                >
                  {item.checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </button>
                <span className={cn("flex-1 font-semibold first-letter:uppercase", item.checked && "text-subtle line-through")}>{item.name}</span>
                <span className="text-sm font-bold tabular-nums text-muted">{formatQuantity(item.quantity, item.unit)}</span>
                <button aria-label={`Supprimer ${item.name}`} onClick={() => run(() => removeShoppingAction(item.id))} className="grid h-8 w-8 place-items-center rounded-full text-subtle hover:bg-hover hover:text-error">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {checked ? (
        <button disabled={pending} onClick={() => run(() => clearCheckedShoppingAction())} className="text-sm font-semibold text-muted hover:text-ink">
          Retirer les {checked} élément{checked > 1 ? "s" : ""} coché{checked > 1 ? "s" : ""}
        </button>
      ) : null}
    </div>
  );
}

export function SavedList({ entries, category, doneLabel }: { entries: SavedEntry[]; category: Category; doneLabel: string }) {
  const { run } = useServerAction();
  return (
    <ul className="space-y-2.5">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 rounded-card bg-card p-2.5 pr-3 shadow-card animate-fade-up">
          <Link href={`/items/${e.contentItemId}`} className="flex min-w-0 flex-1 items-center gap-3">
            <ItemImage src={e.imageUrl} category={category} className="h-14 w-14 shrink-0 rounded-xl" emojiClassName="text-2xl" />
            <span className="min-w-0">
              <span className={cn("block truncate font-bold", e.status === "done" && "text-subtle line-through")}>{e.label}</span>
              {e.subtitle ? <span className="block truncate text-sm text-muted">{e.subtitle}</span> : null}
            </span>
          </Link>
          <button
            onClick={() => run(() => setListStatusAction(e.id, e.status !== "done"))}
            aria-pressed={e.status === "done"}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-semibold transition",
              e.status === "done" ? "border-success bg-success-soft text-success" : "border-line hover:bg-hover",
            )}
          >
            {e.status === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
            {doneLabel}
          </button>
          <button aria-label={`Retirer ${e.label}`} onClick={() => run(() => removeListEntryAction(e.id))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-subtle hover:bg-hover hover:text-error">
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
