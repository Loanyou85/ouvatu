import type { NewContentItem } from "@/db/types";
import { deriveEntities } from "@/services/entity-extraction";
import type { Place, StructuredData } from "@/types/schemas";

/**
 * Example inspirations so a new user can explore the product without
 * analyzing a link first. They are flagged `isExample` and labelled
 * "Exemple" in the UI. Unknown facts are left null — like real results.
 */

const EXAMPLE_URL = "https://ouvatu.app/exemples";

function place(name: string, kind: Place["kind"], city: string, country: string, coords: [number, number] | null, description: string | null = null, cuisine: string | null = null): Place {
  return {
    name,
    kind,
    description,
    address: null,
    city,
    country,
    priceText: null,
    cuisine,
    url: null,
    geo: coords ? { lat: coords[0], lng: coords[1], provider: "openstreetmap", label: null } : null,
  };
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000 - d * 3_600_000).toISOString();

function example(input: Omit<NewContentItem, "entities" | "isExample" | "isSaved" | "sourceId" | "sourceUrl" | "sourcePlatform" | "sourceAuthor" | "confidence"> & { slug: string }): NewContentItem {
  const { slug, ...rest } = input;
  return {
    ...rest,
    sourceId: null,
    confidence: 1,
    entities: deriveEntities(rest.data as StructuredData),
    isSaved: true,
    isExample: true,
    sourceUrl: `${EXAMPLE_URL}/${slug}`,
    sourcePlatform: "web",
    sourceAuthor: "OUVATU",
  };
}

