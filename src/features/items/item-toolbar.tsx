"use client";

import { Check, FolderPlus, Heart, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { createCollectionAction } from "@/features/collections/actions";
import { cn, pluralize } from "@/lib/utils";
import type { Collection } from "@/types/domain";
import { deleteItemAction, renameItemAction, saveItemAction, setItemCollectionAction, toggleFavoriteAction } from "./actions";
import { useServerAction } from "./use-action";

const QUICK_EMOJIS = ["✨", "🇯🇵", "🍝", "🏠", "🎬", "👕", "🛍️", "✈️", "📚", "💪", "☕", "🌿"];

export function CollectionPicker({
  itemId,
  collections,
  memberOf,
  open,
  onClose,
}: {
  itemId: string;
  collections: Collection[];
  memberOf: string[];
  open: boolean;
  onClose: () => void;
}) {
  const { pending, run } = useServerAction();
  const [creating, setCreating] = useState(collections.length === 0);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");

  return (
    <Sheet open={open} onClose={onClose} title="Ajouter à une collection">
      <div className="space-y-2">
        {collections.map((c) => {
          const member = memberOf.includes(c.id);
          return (
            <button
              key={c.id}
              disabled={pending}
              onClick={() => run(() => setItemCollectionAction(itemId, c.id, !member))}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                member ? "border-accent bg-accent-soft" : "border-line hover:bg-hover",
              )}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-card text-xl shadow-card">{c.emoji}</span>
              <span className="flex-1">
                <span className="block font-bold">{c.name}</span>
                <span className="text-sm text-muted">{pluralize(c.itemCount, "élément")}</span>
              </span>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full border", member ? "border-accent bg-accent text-white" : "border-line")}>
                {member ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {creating ? (
        <form
          className="mt-4 space-y-3 rounded-2xl bg-bg p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => createCollectionAction(name, emoji, itemId),
              () => {
                setName("");
                setCreating(false);
              },
            );
          }}
        >
          <p className="text-sm font-bold">Nouvelle collection</p>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {QUICK_EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg", emoji === e ? "bg-accent-soft ring-2 ring-accent" : "bg-card")}
              >
                {e}
              </button>
            ))}
          </div>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex. Japon, Recettes rapides…" aria-label="Nom de la collection" />
          <Button type="submit" variant="dark" className="w-full" loading={pending} disabled={!name.trim()}>
            Créer et ajouter
          </Button>
        </form>
      ) : (
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nouvelle collection
        </Button>
      )}
    </Sheet>
  );
}

export function ItemToolbar({
  itemId,
  title,
  isFavorite,
  collections,
  memberOf,
}: {
  itemId: string;
  title: string;
  isFavorite: boolean;
  collections: Collection[];
  memberOf: string[];
}) {
  const { pending, run } = useServerAction();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={isFavorite} disabled={pending} onClick={() => run(() => toggleFavoriteAction(itemId))}>
          <Heart className={cn("h-[1.15rem] w-[1.15rem] transition", isFavorite && "fill-accent text-accent")} />
        </Button>
        <Button variant="secondary" onClick={() => setPickerOpen(true)} className="h-10 px-4 text-sm">
          <FolderPlus className="h-4 w-4" /> Collection
        </Button>
        <Button variant="secondary" size="icon" aria-label="Plus d'options" onClick={() => setMenuOpen(true)}>
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      <CollectionPicker itemId={itemId} collections={collections} memberOf={memberOf} open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <Sheet open={menuOpen} onClose={() => { setMenuOpen(false); setRenaming(false); setConfirmDelete(false); }} title="Options">
        {renaming ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => renameItemAction(itemId, newTitle), () => { setRenaming(false); setMenuOpen(false); });
            }}
          >
            <Input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={160} aria-label="Nouveau titre" />
            <Button type="submit" variant="dark" className="w-full" loading={pending}>
              Enregistrer
            </Button>
          </form>
        ) : confirmDelete ? (
          <div className="space-y-3">
            <p className="text-[0.95rem]">Supprimer définitivement cet élément de ton espace ?</p>
            <Button variant="danger" className="w-full" loading={deleting} onClick={() => startDelete(() => deleteItemAction(itemId))}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            <button onClick={() => setRenaming(true)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left font-semibold hover:bg-hover">
              <Pencil className="h-5 w-5 text-muted" /> Renommer
            </button>
            <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left font-semibold text-error hover:bg-error-soft">
              <Trash2 className="h-5 w-5" /> Supprimer
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}

export function SaveBar({ itemId }: { itemId: string }) {
  const { pending, run } = useServerAction();
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line/70 bg-card/95 p-3 backdrop-blur-xl pb-safe md:bottom-0 animate-fade-up">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-1 sm:px-6">
        <p className="hidden text-sm font-semibold text-muted sm:block">Cette fiche n&apos;est pas encore dans ton espace.</p>
        <Button variant="accent" size="lg" className="w-full sm:w-auto" loading={pending} onClick={() => run(() => saveItemAction(itemId))}>
          Enregistrer dans mon espace
        </Button>
      </div>
    </div>
  );
}
