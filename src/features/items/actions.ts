"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { limitsFor } from "@/config/plans";
import { getAppContext } from "@/features/auth/context";
import { isUuid } from "@/lib/utils";
import { track } from "@/services/analytics";
import { hasFeature } from "@/services/billing/entitlements";
import { mergeShoppingLines, scaleIngredients } from "@/services/recipes";
import { buildItinerary, suggestDayCount } from "@/services/travel/itinerary";
import type { SavedListType } from "@/types/domain";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string; code?: "limit" | "premium" | "not_found" };

async function loadItem(id: string) {
  if (!isUuid(id)) return null;
  const ctx = await getAppContext();
  const item = await ctx.store.getItem(id);
  return item ? { ...ctx, item } : null;
}

const notFound: ActionResult = { ok: false, error: "Élément introuvable.", code: "not_found" };

export async function saveItemAction(id: string): Promise<ActionResult> {
  const loaded = await loadItem(id);
  if (!loaded) return notFound;
  const { store, plan, item, user } = loaded;
  if (item.isSaved) return { ok: true };
  const limit = limitsFor(plan).maxSavedItems;
  if ((await store.countSavedItems()) >= limit) {
    await track(user.id, "paywall_viewed", { reason: "library_limit" });
    return { ok: false, error: limit === 0 ? "Un abonnement est nécessaire pour enregistrer." : `Ta bibliothèque est pleine (${limit} éléments).`, code: "limit" };
  }
  await store.updateItem(id, { isSaved: true });
  await track(user.id, "item_saved", { category: item.category });
  revalidatePath("/", "layout");
  return { ok: true, message: "Enregistré dans ton espace" };
}

export async function toggleFavoriteAction(id: string): Promise<ActionResult> {
  const loaded = await loadItem(id);
  if (!loaded) return notFound;
  await loaded.store.updateItem(id, { isFavorite: !loaded.item.isFavorite });
  revalidatePath("/", "layout");
  return { ok: true, message: loaded.item.isFavorite ? "Retiré des favoris" : "Ajouté aux favoris" };
}

