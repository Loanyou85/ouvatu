"use server";

import { revalidatePath } from "next/cache";
import { exampleItems } from "@/db/seed";
import { examplesEnabled } from "@/lib/env";
import { getAppContext } from "@/features/auth/context";

/** Adds the example inspirations to the current user's space (dev / demo). */
export async function loadExamplesAction(): Promise<void> {
  if (!examplesEnabled) return;
  const { store } = await getAppContext();
  const existing = await store.listItems({ savedOnly: false });
  if (existing.some((i) => i.isExample)) return;
  for (const item of exampleItems()) await store.createItem(item);
  const collection = await store.createCollection("Lisbonne", "🇵🇹");
  const lisbon = (await store.listItems()).find((i) => i.isExample && i.category === "TRAVEL");
  if (lisbon) await store.addToCollection(collection.id, lisbon.id);
  revalidatePath("/", "layout");
}