export function exampleItems(): NewContentItem[] {
  return [
    example({
      slug: "lisbonne",
      category: "TRAVEL",
      title: "Lisbonne — 3 jours",
      summary: "Les incontournables de Lisbonne : Belém, Alfama, les miradouros et les meilleures adresses gourmandes.",
      imageUrl: null,
      tags: ["lisbonne", "portugal", "city trip", "miradouro"],
      createdAt: daysAgo(1),
      data: {
        category: "TRAVEL",
        travel: {
          destination: "Lisbonne",
          country: "Portugal",
          cities: ["Lisbonne"],
          durationDays: 3,
          bestPeriod: null,
          budgetText: null,
          places: [
            place("Torre de Belém", "sight", "Lisbonne", "Portugal", [38.6916, -9.216], "Tour fortifiée du XVIe siècle au bord du Tage."),
            place("Mosteiro dos Jerónimos", "sight", "Lisbonne", "Portugal", [38.6979, -9.2068], "Monastère manuélin classé à l'UNESCO."),
            place("Pastéis de Belém", "cafe", "Lisbonne", "Portugal", [38.6975, -9.2033], "La pâtisserie historique des pastéis de nata."),
            place("LX Factory", "shop", "Lisbonne", "Portugal", [38.7033, -9.1784], "Ancienne usine devenue quartier créatif."),
            place("Time Out Market", "restaurant", "Lisbonne", "Portugal", [38.707, -9.1459], "Grand marché gourmand du Cais do Sodré."),
            place("Manteigaria", "cafe", "Lisbonne", "Portugal", [38.7108, -9.1432], "Pastéis de nata tout chauds dans le Chiado."),
            place("Castelo de São Jorge", "sight", "Lisbonne", "Portugal", [38.7139, -9.1335], "Château avec vue sur toute la ville."),
            place("Miradouro da Senhora do Monte", "viewpoint", "Lisbonne", "Portugal", [38.719, -9.1328], "Le plus beau coucher de soleil sur Lisbonne."),
            place("A Cevicheria", "restaurant", "Lisbonne", "Portugal", [38.7163, -9.1488], "Ceviche et poulpe géant au plafond, à Príncipe Real.", "péruvienne"),
            place("Tram 28", "activity", "Lisbonne", "Portugal", null, "Traverser les quartiers historiques en tramway jaune."),
          ],
        },
      },
    }),
    example({
      slug: "pates-citron",
      category: "RECIPES",
      title: "Pâtes crémeuses citron & parmesan",
      summary: "Des pâtes ultra crémeuses sans crème, prêtes en 20 minutes avec 6 ingrédients.",
      imageUrl: null,
      tags: ["pâtes", "rapide", "végétarien", "italien"],
      createdAt: daysAgo(2),
      data: {
        category: "RECIPES",
        recipe: {
          description: "Le secret : l'eau de cuisson féculente qui émulsionne le beurre et le parmesan.",
          prepMinutes: 5,
          cookMinutes: 15,
          totalMinutes: 20,
          servings: 2,
          difficulty: "easy",
          ingredients: [
            { name: "spaghetti", quantity: 200, unit: "g", note: null },
            { name: "citron non traité", quantity: 1, unit: null, note: "zeste + jus" },
            { name: "parmesan râpé", quantity: 60, unit: "g", note: null },
            { name: "beurre", quantity: 30, unit: "g", note: null },
            { name: "poivre noir", quantity: null, unit: null, note: "fraîchement moulu" },
            { name: "basilic", quantity: 4, unit: "feuilles", note: "facultatif" },
          ],
          steps: [
            { text: "Cuire les spaghetti dans une grande casserole d'eau salée jusqu'à ce qu'ils soient al dente." },
            { text: "Pendant ce temps, zester et presser le citron." },
            { text: "Réserver une grande tasse d'eau de cuisson, puis égoutter les pâtes." },
            { text: "Hors du feu, mélanger les pâtes avec le beurre, le zeste, le jus et un peu d'eau de cuisson." },
            { text: "Ajouter le parmesan petit à petit en remuant vivement jusqu'à obtenir une sauce crémeuse." },
            { text: "Poivrer généreusement et servir avec le basilic." },
          ],
          tips: ["Ajoute l'eau de cuisson cuillère par cuillère : la sauce doit napper sans être liquide."],
        },
      },
    }),
    example({
      slug: "udon-paris",
      category: "PLACES",
      title: "Udon à Paris — Kunitoraya",
      summary: "Un comptoir japonais spécialisé dans les udon faits maison, dans le quartier japonais près de l'Opéra.",
      imageUrl: null,
      tags: ["japonais", "paris", "udon", "restaurant"],
      createdAt: daysAgo(3),
      data: {
        category: "PLACES",
        places: {
          city: "Paris",
          country: "France",
          places: [place("Kunitoraya", "restaurant", "Paris", "France", null, "Udon maison servis chauds ou froids.", "japonaise")],
        },
      },
    }),
    example({
      slug: "serum",
      category: "PRODUCTS",
      title: "Sérum hydratant — routine du soir",
      summary: "Un sérum à l'acide hyaluronique présenté comme la base d'une routine simple pour peau déshydratée.",
      imageUrl: null,
      tags: ["skincare", "routine", "hydratation"],
      createdAt: daysAgo(4),
      data: {
        category: "PRODUCTS",
        products: {
          products: [
            {
              brand: null,
              name: "Sérum à l'acide hyaluronique",
              productCategory: "Soin du visage",
              description: "À appliquer sur peau propre et légèrement humide, avant la crème hydratante.",
              price: null,
              currency: null,
              url: null,
              imageUrl: null,
              features: ["Peau déshydratée", "Texture légère", "Matin et soir"],
            },
          ],
        },
      },
    }),
    example({
      slug: "films-sf",
      category: "MOVIES",
      title: "3 films de science-fiction qui retournent le cerveau",
      summary: "Une sélection de films de science-fiction autour du temps, des rêves et du langage.",
      imageUrl: null,
      tags: ["science-fiction", "films", "cinéma"],
      createdAt: daysAgo(5),
      data: {
        category: "MOVIES",
        screen: {
          titles: [
            { kind: "movie", title: "Interstellar", year: 2014, genres: ["Science-fiction", "Drame"], overview: "Des explorateurs traversent un trou de ver pour trouver une nouvelle planète habitable.", posterUrl: null, cast: ["Matthew McConaughey", "Anne Hathaway"], streamingPlatforms: [], externalId: null },
            { kind: "movie", title: "Inception", year: 2010, genres: ["Science-fiction", "Thriller"], overview: "Un voleur s'infiltre dans les rêves pour y implanter une idée.", posterUrl: null, cast: ["Leonardo DiCaprio"], streamingPlatforms: [], externalId: null },
            { kind: "movie", title: "Premier Contact", year: 2016, genres: ["Science-fiction", "Drame"], overview: "Une linguiste tente de communiquer avec des visiteurs extraterrestres.", posterUrl: null, cast: ["Amy Adams"], streamingPlatforms: [], externalId: null },
          ],
        },
      },
    }),
    example({
      slug: "livres",
      category: "BOOKS",
      title: "2 livres pour voir le monde autrement",
      summary: "Un classique de la littérature française et un essai sur l'histoire de l'humanité.",
      imageUrl: null,
      tags: ["lecture", "classique", "essai"],
      createdAt: daysAgo(6),
      data: {
        category: "BOOKS",
        books: {
          books: [
            { title: "L'Étranger", author: "Albert Camus", coverUrl: null, genres: ["Roman", "Classique"], description: null, year: 1942 },
            { title: "Sapiens : Une brève histoire de l'humanité", author: "Yuval Noah Harari", coverUrl: null, genres: ["Essai", "Histoire"], description: null, year: 2011 },
          ],
        },
      },
    }),
    example({
      slug: "full-body",
      category: "FITNESS",
      title: "Full body 20 min sans matériel",
      summary: "Une séance complète au poids du corps, à faire à la maison.",
      imageUrl: null,
      tags: ["full body", "maison", "sans matériel"],
      createdAt: daysAgo(7),
      data: {
        category: "FITNESS",
        fitness: {
          goal: "Renforcement général",
          level: "beginner",
          durationMinutes: 20,
          muscleGroups: ["Jambes", "Pectoraux", "Abdominaux"],
          equipment: [],
          exercises: [
            { name: "Squats", sets: 3, reps: "15", durationSeconds: null, restSeconds: 45, muscleGroup: "Jambes", notes: null },
            { name: "Pompes", sets: 3, reps: "10", durationSeconds: null, restSeconds: 45, muscleGroup: "Pectoraux", notes: "Sur les genoux si besoin" },
            { name: "Fentes alternées", sets: 3, reps: "12", durationSeconds: null, restSeconds: 45, muscleGroup: "Jambes", notes: null },
            { name: "Gainage", sets: 3, reps: null, durationSeconds: 40, restSeconds: 30, muscleGroup: "Abdominaux", notes: null },
            { name: "Burpees", sets: 3, reps: "8", durationSeconds: null, restSeconds: 60, muscleGroup: "Cardio", notes: null },
          ],
        },
      },
    }),
    example({
      slug: "salon-beige",
      category: "HOME_DECOR",
      title: "Salon beige & bois naturel",
      summary: "Une ambiance japandi douce : tons beiges, bois clair, lin et lumière tamisée.",
      imageUrl: null,
      tags: ["beige", "japandi", "salon", "bois"],
      createdAt: daysAgo(8),
      data: {
        category: "HOME_DECOR",
        decor: {
          style: "Japandi",
          colors: ["Beige", "Bois clair", "Blanc cassé"],
          rooms: ["Salon"],
          objects: [
            { name: "Canapé en lin", brand: null, objectCategory: "Assise", material: "Lin", color: "Beige", price: null, currency: null },
            { name: "Table basse ronde", brand: null, objectCategory: "Table", material: "Bois", color: "Chêne clair", price: null, currency: null },
            { name: "Lampe en papier", brand: null, objectCategory: "Luminaire", material: "Papier", color: "Blanc", price: null, currency: null },
            { name: "Plaid en laine", brand: null, objectCategory: "Textile", material: "Laine", color: "Écru", price: null, currency: null },
          ],
        },
      },
    }),
  ];
}
