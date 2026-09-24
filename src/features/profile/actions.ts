"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminStore } from "@/db";
import { getAppContext } from "@/features/auth/context";
import type { ActionResult } from "@/features/items/actions";
import { isStripeConfigured } from "@/lib/env";
import { getStripe } from "@/services/billing/stripe";
import { signOut } from "@/services/users/auth";

export async function updateNameAction(name: string): Promise<ActionResult> {
  const parsed = z.string().trim().max(60).safeParse(name);
  if (!parsed.success) return { ok: false, error: "Nom invalide." };
  const { store } = await getAppContext();
  await store.updateProfile({ name: parsed.data || null });
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil mis à jour" };
}

/** RGPD: deletes the account and every piece of data attached to it. */
export async function deleteAccountAction(confirmation: string): Promise<ActionResult> {
  if (confirmation.trim().toUpperCase() !== "SUPPRIMER") return { ok: false, error: "Tape SUPPRIMER pour confirmer." };
  const { store, user } = await getAppContext();
  const admin = getAdminStore();
  if (!admin) return { ok: false, error: "Suppression momentanément indisponible. Contacte le support." };

  const subscription = await store.getSubscription();
  if (isStripeConfigured && subscription?.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(subscription.status)) {
    try {
      await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (error) {
      console.error("[account] could not cancel subscription before deletion", error);
      return { ok: false, error: "Impossible de résilier ton abonnement automatiquement. Résilie-le d'abord depuis « Gérer mon abonnement »." };
    }
  }
  await admin.deleteUser(user.id);
  await signOut();
  redirect("/?account_deleted=1");
}
