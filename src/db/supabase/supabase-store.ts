import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreItem } from "@/services/search/local-score";
import type { Category } from "@/config/categories";
import type { PlanId } from "@/config/plans";
import type {
  AdminDataStore,
  AdminOverview,
  ItemPatch,
  NewContentItem,
  NewSavedEntry,
  NewShoppingItem,
  NewSource,
  SearchParams,
  SourcePatch,
  SubscriptionUpsert,
  UserDataStore,
} from "@/db/types";
import type {
  AnalyticsEvent,
  Collection,
  ContentItem,
  ItemFilter,
  SavedEntry,
  SavedListType,
  SavedStatus,
  ShoppingListItem,
  Source,
  Subscription,
  UserProfile,
} from "@/types/domain";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come untyped from PostgREST and are mapped explicitly below */
type Row = Record<string, any>;

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`[supabase] ${result.error.message}`);
  return result.data;
}

const mapProfile = (r: Row): UserProfile => ({
  id: r.id,
  email: r.email,
  name: r.name,
  avatarUrl: r.avatar_url,
  plan: r.plan as PlanId,
  createdAt: r.created_at,
  onboardingCompleted: r.onboarding_completed,
  interests: r.interests ?? [],
  analysisCount: r.analysis_count ?? 0,
});

const mapSubscription = (r: Row): Subscription => ({
  userId: r.user_id,
  stripeCustomerId: r.stripe_customer_id,
  stripeSubscriptionId: r.stripe_subscription_id,
  status: r.status,
  interval: r.interval,
  currentPeriodEnd: r.current_period_end,
  cancelAtPeriodEnd: r.cancel_at_period_end,
  updatedAt: r.updated_at,
});

const mapSource = (r: Row): Source => ({
  id: r.id,
  userId: r.user_id,
  url: r.url,
  platform: r.platform,
  title: r.title,
  thumbnailUrl: r.thumbnail_url,
  author: r.author,
  publishedAt: r.published_at,
  importedAt: r.imported_at,
  rawMetadata: r.raw_metadata ?? {},
  analysisStatus: r.analysis_status,
  analysisStep: r.analysis_step,
  analysisError: r.analysis_error,
  inputChannel: r.input_channel,
  contentItemId: r.content_item_id,
});

const ITEM_COLUMNS =
  "id,user_id,source_id,category,confidence,title,summary,image_url,tags,entities,data,user_data,is_saved,is_favorite,is_example,source_url,source_platform,source_author,created_at,updated_at";

const mapItem = (r: Row): ContentItem => ({
  id: r.id,
  userId: r.user_id,
  sourceId: r.source_id,
  category: r.category,
  confidence: r.confidence,
  title: r.title,
  summary: r.summary,
  imageUrl: r.image_url,
  tags: r.tags ?? [],
  entities: r.entities ?? [],
  data: r.data,
  userData: r.user_data ?? {},
  isSaved: r.is_saved,
  isFavorite: r.is_favorite,
  isExample: r.is_example,
  sourceUrl: r.source_url,
  sourcePlatform: r.source_platform,
  sourceAuthor: r.source_author,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  collectionIds: Array.isArray(r.collection_items) ? r.collection_items.map((c: Row) => c.collection_id) : [],
});

const mapSaved = (r: Row): SavedEntry => ({
  id: r.id,
  userId: r.user_id,
  listType: r.list_type,
  contentItemId: r.content_item_id,
  entityRef: r.entity_ref,
  label: r.label,
  subtitle: r.subtitle,
  imageUrl: r.image_url,
  status: r.status,
  createdAt: r.created_at,
});

const mapShopping = (r: Row): ShoppingListItem => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  quantity: r.quantity == null ? null : Number(r.quantity),
  unit: r.unit,
  checked: r.checked,
  contentItemId: r.content_item_id,
  recipeTitle: r.recipe_title,
  createdAt: r.created_at,
});

