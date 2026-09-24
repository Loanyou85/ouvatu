import type { Category } from "@/config/categories";
import { normalizeText, truncate } from "@/lib/utils";
import { contentCorpus, type NormalizedContent } from "@/services/content-ingestion/types";
import type { PlaceKind } from "@/types/schemas";
import type { AiEnvelope } from "../ai-schema";
import type { AnalysisProvider } from "./types";

/**
 * Rule-based analyzer used when no LLM key is configured (development) or as
 * a degraded fallback. It never invents data: it only reuses schema.org
 * JSON-LD found on the page and patterns literally present in the text.
 */

const KEYWORDS: Record<Exclude<Category, "OTHER">, string[]> = {
  RECIPES: ["recette", "recipe", "ingredient", "ingredients", "cuisson", "four", "farine", "pates", "pasta", "sauce", "gateau", "cuire", "poeler", "melanger", "cuillere", "foodtok", "cooking", "dessert", "gramme"],
  TRAVEL: ["voyage", "travel", "visiter", "visit", "itineraire", "jours", "days", "destination", "vacances", "roadtrip", "traveltok", "trip", "que faire", "things to do", "week-end", "weekend", "city guide"],
  PLACES: ["restaurant", "cafe", "bar", "brunch", "adresse", "spot", "park", "parc", "plage", "beach", "musee", "museum", "thingstodo", "hidden gem", "a faire", "boulangerie", "rooftop", "coffee", "bistrot", "pizzeria", "ramen", "sushi", "patisserie"],
  PRODUCTS: ["produit", "product", "acheter", "buy", "prix", "price", "promo", "review", "test", "unboxing", "skincare", "serum", "creme", "gadget", "amazon", "haul", "favoris", "routine beaute"],
  MOVIES: ["film", "films", "movie", "movies", "cinema", "netflix", "realisateur", "thriller", "filmtok", "a voir", "must watch"],
  SERIES: ["serie", "series", "saison", "season", "episode", "binge", "tv show"],
  BOOKS: ["livre", "livres", "book", "books", "roman", "lecture", "booktok", "auteur", "author", "reading", "a lire", "chapitre"],
  FASHION: ["outfit", "look", "tenue", "mode", "fashion", "style", "jean", "robe", "veste", "sneakers", "ootd", "vetement", "pull", "chemise", "manteau"],
  HOME_DECOR: ["deco", "decoration", "interieur", "interior", "salon", "chambre", "appartement", "home", "meuble", "canape", "luminaire", "homedecor", "room tour", "ikea"],
  FITNESS: ["workout", "exercice", "exercices", "seance", "fitness", "abdos", "squat", "musculation", "reps", "series de", "cardio", "gym", "hiit", "pompes", "gainage", "entrainement"],
};

const CITIES: Record<string, { city: string; country: string }> = {
  lisbonne: { city: "Lisbonne", country: "Portugal" },
  lisbon: { city: "Lisbonne", country: "Portugal" },
  porto: { city: "Porto", country: "Portugal" },
  paris: { city: "Paris", country: "France" },
  lyon: { city: "Lyon", country: "France" },
  marseille: { city: "Marseille", country: "France" },
  bordeaux: { city: "Bordeaux", country: "France" },
  nice: { city: "Nice", country: "France" },
  rome: { city: "Rome", country: "Italie" },
  milan: { city: "Milan", country: "Italie" },
  florence: { city: "Florence", country: "Italie" },
  naples: { city: "Naples", country: "Italie" },
  venise: { city: "Venise", country: "Italie" },
  barcelone: { city: "Barcelone", country: "Espagne" },
  barcelona: { city: "Barcelone", country: "Espagne" },
  madrid: { city: "Madrid", country: "Espagne" },
  seville: { city: "Séville", country: "Espagne" },
  londres: { city: "Londres", country: "Royaume-Uni" },
  london: { city: "Londres", country: "Royaume-Uni" },
  amsterdam: { city: "Amsterdam", country: "Pays-Bas" },
  berlin: { city: "Berlin", country: "Allemagne" },
  bruxelles: { city: "Bruxelles", country: "Belgique" },
  tokyo: { city: "Tokyo", country: "Japon" },
  kyoto: { city: "Kyoto", country: "Japon" },
  osaka: { city: "Osaka", country: "Japon" },
  seoul: { city: "Séoul", country: "Corée du Sud" },
  bangkok: { city: "Bangkok", country: "Thaïlande" },
  bali: { city: "Bali", country: "Indonésie" },
  marrakech: { city: "Marrakech", country: "Maroc" },
  istanbul: { city: "Istanbul", country: "Turquie" },
  athenes: { city: "Athènes", country: "Grèce" },
  "new york": { city: "New York", country: "États-Unis" },
  toronto: { city: "Toronto", country: "Canada" },
  montreal: { city: "Montréal", country: "Canada" },
  vancouver: { city: "Vancouver", country: "Canada" },
  "los angeles": { city: "Los Angeles", country: "États-Unis" },
  miami: { city: "Miami", country: "États-Unis" },
  chicago: { city: "Chicago", country: "États-Unis" },
  dubai: { city: "Dubaï", country: "Émirats arabes unis" },
  nyc: { city: "New York", country: "États-Unis" },
  copenhague: { city: "Copenhague", country: "Danemark" },
  prague: { city: "Prague", country: "Tchéquie" },
  vienne: { city: "Vienne", country: "Autriche" },
  budapest: { city: "Budapest", country: "Hongrie" },
  mexico: { city: "Mexico", country: "Mexique" },
};