export async function renameItemAction(id: string, title: string): Promise<ActionResult> {
  const parsed = z.string().trim().min(1).max(160).safeParse(title);
  if (!parsed.success) return { ok: false, error: "Titre invalide." };
  const loaded = await loadItem(id);
  if (!loaded) return notFound;
  await loaded.store.updateItem(id, { title: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Titre mis à jour" };
}

export async function deleteItemAction(id: string): Promise<void> {
  const loaded = await loadItem(id);
  if (loaded) await loaded.store.deleteItem(id);
  revalidatePath("/", "layout");
  redirect("/library?deleted=1");
}

// ---------------------------------------------------------------- Collections

export async function setItemCollectionAction(itemId: string, collectionId: string, add: boolean): Promise<ActionResult> {
  if (!isUuid(collectionId)) return notFound;
  const loaded = await loadItem(itemId);
  if (!loaded) return notFound;
  const { store } = loaded;
  if (!(await store.getCollection(collectionId))) return notFound;
  if (add) {
    // Adding to a collection implies keeping the item.
    if (!loaded.item.isSaved) {
      const saved = await saveItemAction(itemId);
      if (!saved.ok) return saved;
    }
    await store.addToCollection(collectionId, itemId);
  } else {
    await store.removeFromCollection(collectionId, itemId);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: add ? "Ajouté à la collection" : "Retiré de la collection" };
}

// ---------------------------------------------------------------- Recipes

export async function addRecipeToShoppingAction(itemId: string, servings: number): Promise<ActionResult> {
  const loaded = await loadItem(itemId);
  if (!loaded || loaded.item.data.category !== "RECIPES") return notFound;
  const recipe = loaded.item.data.recipe;
  const target = Number.isFinite(servings) && servings > 0 && servings <= 50 ? servings : recipe.servings ?? 1;
  const lines = mergeShoppingLines(
    scaleIngredients(recipe.ingredients, recipe.servings, target).map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
  );
  await loaded.store.addShopping(lines.map((l) => ({ ...l, contentItemId: itemId, recipeTitle: loaded.item.title })));
  revalidatePath("/lists");
  return { ok: true, message: `${lines.length} ingrédients ajoutés aux courses` };
}

// ---------------------------------------------------------------- Lists (watchlist, wishlist, reading, workout)

const LIST_FOR_CATEGORY: Record<string, SavedListType> = {
  MOVIES: "WATCHLIST",
  SERIES: "WATCHLIST",
  BOOKS: "READING",
  PRODUCTS: "WISHLIST",
  FASHION: "WISHLIST",
  HOME_DECOR: "WISHLIST",
  FITNESS: "WORKOUT",
};

/** Labels are computed server-side from stored data — never trusted from the client. */
export async function toggleListEntryAction(itemId: string, entityRef: number | null, add: boolean): Promise<ActionResult> {
  const loaded = await loadItem(itemId);
  if (!loaded) return notFound;
  const { item, store } = loaded;
  const listType = LIST_FOR_CATEGORY[item.data.category];
  if (!listType) return { ok: false, error: "Action indisponible pour ce contenu." };

  if (!add) {
    await store.removeSavedByRef(listType, itemId, entityRef);
    revalidatePath("/", "layout");
    return { ok: true, message: "Retiré de ta liste" };
  }

  let label = item.title;
  let subtitle: string | null = null;
  let imageUrl = item.imageUrl;
  const d = item.data;
  const ref = entityRef ?? -1;
  if ((d.category === "MOVIES" || d.category === "SERIES") && d.screen.titles[ref]) {
    const t = d.screen.titles[ref];
    label = t.title;
    subtitle = [t.year, t.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ") || null;
    imageUrl = t.posterUrl ?? imageUrl;
  } else if (d.category === "BOOKS" && d.books.books[ref]) {
    const b = d.books.books[ref];
    label = b.title;
    subtitle = b.author;
    imageUrl = b.coverUrl ?? imageUrl;
  } else if (d.category === "PRODUCTS" && d.products.products[ref]) {
    const p = d.products.products[ref];
    label = p.brand ? `${p.brand} — ${p.name}` : p.name;
    subtitle = p.productCategory;
    imageUrl = p.imageUrl ?? imageUrl;
  } else if (d.category === "FASHION" && d.fashion.pieces[ref]) {
    const p = d.fashion.pieces[ref];
    label = p.name;
    subtitle = p.brand;
  } else if (d.category === "HOME_DECOR" && d.decor.objects[ref]) {
    const o = d.decor.objects[ref];
    label = o.name;
    subtitle = o.brand ?? o.material;
  } else if (entityRef !== null) {
    return notFound;
  }

  await store.upsertSaved({ listType, contentItemId: itemId, entityRef, label, subtitle, imageUrl });
  if (!item.isSaved) await store.updateItem(itemId, { isSaved: true });
  revalidatePath("/", "layout");
  const where: Record<SavedListType, string> = {
    WATCHLIST: "à ta watchlist",
    READING: "à tes lectures",
    WISHLIST: "à ta wishlist",
    WORKOUT: "à ta séance",
  };
  return { ok: true, message: `Ajouté ${where[listType]}` };
}

// ---------------------------------------------------------------- Travel

export async function generateItineraryAction(itemId: string, days: number): Promise<ActionResult> {
  const loaded = await loadItem(itemId);
  if (!loaded) return notFound;
  const { item, plan, store, user } = loaded;
  const d = item.data;
  if (d.category !== "TRAVEL" && d.category !== "PLACES") return { ok: false, error: "Action indisponible pour ce contenu." };
  if (!hasFeature(plan, "itinerary") && !item.isExample) {
    await track(user.id, "premium_action_clicked", { action: "itinerary" });
    await track(user.id, "paywall_viewed", { reason: "itinerary" });
    return { ok: false, error: "Les itinéraires sont réservés à Premium.", code: "premium" };
  }
  const places = d.category === "TRAVEL" ? d.travel.places : d.places.places;
  if (!places.some((p) => p.geo)) {
    return { ok: false, error: "Aucun lieu n'a de position connue : impossible de créer un itinéraire fiable." };
  }
  const dayCount = suggestDayCount(places, Number.isFinite(days) && days > 0 ? days : d.category === "TRAVEL" ? d.travel.durationDays : null);
  const itinerary = buildItinerary(places, dayCount);
  await store.updateItem(itemId, { userData: { ...item.userData, itinerary }, ...(item.isSaved ? {} : { isSaved: true }) });
  revalidatePath(`/items/${itemId}`);
  return { ok: true, message: "Itinéraire créé" };
}

export async function trackPremiumClickAction(action: string): Promise<void> {
  const { user } = await getAppContext();
  await track(user.id, "premium_action_clicked", { action: action.slice(0, 40) });
}
