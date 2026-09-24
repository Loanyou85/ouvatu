"use client";

import { MapPin } from "lucide-react";
import { convertToPlacesAction } from "../actions";
import { useServerAction } from "../use-action";

/** "This is actually a place": turns a misfiled card into a places card to fill by hand. */
export function ConvertToPlaces({ itemId }: { itemId: string }) {
  const { pending, run } = useServerAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => convertToPlacesAction(itemId))}
      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-semibold shadow-card hover:bg-hover disabled:opacity-50"
    >
      <MapPin className="h-4 w-4" /> C&apos;est un lieu ou un voyage
    </button>
  );
}
