import type { Category } from "@/config/categories";
import type { SavedListType } from "@/types/domain";

export const LIST_TABS: { slug: string; label: string; emoji: string; listType: SavedListType | "SHOPPING"; category: Category; doneLabel: string; empty: string }[] = [
  { slug: "courses", label: "Courses", emoji: "🛒", listType: "SHOPPING", category: "RECIPES", doneLabel: "", empty: "Ouvre une recette et touche « Ajouter aux courses »." },
  { slug: "watchlist", label: "Watchlist", emoji: "🎬", listType: "WATCHLIST", category: "MOVIES", doneLabel: "Vu", empty: "Ajoute des films et séries depuis tes inspirations." },
  { slug: "lectures", label: "À lire", emoji: "📚", listType: "READING", category: "BOOKS", doneLabel: "Lu", empty: "Ajoute des livres depuis tes inspirations." },
  { slug: "wishlist", label: "Wishlist", emoji: "🛍️", listType: "WISHLIST", category: "PRODUCTS", doneLabel: "Acheté", empty: "Ajoute des produits, vêtements ou objets déco." },
  { slug: "seance", label: "Séance", emoji: "💪", listType: "WORKOUT", category: "FITNESS", doneLabel: "Faite", empty: "Ajoute des routines fitness à ta séance." },
];
