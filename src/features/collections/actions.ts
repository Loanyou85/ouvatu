"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { limitsFor } from "@/config/plans";
import { getAppContext } from "@/features/auth/context";
import { setItemCollectionAction, type ActionResult } from "@/features/items/actions";
import { isUuid } from "@/lib/utils";
import { track } from "@/services/analytics";
import type { Collection } from "@/types/domain";

const NameSchema = z.string().trim().min(1, "Donne un nom à ta collection.").max(60, "60 caractères maximum.");
const EmojiSchema = z
  .string()
  .trim()
  .max(16)
  .transform((e) => e || "✨");

export async function createCollectionAction(
  name: string,
  emoji: string,
  addItemId?: string,
): Promise<ActionResult & { collection?: Collection }> {
  const parsedName = NameSchema.safeParse(name);
  if (!parsedName.success) return { ok: false, error: parsedName.error.issues[0].message };
  const { store, plan, user } = await getAppContext();
  const limit = limitsFor(plan).maxCollections;
  if ((await store.listCollections()).length >= limit) {
    await track(user.id, "paywall_viewed", { reason: "collections_limit" });
    return { ok: false, error: limit === 0 ? "Un abonnement est nécessaire pour créer des collections." : `Tu as atteint la limite de ${limit} collections.`, code: "limit" };
  }
  const collection = await store.createCollection(parsedName.data, EmojiSchema.parse(emoji));
  await track(user.id, "collection_created", {});
  if (addItemId && isUuid(addItemId)) {
    const added = await setItemCollectionAction(addItemId, collection.id, true);
    if (!added.ok) return added;
  }
  revalidatePath("/", "layout");
  return { ok: true, collection, message: "Collection créée" };
}

export async function updateCollectionAction(id: string, name: string, emoji: string): Promise<ActionResult> {
  const parsedName = NameSchema.safeParse(name);
  if (!parsedName.success) return { ok: false, error: parsedName.error.issues[0].message };
  if (!isUuid(id)) return { ok: false, error: "Collection introuvable." };
  const { store } = await getAppContext();
  await store.updateCollection(id, { name: parsedName.data, emoji: EmojiSchema.parse(emoji) });
  revalidatePath("/", "layout");
  return { ok: true, message: "Collection renommée" };
}

export async function deleteCollectionAction(id: string): Promise<void> {
  if (isUuid(id)) {
    const { store } = await getAppContext();
    await store.deleteCollection(id);
  }
  revalidatePath("/", "layout");
  redirect("/collections");
}

export async function listCollectionsAction(): Promise<Collection[]> {
  const { store } = await getAppContext();
  return store.listCollections();
}
