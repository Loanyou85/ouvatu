import type { AnalyticsEvent } from "@/types/domain";

/** Fire-and-forget client event (validated against an allow-list server-side). */
export function trackClient(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  try {
    const body = JSON.stringify({ event, props });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    else void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    // analytics must never break the UI
  }
}