const PLACE_KIND_WORDS: [PlaceKind, string[]][] = [
  ["restaurant", ["restaurant", "resto", "bistrot", "brasserie", "trattoria", "pizzeria", "ramen", "sushi", "tapas", "taverne", "diner"]],
  ["cafe", ["cafe", "coffee", "salon de the", "boulangerie", "patisserie", "brunch"]],
  ["bar", ["bar", "rooftop", "pub", "cocktail"]],
  ["museum", ["musee", "museum", "galerie", "gallery", "fondation"]],
  ["beach", ["plage", "beach", "praia", "playa", "crique"]],
  ["viewpoint", ["miradouro", "belvedere", "point de vue", "viewpoint", "panorama"]],
  ["park", ["parc", "park", "jardin", "garden"]],
  ["hotel", ["hotel", "hostel", "auberge", "riad", "airbnb"]],
  ["shop", ["boutique", "shop", "marche", "market", "concept store", "librairie"]],
  ["activity", ["tour", "visite", "croisiere", "balade", "randonnee", "excursion", "atelier", "cours"]],
  ["sight", ["tour de", "tower", "chateau", "castle", "cathedrale", "eglise", "monastere", "palais", "pont", "place", "quartier"]],
];

const COLORS = ["beige", "blanc", "noir", "gris", "bleu", "marine", "vert", "sauge", "kaki", "terracotta", "rouge", "rose", "jaune", "moutarde", "marron", "camel", "creme", "ecru", "bordeaux", "violet", "orange", "dore", "argent", "lin", "bois"];
const UNITS = ["kg", "g", "gr", "mg", "l", "cl", "ml", "dl", "c. a soupe", "c. a cafe", "cas", "cac", "cuillere a soupe", "cuilleres a soupe", "cuillere a cafe", "cuilleres a cafe", "tasse", "tasses", "cup", "cups", "tbsp", "tsp", "pincee", "gousse", "gousses", "tranche", "tranches", "botte", "sachet", "boite"];

function scoreCategories(corpus: string, hashtags: string[]): [Category, number][] {
  const text = ` ${normalizeText(corpus)} ${hashtags.join(" ")} `;
  return (Object.entries(KEYWORDS) as [Category, string[]][])
    .map(([cat, words]) => {
      const score = words.reduce((acc, w) => {
        if (text.includes(` ${w}`)) return acc + 1;
        // Compound hashtags (#torontothingstodo, #biidaasigepark) hide keywords inside a single word.
        return w.length >= 4 && !w.includes(" ") && hashtags.some((h) => h.includes(w)) ? acc + 1 : acc;
      }, 0);
      return [cat, score] as [Category, number];
    })
    .sort((a, b) => b[1] - a[1]);
}

/** Split a caption/page into candidate list lines ("1. LX Factory", "📍 Time Out Market", "- 200 g farine"). */
export function splitLines(text: string): string[] {
  return text
    .replace(/\s(?=(?:\d{1,2}[.)]|\d️⃣|[•▪️➡️👉📍🍽️☕️🏖️🎬📚✅🔹]\s*)\s*\S)/gu, "\n")
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:[-*•▪️➡️👉✅🔹]|\d{1,2}[.)]|\d️⃣)\s*/u, "").trim())
    .filter((l) => l.length > 1 && l.length < 200);
}

function stripEmoji(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();
}

function parseQuantity(raw: string): number | null {
  const frac = raw.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}
