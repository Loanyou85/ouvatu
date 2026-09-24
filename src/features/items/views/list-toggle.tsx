"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setListStatusAction } from "@/features/lists/actions";
import { cn } from "@/lib/utils";
import { toggleListEntryAction } from "../actions";
import { useServerAction } from "../use-action";

export interface EntryState {
  id: string;
  done: boolean;
}

/** "Watchlist" / "À lire" / "Wishlist" / "Ajouter à ma séance" toggle + optional "Vu / Lu". */
export function ListToggle({
  itemId,
  entityRef,
  entry,
  addLabel,
  addedLabel,
  doneLabel,
  size = "sm",
  variant = "dark",
}: {
  itemId: string;
  entityRef: number | null;
  entry: EntryState | null;
  addLabel: string;
  addedLabel: string;
  doneLabel?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "accent";
}) {
  const { pending, run } = useServerAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size={size}
        variant={entry ? "soft" : variant}
        loading={pending}
        aria-pressed={Boolean(entry)}
        onClick={() => run(() => toggleListEntryAction(itemId, entityRef, !entry))}
      >
        {!pending ? entry ? <Check className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-4 w-4" strokeWidth={3} /> : null}
        {entry ? addedLabel : addLabel}
      </Button>
      {entry && doneLabel ? (
        <Button
          size={size}
          variant="secondary"
          aria-pressed={entry.done}
          disabled={pending}
          className={cn(entry.done && "border-success bg-success-soft text-success")}
          onClick={() => run(() => setListStatusAction(entry.id, !entry.done))}
        >
          {entry.done ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
          {doneLabel}
        </Button>
      ) : null}
    </div>
  );
}
