import { describe, expect, it } from "vitest";
import { googleRouteLinks, optimizeRoute } from "@/services/travel/route";

describe("fastest route", () => {
  it("visits every point once in the shortest order along a line", () => {
    // Points on a line, given shuffled: the best open path is 0 → 1 → 2 → 3 (or reversed).
    const pts = [
      { index: 2, lat: 0, lng: 0.02 },
      { index: 0, lat: 0, lng: 0 },
      { index: 3, lat: 0, lng: 0.03 },
      { index: 1, lat: 0, lng: 0.01 },
    ];
    const r = optimizeRoute(pts);
    expect([...r.order].sort()).toEqual([0, 1, 2, 3]);
    expect(r.order.join() === "0,1,2,3" || r.order.join() === "3,2,1,0").toBe(true);
    expect(r.totalKm).toBeGreaterThan(3.2);
    expect(r.totalKm).toBeLessThan(3.4);
  });

  it("splits long routes into Google Maps links of 11 points max", () => {
    const stops = Array.from({ length: 15 }, (_, i) => ({ lat: 48 + i / 100, lng: 2 }));
    const links = googleRouteLinks(stops, "walking");
    expect(links).toHaveLength(2);
    expect(decodeURIComponent(links[0])).toContain("waypoints=");
    expect(decodeURIComponent(links[1])).toContain(`origin=${48 + 10 / 100},2`);
  });
});
