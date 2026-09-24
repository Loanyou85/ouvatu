"use client";

import { Minus, Plus, ShoppingBasket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMinutes } from "@/lib/utils";
import { formatQuantity, scaleIngredients } from "@/services/recipes";
import type { RecipeData } from "@/types/schemas";
import { addRecipeToShoppingAction } from "../actions";
import { useServerAction } from "../use-action";
import { Block, Fact, NOT_AVAILABLE } from "./shared";

const DIFFICULTY = { easy: "Facile", medium: "Moyenne", hard: "Difficile" } as const;

export function RecipeView({ itemId, recipe }: { itemId: string; recipe: RecipeData }) {
  const base = recipe.servings;
  const [servings, setServings] = useState(base ?? 2);
  const { pending, run } = useServerAction();
  const ingredients = base ? scaleIngredients(recipe.ingredients, base, servings) : recipe.ingredients;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Fact label="Préparation" value={formatMinutes(recipe.prepMinutes)} />
        <Fact label="Cuisson" value={formatMinutes(recipe.cookMinutes)} />
        <Fact label="Temps total" value={formatMinutes(recipe.totalMinutes)} />
        <Fact label="Difficulté" value={recipe.difficulty ? DIFFICULTY[recipe.difficulty] : null} />
      </div>

      <Block
        title="Ingrédients"
        action={
          base ? (
            <div className="flex items-center gap-1 rounded-full bg-card p-1 shadow-card" aria-label="Adapter les portions">
              <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-hover disabled:opacity-40" disabled={servings <= 1} onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Moins de portions">
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-16 text-center text-sm font-bold" aria-live="polite">
                {servings} pers.
              </span>
              <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-hover disabled:opacity-40" disabled={servings >= 24} onClick={() => setServings((s) => Math.min(24, s + 1))} aria-label="Plus de portions">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-subtle">Portions : {NOT_AVAILABLE.toLowerCase()}</span>
          )
        }
      >
        {ingredients.length ? (
          <ul className="divide-y divide-line/70 rounded-card bg-card px-4 shadow-card">
            {ingredients.map((ing, i) => (
              <li key={`${ing.name}-${i}`} className="flex items-baseline justify-between gap-4 py-3">
                <span className="font-semibold first-letter:uppercase">
                  {ing.name}
                  {ing.note ? <span className="font-normal text-muted"> · {ing.note}</span> : null}
                </span>
                <span className="shrink-0 text-right font-bold tabular-nums text-accent-strong">{formatQuantity(ing.quantity, ing.unit) || "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">Aucun ingrédient n&apos;a pu être extrait de ce contenu.</p>
        )}
        {ingredients.length ? (
          <Button variant="accent" size="lg" className="mt-4 w-full sm:w-auto" loading={pending} onClick={() => run(() => addRecipeToShoppingAction(itemId, servings))}>
            <ShoppingBasket className="h-5 w-5" /> Ajouter aux courses
          </Button>
        ) : null}
      </Block>

      <Block title="Étapes">
        {recipe.steps.length ? (
          <ol className="space-y-3">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4 rounded-card bg-card p-4 shadow-card">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-extrabold text-white">{i + 1}</span>
                <p className="pt-1 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-subtle">Les étapes ne sont pas indiquées dans la source.</p>
        )}
      </Block>

      {recipe.tips.length ? (
        <Block title="Conseils">
          <ul className="space-y-2">
            {recipe.tips.map((tip) => (
              <li key={tip} className="rounded-2xl bg-accent-soft/70 p-4 text-[0.95rem]">
                💡 {tip}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
    </div>
  );
}
