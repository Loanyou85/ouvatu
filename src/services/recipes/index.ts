import type { Ingredient } from "@/types/schemas";
import { normalizeText } from "@/lib/utils";

/** Scale ingredient quantities from `base` servings to `target` servings. */
export function scaleIngredients(ingredients: Ingredient[], base: number | null, target: number): Ingredient[] {
  if (!base || base <= 0 || target <= 0) return ingredients;
  const factor = target / base;
  return ingredients.map((i) => ({ ...i, quantity: i.quantity == null ? null : roundQuantity(i.quantity * factor) }));
}

export function roundQuantity(value: number): number {
  if (value >= 100) return Math.round(value / 5) * 5;
  if (value >= 10) return Math.round(value);
  return Math.round(value * 4) / 4;
}

export function formatQuantity(quantity: number | null, unit: string | null): string {
  if (quantity == null) return unit ?? "";
  const fractions: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.75": "¾" };
  const whole = Math.floor(quantity);
  const rest = +(quantity - whole).toFixed(2);
  let text = String(quantity).replace(".", ",");
  if (fractions[String(rest)]) text = `${whole > 0 ? whole : ""}${fractions[String(rest)]}`;
  return unit ? `${text} ${unit}` : text;
}

export interface ShoppingLine {
  name: string;
  quantity: number | null;
  unit: string | null;
}

/** Merge identical ingredients (same name + unit) into single shopping lines. */
export function mergeShoppingLines(lines: ShoppingLine[]): ShoppingLine[] {
  const map = new Map<string, ShoppingLine>();
  for (const line of lines) {
    const key = `${normalizeText(line.name)}|${normalizeText(line.unit ?? "")}`;
    const existing = map.get(key);
    if (!existing) map.set(key, { ...line });
    else if (existing.quantity != null && line.quantity != null) existing.quantity = roundQuantity(existing.quantity + line.quantity);
    else existing.quantity = existing.quantity ?? line.quantity;
  }
  return [...map.values()];
}

/**
 * Future "Avec ce que j'ai": rank recipes by how many ingredients the user
 * already has. Pantry storage exists (pantry_items); the UI comes later.
 */
export function pantryCoverage(ingredients: Ingredient[], pantry: string[]): { have: number; total: number } {
  const owned = new Set(pantry.map(normalizeText));
  const have = ingredients.filter((i) => [...owned].some((p) => normalizeText(i.name).includes(p))).length;
  return { have, total: ingredients.length };
}