function asString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object" && "name" in v) return asString((v as { name: unknown }).name);
  return null;
}
function isoMinutes(v: unknown): number | null {
  const s = asString(v);
  const m = s?.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}
function ldType(item: Record<string, unknown>): string {
  return asArray(item["@type"]).map(String).join(" ");
}

function emptyEnvelope(category: Category, title: string, summary: string, confidence: number, tags: string[]): AiEnvelope {
  return {
    category,
    confidence,
    title,
    summary,
    tags,
    recipe: null,
    travel: null,
    places: null,
    products: null,
    screen: null,
    books: null,
    fashion: null,
    decor: null,
    fitness: null,
    other: null,
    locations: [],
  };
}

function parseIngredient(line: string): { name: string; quantity: number | null; unit: string | null; note: string | null } | null {
  const clean = stripEmoji(line);
  const m = normalizeText(clean).match(/^(\d+(?:[.,/]\d+)?)\s*(.*)$/);
  if (!m) return null;
  const quantity = parseQuantity(m[1]);
  let rest = m[2];
  let unit: string | null = null;
  for (const u of [...UNITS].sort((a, b) => b.length - a.length)) {
    const nu = normalizeText(u);
    if (rest.startsWith(`${nu} `) || rest === nu) {
      unit = u;
      rest = rest.slice(nu.length).trim();
      break;
    }
  }
  rest = rest.replace(/^(de |d |des |du )/, "").trim();
  if (!rest) return null;
  return { name: rest, quantity, unit, note: null };
}

function recipeFromJsonLd(ld: Record<string, unknown>): AiEnvelope["recipe"] {
  const ingredients = asArray(ld.recipeIngredient)
    .map((i) => asString(i))
    .filter((i): i is string => Boolean(i))
    .map((line) => parseIngredient(line) ?? { name: line, quantity: null, unit: null, note: null });
  const steps = asArray(ld.recipeInstructions).flatMap((s) => {
    if (typeof s === "string") return [s];
    const obj = s as Record<string, unknown>;
    if (Array.isArray(obj.itemListElement)) return obj.itemListElement.map((x) => asString((x as Record<string, unknown>).text) ?? "").filter(Boolean);
    return [asString(obj.text) ?? ""].filter(Boolean);
  });
  const yieldText = asString(asArray(ld.recipeYield)[0]);
  const servings = yieldText?.match(/\d+/) ? Number(yieldText.match(/\d+/)![0]) : null;
  return {
    description: asString(ld.description),
    prepMinutes: isoMinutes(ld.prepTime),
    cookMinutes: isoMinutes(ld.cookTime),
    totalMinutes: isoMinutes(ld.totalTime),
    servings,
    difficulty: null,
    ingredients,
    steps,
    tips: [],
  };
}

function detectCity(corpus: string): { city: string; country: string } | null {
  const text = ` ${normalizeText(corpus)} `;
  for (const [key, value] of Object.entries(CITIES)) if (text.includes(` ${key} `)) return value;
  return null;
}

function placeKind(name: string, fallback: PlaceKind): PlaceKind {
  const n = ` ${normalizeText(name)} `;
  for (const [kind, words] of PLACE_KIND_WORDS) if (words.some((w) => n.includes(` ${w}`))) return kind;
  return fallback;
}

export class HeuristicProvider implements AnalysisProvider {
  readonly name = "heuristic";

