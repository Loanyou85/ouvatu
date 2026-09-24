import "server-only";
import { env } from "@/lib/env";
import type { Platform } from "@/types/schemas";
import { cleanText, parseHtmlMetadata, type HtmlMetadata } from "./html";
import { safeFetch, safeFetchJson } from "./safe-fetch";
import type { NormalizedContent } from "./types";
import { detectPlatform } from "./url";

/**
 * Retrieves ONLY publicly and legally accessible metadata:
 *  - official oEmbed endpoints (TikTok, YouTube, Pinterest, Instagram with a Meta token)
 *  - the YouTube Data API when a key is configured
 *  - public HTML meta tags / JSON-LD for regular websites
 * No login, anti-bot, DRM or private-API circumvention. When a platform
 * exposes little, the user can paste the caption themselves.
 */

interface OEmbed {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  provider_name?: string;
}

const OEMBED_ENDPOINT: Partial<Record<Platform, (url: string) => string | null>> = {
  tiktok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  youtube: (url) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  pinterest: (url) => `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`,
  instagram: (url) =>
    env.metaOembedToken
      ? `https://graph.facebook.com/v21.0/instagram_oembed?omitscript=true&url=${encodeURIComponent(url)}&access_token=${env.metaOembedToken}`
      : null,
};

/** Platforms whose HTML is legitimately readable without login for public posts. */
const HTML_ALLOWED: Record<Platform, boolean> = {
  web: true,
  youtube: true,
  pinterest: true,
  tiktok: false,
  instagram: false,
};

function extractHashtags(...texts: (string | null)[]): string[] {
  const tags = new Set<string>();
  for (const text of texts) {
    for (const m of text?.matchAll(/#([\p{L}\p{N}_]{2,40})/gu) ?? []) tags.add(m[1].toLowerCase());
  }
  return [...tags].slice(0, 20);
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/);
    return m ? m[2] : null;
  } catch {
    return null;
  }
}

async function fetchYoutubeDescription(url: string): Promise<{ description: string | null; publishedAt: string | null } | null> {
  if (!env.youtubeApiKey) return null;
  const id = youtubeId(url);
  if (!id) return null;
  const data = await safeFetchJson<{ items?: { snippet?: { description?: string; publishedAt?: string } }[] }>(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(id)}&key=${env.youtubeApiKey}`,
  );
  const snippet = data?.items?.[0]?.snippet;
  return snippet ? { description: snippet.description ?? null, publishedAt: snippet.publishedAt ?? null } : null;
}

export class IngestionError extends Error {
  constructor(
    message: string,
    readonly code: "unreachable" | "empty" | "blocked",
  ) {
    super(message);
  }
}

export async function ingestUrl(inputUrl: string, userText: string | null): Promise<NormalizedContent> {
  let url = inputUrl;
  let platform = detectPlatform(url);
  const raw: Record<string, unknown> = {};

  const oembedUrl = OEMBED_ENDPOINT[platform]?.(url) ?? null;
  const [oembed, html, yt] = await Promise.all([
    oembedUrl ? safeFetchJson<OEmbed>(oembedUrl) : Promise.resolve(null),
    HTML_ALLOWED[platform]
      ? safeFetch(url)
          .then((res) => {
            if (res.status >= 400) return null;
            if (!res.contentType.includes("html")) return null;
            url = res.url;
            return parseHtmlMetadata(res.body, res.url);
          })
          .catch((error: unknown) => {
            raw.htmlError = error instanceof Error ? error.message : "fetch failed";
            return null;
          })
      : Promise.resolve<HtmlMetadata | null>(null),
    platform === "youtube" ? fetchYoutubeDescription(url) : Promise.resolve(null),
  ]);

  // Short links (pin.it, vm.tiktok.com) may resolve to the real platform.
  platform = detectPlatform(url) === "web" ? platform : detectPlatform(url);

  if (oembed) raw.oembed = oembed;
  if (html) raw.html = { title: html.title, description: html.description, image: html.image, siteName: html.siteName };

  const title = cleanText(oembed?.title ?? html?.title, 500);
  const description = cleanText(yt?.description ?? html?.description, 5000);
  const text = platform === "web" ? html?.text ?? null : null;
  const cleanedUserText = cleanText(userText, 5000);

  if (!title && !description && !text && !cleanedUserText) {
    throw new IngestionError("Nothing retrievable from this URL", raw.htmlError ? "unreachable" : "empty");
  }

  const richness = [description, text, cleanedUserText, html?.jsonLd?.length ? "ld" : null].filter(Boolean).length;
  return {
    url: html?.canonical && detectPlatform(html.canonical) === platform ? html.canonical : url,
    platform,
    title,
    description,
    text,
    author: cleanText(oembed?.author_name ?? html?.author, 200),
    siteName: cleanText(html?.siteName ?? oembed?.provider_name, 100),
    thumbnailUrl: oembed?.thumbnail_url ?? html?.image ?? null,
    publishedAt: yt?.publishedAt ?? html?.publishedAt ?? null,
    hashtags: extractHashtags(title, description, cleanedUserText),
    jsonLd: html?.jsonLd ?? [],
    userText: cleanedUserText,
    retrieval: richness >= 2 ? "rich" : richness === 1 ? "partial" : "minimal",
    raw,
  };
}
