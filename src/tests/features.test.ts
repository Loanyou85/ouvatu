import { describe, expect, it } from "vitest";
import { mergeShoppingLines, scaleIngredients } from "@/services/recipes";
import { parseSearchQuery } from "@/services/search/query-parser";
import { buildItinerary } from "@/services/travel/itinerary";
import { normalizeInputUrl, detectPlatform } from "@/services/content-ingestion/url";
import { toItemView } from "@/services/items/view";
import type { Place } from "@/types/schemas";
import type { ContentItem } from "@/types/domain";

const place = (name: string, kind: Place["kind"], lat: number | null, lng = 0): Place => ({
  name,
  kind,
  description: null,
  address: null,
  city: null,
  country: null,
  priceText: null,
  cuisine: null,
  url: null,
  geo: lat === null ? null : { lat, lng, provider: "test", label: null },
});

describe("recipes", () => {
  it("scales portions from 2 to 5", () => {
    const [pasta] = scaleIngredients([{ name: "pâtes", quantity: 200, unit: "g", note: null }], 2, 5);
    expect(pasta.quantity).toBe(500);
  });
  it("merges identical shopping lines", () => {
    expect(
      mergeShoppingLines([
        { name: "Farine", quantity: 100, unit: "g" },
        { name: "farine", quantity: 50, unit: "g" },
        { name: "Œufs", quantity: 2, unit: null },
      ]),
    ).toEqual([
      { name: "Farine", quantity: 150, unit: "g" },
      { name: "Œufs", quantity: 2, unit: null },
    ]);
  });
});

describe("itinerary", () => {
  it("groups nearby places per day and schedules restaurants on meal slots", () => {
    const places = [
      place("A1", "sight", 38.7, -9.2),
      place("A2", "restaurant", 38.701, -9.201),
      place("A3", "museum", 38.702, -9.2),
      place("B1", "sight", 38.75, -9.1),
      place("B2", "restaurant", 38.751, -9.101),
      place("B3", "cafe", 38.752, -9.1),
      place("No geo", "activity", null),
    ];
    const it = buildItinerary(places, 2);
    expect(it.days).toHaveLength(2);
    const dayNames = it.days.map((d) => d.stops.map((s) => s.name).sort().join(","));
    expect(dayNames).toContain("A1,A2,A3");
    expect(dayNames).toContain("B1,B2,B3");
    const lunch = it.days[0].stops.find((s) => s.time === "12:30");
    expect(["restaurant", "cafe"]).toContain(lunch?.kind);
    expect(it.unplaced.map((u) => u.name)).toEqual(["No geo"]);
  });
});

describe("search query parser", () => {
  it("understands category words and keeps meaningful terms", () => {
    const q = parseSearchQuery("mes restaurants japonais à Paris");
    expect(q.categories).toEqual(expect.arrayContaining(["PLACES", "TRAVEL"]));
    expect(q.terms).toEqual(expect.arrayContaining(["japonais", "paris"]));
  });
  it("maps 'recettes rapides' to a time filter", () => {
    const q = parseSearchQuery("les recettes rapides");
    expect(q.categories).toEqual(["RECIPES"]);
    expect(q.maxTotalMinutes).toBe(30);
    expect(q.terms).toEqual([]);
  });
});

describe("url input", () => {
  it("extracts a URL from shared text and detects the platform", () => {
    const url = normalizeInputUrl("Regarde ça !! https://vm.tiktok.com/ZMabc/ trop bien");
    expect(url).toBe("https://vm.tiktok.com/ZMabc/");
    expect(detectPlatform(url!)).toBe("tiktok");
    expect(detectPlatform("https://youtu.be/abc")).toBe("youtube");
    expect(detectPlatform("https://pin.it/xyz")).toBe("pinterest");
  });
  it("rejects non-http inputs", () => {
    expect(normalizeInputUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeInputUrl("bonjour")).toBeNull();
    expect(normalizeInputUrl("https://user:pass@example.com")).toBeNull();
  });
});

describe("premium gating", () => {
  it("truncates list results for free users on the server", () => {
    const places = Array.from({ length: 7 }, (_, i) => place(`P${i}`, "sight", 1));
    const item = {
      id: "x",
      isExample: false,
      entities: places.map((p, ref) => ({ type: "place", name: p.name, ref })),
      data: { category: "TRAVEL", travel: { destination: null, country: null, cities: [], durationDays: null, bestPeriod: null, budgetText: null, places } },
    } as unknown as ContentItem;
    const free = toItemView(item, "FREE");
    expect(free.lockedCount).toBe(7);
    expect(free.data.category === "TRAVEL" && free.data.travel.places).toHaveLength(0);
    expect(toItemView(item, "PREMIUM").lockedCount).toBe(0);
  });
});
