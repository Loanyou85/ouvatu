import type { ContentItem } from "@/types/domain";
import { normalizeText } from "@/lib/utils";

/** Collect every string value of a JSON structure (mirrors the SQL search vector). */
function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out));
}

/**
 * In-memory equivalent of the Postgres weighted full-text ranking
 * (title A > tags/entities B > summary C > data D), used by the local store.
 */
export function scoreItem(item: ContentItem, terms: string[]): number {
  if (terms.length === 0) return 1;
  const fields: [string, number][] = [
    [item.title, 8],
    [[...item.tags, ...item.entities.map((e) => e.name)].join(" "), 4],
    [item.summary, 2],
  ];
  const dataStrings: string[] = [];
  collectStrings(item.data, dataStrings);
  fields.push([dataStrings.join(" "), 1]);

  const normalized = fields.map(([text, weight]) => [normalizeText(text).split(" "), weight] as const);
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const [words, weight] of normalized) {
      if (words.some((w) => w.startsWith(term))) best = Math.max(best, weight);
    }
    score += best;
  }
  return score;
}
