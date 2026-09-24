import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Outbound fetch hardened against SSRF: http(s) only, standard ports,
 * public IPs only (checked on every redirect), timeout and size cap.
 * We only ever read public pages/metadata; we never send credentials or
 * attempt to bypass logins, paywalls or anti-bot protections.
 */
export class FetchBlockedError extends Error {}

const USER_AGENT =
  "Mozilla/5.0 (compatible; ouvatu-Bot/1.0; +https://ouvatu.app/bot) AppleWebKit/537.36 (KHTML, like Gecko)";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchBlockedError("protocol");
  if (url.username || url.password) throw new FetchBlockedError("credentials");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchBlockedError("port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new FetchBlockedError("host");
  }
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new FetchBlockedError("private address");
  }
  return url;
}

export interface SafeResponse {
  url: string;
  status: number;
  contentType: string;
  body: string;
}

export async function safeFetch(
  raw: string,
  { timeoutMs = 8000, maxBytes = 1_500_000, accept = "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5" } = {},
): Promise<SafeResponse> {
  let current = raw;
  for (let redirects = 0; redirects <= 4; redirects++) {
    const url = await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept, "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location")!, url).toString();
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "";
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) {
            await reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }
      const body = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
      return { url: url.toString(), status: res.status, contentType, body };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new FetchBlockedError("too many redirects");
}

export async function safeFetchJson<T>(raw: string, opts?: { timeoutMs?: number }): Promise<T | null> {
  try {
    const res = await safeFetch(raw, { ...opts, accept: "application/json" });
    if (res.status !== 200) return null;
    return JSON.parse(res.body) as T;
  } catch {
    return null;
  }
}

/**
 * Follows the redirects of a share short link (vm.tiktok.com, pin.it…) and
 * returns the final URL, without downloading the page. Returns the input on failure.
 */
export async function resolveRedirects(raw: string, { timeoutMs = 6000 } = {}): Promise<string> {
  let current = raw;
  try {
    for (let hops = 0; hops < 5; hops++) {
      const url = await assertPublicUrl(current);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          redirect: "manual",
          signal: controller.signal,
          headers: { "user-agent": USER_AGENT, accept: "text/html" },
        });
        await res.body?.cancel().catch(() => undefined);
        const location = res.headers.get("location");
        if (res.status >= 300 && res.status < 400 && location) {
          current = new URL(location, url).toString();
          continue;
        }
        return url.toString();
      } finally {
        clearTimeout(timer);
      }
    }
  } catch {
    return current;
  }
  return current;
}
