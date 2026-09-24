import "server-only";
import { getAdminStore } from "@/db";
import type { AnalyticsEvent } from "@/types/domain";

/**
 * First-party product analytics (no third-party tracker, no cookie).
 * Failures are swallowed: analytics must never break a user flow.
 */
export async function track(userId: string | null, event: AnalyticsEvent, props: Record<string, unknown> = {}): Promise<void> {
  try {
    const store = getAdminStore();
    if (!store) return;
    await store.trackEvent(userId, event, props);
  } catch (error) {
    console.warn(`[analytics] could not record ${event}`, error);
  }
}
