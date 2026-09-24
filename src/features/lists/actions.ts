"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/features/auth/context";
import type { ActionResult } from "@/features/items/actions";
import { isUuid } from "@/lib/utils";

export async function setListStatusAction(entryId: string, done: boolean): Promise<ActionResult> {
  if (!isUuid(entryId)) return { ok: false, error: "Introuvable." };
  const { store } = await getAppContext();
  await store.setSavedStatus(entryId, done ? "done" : "todo");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeListEntryAction(entryId: string): Promise<ActionResult> {
  if (!isUuid(entryId)) return { ok: false, error: "Introuvable." };
  const { store } = await getAppContext();
  await store.removeSaved(entryId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Retiré de ta liste" };
}

export async function toggleShoppingAction(id: string, checked: boolean): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "Introuvable." };
  const { store } = await getAppContext();
  await store.setShoppingChecked(id, checked);
  revalidatePath("/lists");
  return { ok: true };
}

export async function removeShoppingAction(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "Introuvable." };
  const { store } = await getAppContext();
  await store.removeShopping(id);
  revalidatePath("/lists");
  return { ok: true };
}

export async function clearCheckedShoppingAction(): Promise<ActionResult> {
  const { store } = await getAppContext();
  await store.clearCheckedShopping();
  revalidatePath("/lists");
  return { ok: true, message: "Liste nettoyée" };
}
