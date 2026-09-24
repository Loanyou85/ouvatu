import type { Platform } from "@/types/schemas";

/** Client-safe URL helpers (no Node APIs). */

export function normalizeInputUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // People often paste "Regarde ça https://vm.tiktok.com/xyz" — extract the first URL.
  const match = trimmed.match(/https?:\/\/[^\s<>"']+/i);
  let candidate = match ? match[0] : trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (!/^[\w-]+(\.[\w-]+)+(\/|$)/.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname.includes(".")) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

const PLATFORM_HOSTS: [Platform, RegExp][] = [
  ["tiktok", /(^|\.)tiktok\.com$/i],
  ["instagram", /(^|\.)(instagram\.com|instagr\.am)$/i],
  ["youtube", /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i],
  ["pinterest", /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/i],
];

export function detectPlatform(url: string): Platform {
  try {
    const host = new URL(url).hostname;
    for (const [platform, re] of PLATFORM_HOSTS) if (re.test(host)) return platform;
  } catch {
    // fall through
  }
  return "web";
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  pinterest: "Pinterest",
  web: "Web",
};
