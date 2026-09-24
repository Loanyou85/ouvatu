import { z } from "zod";
import type { Platform } from "@/types/schemas";

/**
 * Unified input format. The paste form, a future iOS/Android share extension,
 * a browser extension or a bulk import all produce a ContentInput and call the
 * exact same pipeline (POST /api/analyze).
 */
export const ContentInputSchema = z.object({
  channel: z.enum(["paste", "share_extension", "browser_extension", "direct_import"]).default("paste"),
  url: z.string().trim().min(4).max(2048),
  /** Text shared alongside the URL (e.g. a caption), or pasted by the user. */
  sharedText: z.string().trim().max(5000).optional(),
});
export type ContentInput = z.infer<typeof ContentInputSchema>;

export interface NormalizedContent {
  url: string;
  platform: Platform;
  title: string | null;
  description: string | null;
  /** Main readable text of the page (web) — capped and sanitized. */
  text: string | null;
  author: string | null;
  siteName: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  hashtags: string[];
  /** schema.org JSON-LD objects found on the page (Recipe, Product, Movie...). */
  jsonLd: Record<string, unknown>[];
  /** Text provided by the user (caption, notes). */
  userText: string | null;
  /** Text written on the public cover image (read by the AI), e.g. "5 spots à Toronto : …". */
  coverText?: string | null;
  /** What we could access, used to be transparent in the UI. */
  retrieval: "rich" | "partial" | "minimal";
  raw: Record<string, unknown>;
}

export function contentCorpus(content: NormalizedContent): string {
  // Hashtags count as real content: #biidaasigepark names a place, #toronto a city.
  const hashtags = content.hashtags.length ? content.hashtags.join(" ") : null;
  return [content.title, content.description, content.text, content.userText, content.coverText, hashtags, content.author]
    .filter(Boolean)
    .join("\n");
}
