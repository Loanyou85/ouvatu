import "server-only";
import { cache } from "react";
import { LocalAdminStore, LocalUserStore } from "@/db/local/local-store";
import { SupabaseAdminStore, SupabaseUserStore } from "@/db/supabase/supabase-store";
import type { AdminDataStore, UserDataStore } from "@/db/types";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSessionUser } from "@/services/users/auth";

/** Data store scoped to the signed-in user. Redirects to /login when signed out. */
export const getUserStore = cache(async (): Promise<UserDataStore> => {
  const user = await requireSessionUser();
  if (isSupabaseConfigured) {
    return new SupabaseUserStore(await createSupabaseServerClient(), user.id);
  }
  return new LocalUserStore(user.id);
});

let adminStore: AdminDataStore | null = null;

/** Privileged store (service role). Server-only: webhooks, analytics, admin. */
export function getAdminStore(): AdminDataStore | null {
  if (adminStore) return adminStore;
  if (isSupabaseConfigured) {
    if (!env.supabaseServiceRoleKey) return null;
    adminStore = new SupabaseAdminStore(createSupabaseAdminClient());
  } else {
    adminStore = new LocalAdminStore();
  }
  return adminStore;
}

export const dataBackend = isSupabaseConfigured ? "supabase" : "local";