  async analyze(content: NormalizedContent): Promise<AiEnvelope> {
    const corpus = contentCorpus(content);
    const firstLine = (text: string | null) => (text ? stripEmoji(text.split("\n")[0].replace(/#[\p{L}\p{N}_]+/gu, "")).trim() : "");
    const baseTitle = firstLine(content.title) || firstLine(content.userText) || firstLine(content.siteName) || "Inspiration";
    const title = truncate(baseTitle, 70);
    const summarySource = content.description ?? content.userText ?? content.title ?? "Contenu enregistré depuis le web.";
    const summary = truncate(firstLine(summarySource) || stripEmoji(summarySource), 300);
    const tags = content.hashtags.slice(0, 6);

    // 1. schema.org JSON-LD gives reliable, publisher-provided structure.
    for (const ld of content.jsonLd) {
      const type = ldType(ld);
      if (/Recipe/.test(type)) {
        const env = emptyEnvelope("RECIPES", truncate(asString(ld.name) ?? title, 70), summary, 0.85, tags);
        env.recipe = recipeFromJsonLd(ld);
        return env;
      }
      if (/Product/.test(type)) {
        const offer = asArray(ld.offers)[0] as Record<string, unknown> | undefined;
        const price = offer ? Number(asString(offer.price) ?? asString(offer.lowPrice)) : NaN;
        const env = emptyEnvelope("PRODUCTS", truncate(asString(ld.name) ?? title, 70), summary, 0.8, tags);
        env.products = [
          {
            brand: asString(ld.brand),
            name: asString(ld.name) ?? title,
            productCategory: asString(ld.category),
            description: asString(ld.description),
            price: Number.isFinite(price) ? price : null,
            currency: offer ? asString(offer.priceCurrency) : null,
            url: content.url,
            features: [],
          },
        ];
        return env;
      }
      if (/Movie|TVSeries/.test(type)) {
        const kind = /TVSeries/.test(type) ? "series" : "movie";
        const env = emptyEnvelope(kind === "series" ? "SERIES" : "MOVIES", truncate(asString(ld.name) ?? title, 70), summary, 0.8, tags);
        const year = Number((asString(ld.datePublished) ?? asString(ld.startDate) ?? "").slice(0, 4));
        env.screen = [
          {
            kind,
            title: asString(ld.name) ?? title,
            year: Number.isFinite(year) && year > 1800 ? year : null,
            genres: asArray(ld.genre).map(asString).filter((g): g is string => Boolean(g)),
            overview: asString(ld.description),
            cast: asArray(ld.actor).map(asString).filter((g): g is string => Boolean(g)).slice(0, 6),
            streamingPlatforms: [],
          },
        ];
        return env;
      }
      if (/Book/.test(type)) {
        const env = emptyEnvelope("BOOKS", truncate(asString(ld.name) ?? title, 70), summary, 0.8, tags);
        const year = Number((asString(ld.datePublished) ?? "").slice(0, 4));
        env.books = [
          {
            title: asString(ld.name) ?? title,
            author: asString(asArray(ld.author)[0]),
            genres: asArray(ld.genre).map(asString).filter((g): g is string => Boolean(g)),
            description: asString(ld.description),
            year: Number.isFinite(year) && year > 0 ? year : null,
          },
        ];
        return env;
      }
      if (/Restaurant|CafeOrCoffeeShop|BarOrPub|LocalBusiness|TouristAttraction/.test(type)) {
        const address = ld.address as Record<string, unknown> | undefined;
        const env = emptyEnvelope("PLACES", truncate(asString(ld.name) ?? title, 70), summary, 0.8, tags);
        env.places = {
          city: address ? asString(address.addressLocality) : null,
          country: address ? asString(address.addressCountry) : null,
          places: [
            {
              name: asString(ld.name) ?? title,
              kind: /Cafe/.test(type) ? "cafe" : /Bar/.test(type) ? "bar" : /Restaurant/.test(type) ? "restaurant" : "sight",
              description: asString(ld.description),
              address: address ? [asString(address.streetAddress), asString(address.postalCode), asString(address.addressLocality)].filter(Boolean).join(", ") || null : null,
              city: address ? asString(address.addressLocality) : null,
              country: address ? asString(address.addressCountry) : null,
              priceText: asString(ld.priceRange),
              cuisine: asString(asArray(ld.servesCuisine)[0]),
            },
          ],
        };
        return env;
      }
    }

    // 2. Keyword classification on the text we actually have.
    const scores = scoreCategories(corpus, content.hashtags);
    const [best, bestScore] = scores[0];
    const category: Category = bestScore === 0 ? "OTHER" : best;
    const confidence = Math.min(0.6, 0.25 + bestScore * 0.08);
    const env = emptyEnvelope(category, title, summary, confidence, tags);
    const lines = splitLines([content.title, content.description, content.userText, content.text?.slice(0, 4000)].filter(Boolean).join("\n"));
    const listLines = lines.map(stripEmoji).filter((l) => l.length > 1 && l.length <= 60 && !/^#/.test(l));

    switch (category) {
      case "RECIPES": {
        const ingredients = lines.map(parseIngredient).filter((i): i is NonNullable<typeof i> => Boolean(i)).slice(0, 40);
        const servingsMatch = normalizeText(corpus).match(/(\d+)\s*(personnes|pers|portions|parts)/);
        env.recipe = {
          description: null,
          prepMinutes: null,
          cookMinutes: null,
          totalMinutes: null,
          servings: servingsMatch ? Number(servingsMatch[1]) : null,
          difficulty: null,
          ingredients,
          steps: [],
          tips: [],
        };
        break;
      }
      case "TRAVEL":
      case "PLACES": {
        const where = detectCity(corpus);
        const candidates = listLines
          .filter((l) => !CITIES[normalizeText(l)] && !/^(top|les|mes|voici|\d+ )/i.test(normalizeText(l)))
          .slice(0, 15);
        const places = candidates.map((name) => ({
          name,
          kind: placeKind(name, category === "PLACES" ? "restaurant" : "sight"),
          description: null,
          address: null,
          city: where?.city ?? null,
          country: where?.country ?? null,
          priceText: null,
          cuisine: null,
        }));
        if (category === "TRAVEL") {
          env.travel = { destination: where?.city ?? null, country: where?.country ?? null, cities: where ? [where.city] : [], durationDays: null, bestPeriod: null, budgetText: null, places };
          if (where && !normalizeText(title).includes(normalizeText(where.city))) env.title = truncate(`${where.city} — ${title}`, 70);
        } else if (places.length) {
          env.places = { city: where?.city ?? null, country: where?.country ?? null, places };
        } else {
          env.category = "OTHER";
          env.other = { keyPoints: [summary] };
        }
        break;
      }
      case "MOVIES":
      case "SERIES":
      case "BOOKS": {
        const items = listLines
          .filter((l) => !/^(top|les|mes|voici|\d+ (films|series|livres))/i.test(normalizeText(l)))
          .slice(0, 12)
          .map((line) => {
            const yearMatch = line.match(/\((\d{4})\)/);
            const clean = line.replace(/\(\d{4}\)/, "").trim();
            const [name, author] = clean.split(/\s+(?:de|by|—|-)\s+/);
            return { name: name.trim(), author: author?.trim() ?? null, year: yearMatch ? Number(yearMatch[1]) : null };
          });
        if (category === "BOOKS") {
          env.books = items.map((i) => ({ title: i.name, author: i.author, genres: [], description: null, year: i.year }));
        } else {
          env.screen = items.map((i) => ({
            kind: category === "SERIES" ? ("series" as const) : ("movie" as const),
            title: i.name,
            year: i.year,
            genres: [],
            overview: null,
            cast: [],
            streamingPlatforms: [],
          }));
        }
        if (items.length === 0) {
          env.category = "OTHER";
          env.other = { keyPoints: [summary] };
        }
        break;
      }
      case "FITNESS": {
        const exercises = lines
          .map((line) => {
            const m = normalizeText(line).match(/(\d+)\s*(?:x|series de|sets of)\s*(\d+)\s*(.*)/);
            if (m) return { name: stripEmoji(m[3]) || stripEmoji(line), sets: Number(m[1]), reps: m[2], durationSeconds: null, restSeconds: null, muscleGroup: null, notes: null };
            const d = normalizeText(line).match(/^(.*?)(\d+)\s*(s|sec|secondes|min)\b/);
            if (d && d[1].trim()) return { name: stripEmoji(d[1]), sets: null, reps: null, durationSeconds: Number(d[2]) * (d[3] === "min" ? 60 : 1), restSeconds: null, muscleGroup: null, notes: null };
            return null;
          })
          .filter((e): e is NonNullable<typeof e> => Boolean(e))
          .slice(0, 20);
        if (exercises.length) {
          env.fitness = { goal: null, level: null, durationMinutes: null, muscleGroups: [], equipment: [], exercises };
        } else {
          env.category = "OTHER";
          env.other = { keyPoints: [summary] };
        }
        break;
      }
      case "FASHION":
      case "HOME_DECOR": {
        const norm = ` ${normalizeText(corpus)} `;
        const colors = COLORS.filter((c) => norm.includes(` ${c}`)).slice(0, 6);
        if (category === "FASHION") env.fashion = { style: null, colors, occasions: [], pieces: [] };
        else env.decor = { style: null, colors, rooms: [], objects: [] };
        break;
      }
      case "PRODUCTS": {
        env.products = [{ brand: null, name: title, productCategory: null, description: summary, price: null, currency: null, url: content.url, features: [] }];
        break;
      }
      default:
        env.other = { keyPoints: [summary] };
    }

    // Without the AI, specific spots are rarely identifiable — but the city named in the
    // caption or hashtags (#toronto) is real: pin it so the card still has its map.
    const where = detectCity(corpus);
    if (where) {
      const pin = { name: where.city, kind: "other" as const, description: null, address: null, city: where.city, country: where.country, priceText: null, cuisine: null };
      if (env.travel && env.travel.places.length === 0) env.travel.places.push(pin);
      else if (!env.travel && !env.places?.places.length) env.locations = [pin];
    }
    return env;
  }
}
