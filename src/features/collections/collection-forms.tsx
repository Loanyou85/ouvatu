"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { setItemCollectionAction } from "@/features/items/actions";
import { ItemCard } from "@/features/items/item-card";
import { useServerAction } from "@/features/items/use-action";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/types/domain";
import { createCollectionAction, deleteCollectionAction, updateCollectionAction } from "./actions";

const EMOJIS = ["✨", "🇯🇵", "🇮🇹", "🇵🇹", "🍝", "🥐", "🏠", "🎬", "📚", "👕", "🛍️", "✈️", "💪", "☕", "🌿", "🎁"];

function CollectionForm({
  initialName = "",
  initialEmoji = "✨",
  submitLabel,
  onSubmit,
  pending,
}: {
  initialName?: string;
  initialEmoji?: string;
  submitLabel: string;
  onSubmit: (name: string, emoji: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name, emoji);
      }}
    >
      <div className="grid grid-cols-8 gap-1.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            aria-pressed={emoji === e}
            className={cn("grid aspect-square place-items-center rounded-xl text-lg transition", emoji === e ? "bg-accent-soft ring-2 ring-accent" : "bg-bg hover:bg-hover")}
          >
            {e}
          </button>
        ))}
      </div>
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex. Japon, Recettes rapides, À acheter…" aria-label="Nom" />
      <Button type="submit" variant="dark" size="lg" className="w-full" loading={pending} disabled={!name.trim()}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function NewCollectionButton({ variant = "accent" }: { variant?: "accent" | "dark" }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useServerAction();
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2.75} /> Nouvelle collection
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nouvelle collection">
        <CollectionForm submitLabel="Créer" pending={pending} onSubmit={(name, emoji) => run(() => createCollectionAction(name, emoji), () => setOpen(false))} />
      </Sheet>
    </>
  );
}

export function CollectionHeaderActions({ id, name, emoji }: { id: string; name: string; emoji: string }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { pending, run } = useServerAction();
  const [deleting, startDelete] = useTransition();
  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="icon" aria-label="Renommer la collection" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="secondary" size="icon" aria-label="Supprimer la collection" onClick={() => setConfirm(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <Sheet open={editing} onClose={() => setEditing(false)} title="Modifier la collection">
        <CollectionForm initialName={name} initialEmoji={emoji} submitLabel="Enregistrer" pending={pending} onSubmit={(n, e) => run(() => updateCollectionAction(id, n, e), () => setEditing(false))} />
      </Sheet>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Supprimer la collection ?">
        <p className="text-muted">Les éléments restent dans ta bibliothèque. Seule la collection est supprimée.</p>
        <Button variant="danger" size="lg" className="mt-5 w-full" loading={deleting} onClick={() => startDelete(() => deleteCollectionAction(id))}>
          Supprimer
        </Button>
      </Sheet>
    </div>
  );
}

export function CollectionItems({ collectionId, items }: { collectionId: string; items: ContentItem[] }) {
  const [editMode, setEditMode] = useState(false);
  const { pending, run } = useServerAction();
  const router = useRouter();
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setEditMode((v) => !v)} className="text-sm font-semibold text-muted hover:text-ink">
          {editMode ? "Terminé" : "Retirer des éléments"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
        {items.map((item, i) => (
          <div key={item.id} className="relative">
            <ItemCard item={item} index={i} />
            {editMode ? (
              <button
                disabled={pending}
                onClick={() => run(() => setItemCollectionAction(item.id, collectionId, false), () => router.refresh())}
                aria-label={`Retirer ${item.title} de la collection`}
                className="absolute -right-1.5 -top-1.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-ink text-white shadow-float animate-pop"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
