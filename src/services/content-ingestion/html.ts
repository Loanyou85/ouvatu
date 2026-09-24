import "server-only";
import { parse } from "node-html-parser";

/** Collapse whitespace and strip control characters from untrusted text. */
export function cleanText(value: string | null | undefined, max = 20000): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) return null;
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

function decodeEntities(value: string): string {
  return parse(`<p>${value}</p>`).text;
}

export interface HtmlMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  author: string | null;
  publishedAt: string | null;
  canonical: string | null;
  jsonLd: Record<string, unknown>[];
  text: string | null;
}

function flattenJsonLd(value: unknown, out: Record<string, unknown>[]): void {
  if (Array.isArray(value)) value.forEach((v) => flattenJsonLd(v, out));
  else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) flattenJsonLd(obj["@graph"], out);
    if (obj["@type"]) out.push(obj);
  }
}

function absolutize(url: string | null, base: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseHtmlMetadata(html: string, baseUrl: string): HtmlMetadata {
  const root = parse(html, { blockTextElements: { script: true, style: false, noscript: false } });

  const meta = (...keys: string[]): string | null => {
    for (const key of keys) {
      const el = root.querySelector(`meta[property="${key}"]`) ?? root.querySelector(`meta[name="${key}"]`);
      const content = el?.getAttribute("content");
      if (content && content.trim()) return cleanText(decodeEntities(content), 3000);
    }
    return null;
  };

  const jsonLd: Record<string, unknown>[] = [];
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      flattenJsonLd(JSON.parse(script.rawText), jsonLd);
    } catch {
      // ignore malformed JSON-LD
    }
  }

  // Readable text: drop non-content elements, prefer <article>/<main>.
  root.querySelectorAll("script, style, noscript, svg, nav, footer, header, form, iframe, aside").forEach((el) => el.remove());
  const main = root.querySelector("article") ?? root.querySelector("main") ?? root.querySelector("body");
  const blocks = (main?.querySelectorAll("h1, h2, h3, h4, p, li, td, figcaption, blockquote") ?? [])
    .map((el) => el.text.trim())
    .filter((t) => t.length > 1);
  const text = cleanText(blocks.length ? blocks.join("\n") : main?.text, 15000);

  return {
    title: meta("og:title", "twitter:title") ?? cleanText(root.querySelector("title")?.text, 300),
    description: meta("og:description", "description", "twitter:description"),
    image: absolutize(meta("og:image", "twitter:image", "og:image:url"), baseUrl),
    siteName: meta("og:site_name", "application-name"),
    author: meta("author", "article:author"),
    publishedAt: meta("article:published_time", "og:published_time", "date"),
    canonical: absolutize(root.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null, baseUrl),
    jsonLd: jsonLd.slice(0, 20),
    text,
  };
}
