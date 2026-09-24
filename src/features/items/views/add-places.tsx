"use client";

import { MapPinPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { addPlacesAction } from "../actions";
import { useServerAction } from "../use-action";

/**
 * Lets the user type the places a video shows but does not write down
 * (OUVATU only reads public text and never guesses place names).
 */
export function AddPlaces({ itemId, defaultCity, empty }: { itemId: string; defaultCity: string | null; empty: boolean }) {
  const [open, setOpen] = useState(empty);
  const [text, setText] = useState("");
  const [city, setCity] = useState(defaultCity ?? "");
  const { pending, run } = useServerAction();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <MapPinPlus className="h-4 w-4" /> Ajouter un lieu
      </button>
    );
  }

  return (
    <div className="rounded-card bg-card p-4 shadow-card sm:p-5">
      {empty ? (
        <>
          <p className="font-extrabold">Les lieux ne sont pas écrits dans la publication.</p>
          <p className="mt-1 text-sm text-muted">
            Ils sont sûrement montrés ou dits dans la vidéo : OUVATU ne peut pas les deviner. Écris-les ici, on les place sur la carte et on crée ton
            itinéraire.
          </p>
        </>
      ) : (
        <p className="font-extrabold">Ajouter des lieux</p>
      )}
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addPlacesAction(itemId, text, city),
            () => {
              setText("");
              if (!empty) setOpen(false);
            },
          );
        }}
      >
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville (ex. Lisbonne)" aria-label="Ville" maxLength={120} />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Un lieu par ligne, par exemple :\nTour de Belém\nPastéis de Belém\nMiradouro da Graça"}
          aria-label="Lieux, un par ligne"
          rows={5}
          maxLength={3000}
        />
        <Button type="submit" variant="accent" size="lg" className="w-full" loading={pending} disabled={!text.trim()}>
          <MapPinPlus className="h-5 w-5" /> Placer sur la carte
        </Button>
        <p className="text-center text-xs text-subtle">Précise la ville pour que chaque lieu soit bien localisé.</p>
      </form>
    </div>
  );
}
