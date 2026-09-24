import { describe, expect, it, vi } from "vitest";

describe("lifetime premium", () => {
  it("upgrades listed emails only, case-insensitively", async () => {
    vi.resetModules();
    process.env.LIFETIME_PREMIUM_EMAILS = " Owner@Example.com , team@example.com";
    const { effectivePlan, isLifetimePremium } = await import("@/services/billing/entitlements");
    expect(isLifetimePremium("owner@example.com")).toBe(true);
    expect(isLifetimePremium("someone@example.com")).toBe(false);
    expect(effectivePlan({ plan: "FREE", email: "OWNER@example.com" })).toBe("PREMIUM");
    expect(effectivePlan({ plan: "FREE", email: "someone@example.com" })).toBe("FREE");
    expect(effectivePlan({ plan: "PREMIUM", email: "someone@example.com" })).toBe("PREMIUM");
    delete process.env.LIFETIME_PREMIUM_EMAILS;
  });
});