function mapCollection(r: Row): Collection {
  const links: Row[] = [...(r.collection_items ?? [])].sort((a, b) => String(b.added_at).localeCompare(String(a.added_at)));
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    emoji: r.emoji,
    itemCount: links.length,
    coverImages: links
      .map((l) => l.content_items?.image_url as string | null)
      .filter((u): u is string => Boolean(u))
      .slice(0, 4),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * `trusted` = the client uses the service role (server-side only). Every query
 * below is explicitly filtered on this.userId, so the store never reads or
 * writes another user's rows even though RLS is bypassed. RPCs that rely on
 * auth.uid() are replaced by equivalent user-filtered queries in that mode.
 */
export class SupabaseUserStore implements UserDataStore {
  constructor(
    private readonly sb: SupabaseClient,
    readonly userId: string,
    private readonly trusted = false,
  ) {}

  async getProfile() {
    const data = check(await this.sb.from("users").select("*").eq("id", this.userId).maybeSingle());
    return data ? mapProfile(data) : null;
  }

  async updateProfile(patch: Partial<Pick<UserProfile, "name" | "avatarUrl" | "onboardingCompleted" | "interests">>) {
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
    if (patch.onboardingCompleted !== undefined) row.onboarding_completed = patch.onboardingCompleted;
    if (patch.interests !== undefined) row.interests = patch.interests;
    check(await this.sb.from("users").update(row).eq("id", this.userId));
  }

  async incrementAnalysisCount() {
    if (!this.trusted) {
      check(await this.sb.rpc("increment_analysis_count"));
      return;
    }
    const row = check(await this.sb.from("users").select("analysis_count").eq("id", this.userId).maybeSingle()) as Row | null;
    check(
      await this.sb
        .from("users")
        .update({ analysis_count: Number(row?.analysis_count ?? 0) + 1 })
        .eq("id", this.userId),
    );
  }

  async getSubscription() {
    const data = check(await this.sb.from("subscriptions").select("*").eq("user_id", this.userId).maybeSingle());
    return data ? mapSubscription(data) : null;
  }

  async createSource(input: NewSource) {
    const data = check(
      await this.sb
        .from("sources")
        .insert({
          user_id: this.userId,
          url: input.url,
          platform: input.platform,
          input_channel: input.inputChannel,
          title: input.title ?? null,
          thumbnail_url: input.thumbnailUrl ?? null,
          author: input.author ?? null,
          published_at: input.publishedAt ?? null,
          raw_metadata: input.rawMetadata ?? {},
        })
        .select("*")
        .single(),
    );
    return mapSource(data);
  }

  async updateSource(id: string, patch: SourcePatch) {
    const row: Row = {};
    const keys: [keyof SourcePatch, string][] = [
      ["title", "title"],
      ["thumbnailUrl", "thumbnail_url"],
      ["author", "author"],
      ["publishedAt", "published_at"],
      ["rawMetadata", "raw_metadata"],
      ["analysisStatus", "analysis_status"],
      ["analysisStep", "analysis_step"],
      ["analysisError", "analysis_error"],
      ["contentItemId", "content_item_id"],
    ];
    for (const [key, column] of keys) if (patch[key] !== undefined) row[column] = patch[key];
    check(await this.sb.from("sources").update(row).eq("id", id).eq("user_id", this.userId));
  }

  async getSource(id: string) {
    const data = check(await this.sb.from("sources").select("*").eq("id", id).eq("user_id", this.userId).maybeSingle());
    return data ? mapSource(data) : null;
  }

  async countSourcesSince(sinceIso: string) {
    const { count, error } = await this.sb
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("user_id", this.userId)
      .gte("imported_at", sinceIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async createItem(input: NewContentItem) {
    const data = check(
      await this.sb
        .from("content_items")
        .insert({
          user_id: this.userId,
          source_id: input.sourceId,
          category: input.category,
          confidence: input.confidence,
          title: input.title,
          summary: input.summary,
          image_url: input.imageUrl,
          tags: input.tags,
          entities: input.entities,
          data: input.data,
          is_saved: input.isSaved ?? false,
          is_example: input.isExample ?? false,
          source_url: input.sourceUrl,
          source_platform: input.sourcePlatform,
          source_author: input.sourceAuthor,
          ...(input.createdAt ? { created_at: input.createdAt } : {}),
        })
        .select(ITEM_COLUMNS)
        .single(),
    );
    return mapItem(data as Row);
  }

  async getItem(id: string) {
    const data = check(
      await this.sb
        .from("content_items")
        .select(`${ITEM_COLUMNS},collection_items(collection_id)`)
        .eq("id", id)
        .eq("user_id", this.userId)
        .maybeSingle(),
    );
    return data ? mapItem(data) : null;
  }

  async listItems(filter: ItemFilter = {}) {
    let query = this.sb
      .from("content_items")
      .select(`${ITEM_COLUMNS},collection_items(collection_id)`)
      .eq("user_id", this.userId);
    if (filter.savedOnly !== false) query = query.eq("is_saved", true);
    if (filter.categories?.length) query = query.in("category", filter.categories);
    if (filter.favoritesOnly) query = query.eq("is_favorite", true);
    if (filter.since) query = query.gte("created_at", filter.since);
    if (filter.collectionId) {
      const links = check(
        await this.sb
          .from("collection_items")
          .select("content_item_id")
          .eq("collection_id", filter.collectionId)
          .eq("user_id", this.userId),
      ) as Row[];
      if (links.length === 0) return [];
      query = query.in(
        "id",
        links.map((l) => l.content_item_id),
      );
    }
    query = query.order("created_at", { ascending: filter.sort === "oldest" });
    if (filter.limit) query = query.limit(filter.limit);
    return (check(await query) as Row[]).map(mapItem);
  }

  async updateItem(id: string, patch: ItemPatch) {
    const row: Row = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.isSaved !== undefined) row.is_saved = patch.isSaved;
    if (patch.isFavorite !== undefined) row.is_favorite = patch.isFavorite;
    if (patch.userData !== undefined) row.user_data = patch.userData;
    if (patch.data !== undefined) row.data = patch.data;
    if (patch.category !== undefined) row.category = patch.category;
    if (patch.entities !== undefined) row.entities = patch.entities;
    check(await this.sb.from("content_items").update(row).eq("id", id).eq("user_id", this.userId));
  }

  async deleteItem(id: string) {
    check(await this.sb.from("content_items").delete().eq("id", id).eq("user_id", this.userId));
  }

  async countSavedItems() {
    const { count, error } = await this.sb
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", this.userId)
      .eq("is_saved", true);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async categoryCounts() {
    const rows = check(
      await this.sb.from("content_items").select("category").eq("user_id", this.userId).eq("is_saved", true),
    ) as Row[];
    const counts: Partial<Record<Category, number>> = {};
    for (const r of rows) counts[r.category as Category] = (counts[r.category as Category] ?? 0) + 1;
    return counts;
  }

  async search(params: SearchParams) {
    if (this.trusted) return this.searchInApp(params);
    const rows = check(
      await this.sb.rpc("search_content_items", {
        terms: params.terms,
        cats: params.categories,
        max_total_minutes: params.maxTotalMinutes,
        max_results: params.limit,
      }),
    ) as Row[];
    return rows.map(mapItem);
  }

  /** Same ranking as the SQL function, computed in the app (service-role mode). */
  private async searchInApp(params: SearchParams) {
    let query = this.sb
      .from("content_items")
      .select(`${ITEM_COLUMNS},collection_items(collection_id)`)
      .eq("user_id", this.userId)
      .eq("is_saved", true);
    if (params.categories?.length) query = query.in("category", params.categories);
    const rows = (check(await query.order("created_at", { ascending: false }).limit(1000)) as Row[]).map(mapItem);
    return rows
      .filter((i) => {
        if (params.maxTotalMinutes == null) return true;
        return i.data.category === "RECIPES" && i.data.recipe.totalMinutes != null && i.data.recipe.totalMinutes <= params.maxTotalMinutes;
      })
      .map((item) => ({ item, score: scoreItem(item, params.terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt))
      .slice(0, params.limit)
      .map((r) => r.item);
  }

  async listCollections() {
    const rows = check(
      await this.sb
        .from("collections")
        .select("*, collection_items(added_at, content_items(image_url))")
        .eq("user_id", this.userId)
        .order("updated_at", { ascending: false }),
    ) as Row[];
    return rows.map(mapCollection);
  }

  async getCollection(id: string) {
    const row = check(
      await this.sb
        .from("collections")
        .select("*, collection_items(added_at, content_items(image_url))")
        .eq("id", id)
        .eq("user_id", this.userId)
        .maybeSingle(),
    );
    return row ? mapCollection(row) : null;
  }

  async createCollection(name: string, emoji: string) {
    const row = check(
      await this.sb.from("collections").insert({ user_id: this.userId, name, emoji }).select("*").single(),
    );
    return mapCollection(row);
  }

  async updateCollection(id: string, patch: { name?: string; emoji?: string }) {
    check(await this.sb.from("collections").update(patch).eq("id", id).eq("user_id", this.userId));
  }

  async deleteCollection(id: string) {
    check(await this.sb.from("collections").delete().eq("id", id).eq("user_id", this.userId));
  }

  async addToCollection(collectionId: string, itemId: string) {
    check(
      await this.sb
        .from("collection_items")
        .upsert(
          { collection_id: collectionId, content_item_id: itemId, user_id: this.userId },
          { onConflict: "collection_id,content_item_id", ignoreDuplicates: true },
        ),
    );
    check(
      await this.sb
        .from("collections")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", collectionId)
        .eq("user_id", this.userId),
    );
  }

  async removeFromCollection(collectionId: string, itemId: string) {
    check(
      await this.sb
        .from("collection_items")
        .delete()
        .eq("collection_id", collectionId)
        .eq("content_item_id", itemId)
        .eq("user_id", this.userId),
    );
  }

  async listSaved(listType?: SavedListType) {
    let query = this.sb.from("saved_items").select("*").eq("user_id", this.userId);
    if (listType) query = query.eq("list_type", listType);
    return (check(await query.order("created_at", { ascending: false })) as Row[]).map(mapSaved);
  }

  async upsertSaved(entry: NewSavedEntry) {
    const existing = (await this.listSaved(entry.listType)).find(
      (s) => s.contentItemId === entry.contentItemId && s.entityRef === entry.entityRef,
    );
    if (existing) return;
    check(
      await this.sb.from("saved_items").insert({
        user_id: this.userId,
        list_type: entry.listType,
        content_item_id: entry.contentItemId,
        entity_ref: entry.entityRef,
        label: entry.label,
        subtitle: entry.subtitle,
        image_url: entry.imageUrl,
      }),
    );
  }

  async setSavedStatus(id: string, status: SavedStatus) {
    check(await this.sb.from("saved_items").update({ status }).eq("id", id).eq("user_id", this.userId));
  }

  async removeSaved(id: string) {
    check(await this.sb.from("saved_items").delete().eq("id", id).eq("user_id", this.userId));
  }

  async removeSavedByRef(listType: SavedListType, contentItemId: string, entityRef: number | null) {
    let query = this.sb
      .from("saved_items")
      .delete()
      .eq("user_id", this.userId)
      .eq("list_type", listType)
      .eq("content_item_id", contentItemId);
    query = entityRef == null ? query.is("entity_ref", null) : query.eq("entity_ref", entityRef);
    check(await query);
  }

  async listShopping() {
    return (
      check(
        await this.sb
          .from("shopping_list_items")
          .select("*")
          .eq("user_id", this.userId)
          .order("created_at", { ascending: true }),
      ) as Row[]
    ).map(mapShopping);
  }

  async addShopping(items: NewShoppingItem[]) {
    if (items.length === 0) return;
    check(
      await this.sb.from("shopping_list_items").insert(
        items.map((i) => ({
          user_id: this.userId,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          content_item_id: i.contentItemId,
          recipe_title: i.recipeTitle,
        })),
      ),
    );
  }

  async setShoppingChecked(id: string, checked: boolean) {
    check(await this.sb.from("shopping_list_items").update({ checked }).eq("id", id).eq("user_id", this.userId));
  }

  async removeShopping(id: string) {
    check(await this.sb.from("shopping_list_items").delete().eq("id", id).eq("user_id", this.userId));
  }

  async clearCheckedShopping() {
    check(await this.sb.from("shopping_list_items").delete().eq("user_id", this.userId).eq("checked", true));
  }

  async exportAll() {
    const tables = ["sources", "content_items", "collections", "collection_items", "saved_items", "shopping_list_items", "usage_events"];
    const out: Record<string, unknown> = {
      profile: await this.getProfile(),
      subscription: await this.getSubscription(),
    };
    for (const table of tables) {
      const { data } = await this.sb
        .from(table)
        .select(table === "content_items" ? ITEM_COLUMNS : "*")
        .eq("user_id", this.userId);
      out[table] = data ?? [];
    }
    return out;
  }
}

export class SupabaseAdminStore implements AdminDataStore {
  constructor(private readonly sb: SupabaseClient) {}

  async trackEvent(userId: string | null, event: AnalyticsEvent, props: Record<string, unknown> = {}) {
    check(await this.sb.from("usage_events").insert({ user_id: userId, event, props }));
  }

  async upsertSubscription(input: SubscriptionUpsert) {
    check(
      await this.sb.from("subscriptions").upsert(
        {
          user_id: input.userId,
          stripe_customer_id: input.stripeCustomerId,
          stripe_subscription_id: input.stripeSubscriptionId,
          status: input.status,
          interval: input.interval,
          current_period_end: input.currentPeriodEnd,
          cancel_at_period_end: input.cancelAtPeriodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      ),
    );
  }

  async findUserIdByStripeCustomer(customerId: string) {
    const row = check(
      await this.sb.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle(),
    );
    return (row?.user_id as string | undefined) ?? null;
  }

  async getStripeCustomerId(userId: string) {
    const row = check(
      await this.sb.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).maybeSingle(),
    );
    return (row?.stripe_customer_id as string | undefined) ?? null;
  }

  async deleteUser(userId: string) {
    // Cascades through public.users to every user-owned table.
    const { error } = await this.sb.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  }

  async overview(): Promise<AdminOverview> {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const count = async (table: string, apply?: (q: any) => any) => {
      let q = this.sb.from(table).select("*", { count: "exact", head: true });
      if (apply) q = apply(q);
      const { count: c } = await q;
      return c ?? 0;
    };
    const [users, recentSources, recentErrors, recentItems, subscriptions, events] = await Promise.all([
      this.sb.from("users").select("id,email,plan,created_at,analysis_count").order("created_at", { ascending: false }).limit(50),
      this.sb.from("sources").select("id,url,platform,analysis_status,analysis_error,imported_at").order("imported_at", { ascending: false }).limit(20),
      this.sb
        .from("sources")
        .select("id,url,platform,analysis_error,imported_at")
        .eq("analysis_status", "failed")
        .order("imported_at", { ascending: false })
        .limit(20),
      this.sb.from("content_items").select("id,title,category,created_at").eq("is_example", false).order("created_at", { ascending: false }).limit(20),
      this.sb.from("subscriptions").select("*").order("updated_at", { ascending: false }).limit(100),
      this.sb.from("usage_events").select("event").gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).limit(10000),
    ]);
    const eventCounts: AdminOverview["eventCounts"] = {};
    for (const e of (events.data ?? []) as Row[]) {
      const key = e.event as AnalyticsEvent;
      eventCounts[key] = (eventCounts[key] ?? 0) + 1;
    }
    return {
      users: ((users.data ?? []) as Row[]).map((u) => ({
        id: u.id,
        email: u.email,
        plan: u.plan,
        createdAt: u.created_at,
        analysisCount: u.analysis_count,
      })),
      totals: {
        users: await count("users"),
        premium: await count("users", (q) => q.eq("plan", "PREMIUM")),
        analyses: await count("sources"),
        failedAnalyses: await count("sources", (q) => q.eq("analysis_status", "failed")),
        analyses7d: await count("sources", (q) => q.gte("imported_at", weekAgo)),
      },
      recentSources: ((recentSources.data ?? []) as Row[]).map((r) => ({
        id: r.id,
        url: r.url,
        platform: r.platform,
        analysisStatus: r.analysis_status,
        analysisError: r.analysis_error,
        importedAt: r.imported_at,
      })),
      recentErrors: ((recentErrors.data ?? []) as Row[]).map((r) => ({
        id: r.id,
        url: r.url,
        platform: r.platform,
        analysisError: r.analysis_error,
        importedAt: r.imported_at,
      })),
      recentItems: ((recentItems.data ?? []) as Row[]).map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        createdAt: r.created_at,
      })),
      subscriptions: ((subscriptions.data ?? []) as Row[]).map(mapSubscription),
      eventCounts,
    };
  }
}
