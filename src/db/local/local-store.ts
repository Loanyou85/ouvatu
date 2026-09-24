import "server-only";
import type { Category } from "@/config/categories";
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
import { newId, nowIso } from "@/lib/utils";
import { scoreItem } from "@/services/search/local-score";
import type {
  AnalyticsEvent,
  Collection,
  ContentItem,
  ItemFilter,
  SavedEntry,
  SavedListType,
  SavedStatus,
  Source,
  UserProfile,
} from "@/types/domain";
import { getLocalDb, mutateLocalDb, type LocalDb, type LocalItem } from "./db";

function withCollections(db: LocalDb, item: LocalItem): ContentItem {
  return {
    ...item,
    collectionIds: db.collectionItems.filter((ci) => ci.contentItemId === item.id).map((ci) => ci.collectionId),
  };
}

function toCollection(db: LocalDb, c: LocalDb["collections"][number]): Collection {
  const links = db.collectionItems
    .filter((ci) => ci.collectionId === c.id)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const covers = links
    .map((l) => db.items.find((i) => i.id === l.contentItemId)?.imageUrl)
    .filter((u): u is string => Boolean(u))
    .slice(0, 4);
  return {
    id: c.id,
    userId: c.userId,
    name: c.name,
    emoji: c.emoji,
    itemCount: links.length,
    coverImages: covers,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function publicProfile(user: LocalDb["users"][number]): UserProfile {
  const { passwordHash: _ignored, ...profile } = user;
  void _ignored;
  return profile;
}

export class LocalUserStore implements UserDataStore {
  constructor(readonly userId: string) {}

  private get db() {
    return getLocalDb();
  }

  async getProfile() {
    const user = this.db.users.find((u) => u.id === this.userId);
    return user ? publicProfile(user) : null;
  }

  async updateProfile(patch: Partial<Pick<UserProfile, "name" | "avatarUrl" | "onboardingCompleted" | "interests">>) {
    mutateLocalDb((db) => {
      const user = db.users.find((u) => u.id === this.userId);
      if (user) Object.assign(user, patch);
    });
  }

  async incrementAnalysisCount() {
    mutateLocalDb((db) => {
      const user = db.users.find((u) => u.id === this.userId);
      if (user) user.analysisCount += 1;
    });
  }

  async getSubscription() {
    return this.db.subscriptions.find((s) => s.userId === this.userId) ?? null;
  }

  async createSource(input: NewSource): Promise<Source> {
    const source: Source = {
      id: newId(),
      userId: this.userId,
      url: input.url,
      platform: input.platform,
      title: input.title ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      author: input.author ?? null,
      publishedAt: input.publishedAt ?? null,
      importedAt: nowIso(),
      rawMetadata: input.rawMetadata ?? {},
      analysisStatus: "pending",
      analysisStep: 0,
      analysisError: null,
      inputChannel: input.inputChannel,
      contentItemId: null,
    };
    mutateLocalDb((db) => db.sources.push(source));
    return source;
  }

  async updateSource(id: string, patch: SourcePatch) {
    mutateLocalDb((db) => {
      const source = db.sources.find((s) => s.id === id && s.userId === this.userId);
      if (source) Object.assign(source, patch);
    });
  }

  async getSource(id: string) {
    return this.db.sources.find((s) => s.id === id && s.userId === this.userId) ?? null;
  }

  async countSourcesSince(sinceIso: string) {
    return this.db.sources.filter((s) => s.userId === this.userId && s.importedAt >= sinceIso).length;
  }

  async createItem(input: NewContentItem): Promise<ContentItem> {
    const now = nowIso();
    const item: LocalItem = {
      id: newId(),
      userId: this.userId,
      sourceId: input.sourceId,
      category: input.category,
      confidence: input.confidence,
      title: input.title,
      summary: input.summary,
      imageUrl: input.imageUrl,
      tags: input.tags,
      entities: input.entities,
      data: input.data,
      userData: {},
      isSaved: input.isSaved ?? false,
      isFavorite: false,
      isExample: input.isExample ?? false,
      sourceUrl: input.sourceUrl,
      sourcePlatform: input.sourcePlatform,
      sourceAuthor: input.sourceAuthor,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
    mutateLocalDb((db) => db.items.push(item));
    return { ...item, collectionIds: [] };
  }

  async getItem(id: string) {
    const item = this.db.items.find((i) => i.id === id && i.userId === this.userId);
    return item ? withCollections(this.db, item) : null;
  }

  async listItems(filter: ItemFilter = {}) {
    const db = this.db;
    let items = db.items.filter((i) => i.userId === this.userId);
    if (filter.savedOnly !== false) items = items.filter((i) => i.isSaved);
    if (filter.categories?.length) items = items.filter((i) => filter.categories!.includes(i.category));
    if (filter.favoritesOnly) items = items.filter((i) => i.isFavorite);
    if (filter.since) items = items.filter((i) => i.createdAt >= filter.since!);
    if (filter.collectionId) {
      const ids = new Set(db.collectionItems.filter((ci) => ci.collectionId === filter.collectionId).map((ci) => ci.contentItemId));
      items = items.filter((i) => ids.has(i.id));
    }
    items = [...items].sort((a, b) =>
      filter.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
    );
    if (filter.limit) items = items.slice(0, filter.limit);
    return items.map((i) => withCollections(db, i));
  }

  async updateItem(id: string, patch: ItemPatch) {
    mutateLocalDb((db) => {
      const item = db.items.find((i) => i.id === id && i.userId === this.userId);
      if (item) Object.assign(item, patch, { updatedAt: nowIso() });
    });
  }

  async deleteItem(id: string) {
    mutateLocalDb((db) => {
      db.items = db.items.filter((i) => !(i.id === id && i.userId === this.userId));
      db.collectionItems = db.collectionItems.filter((ci) => ci.contentItemId !== id);
      db.saved = db.saved.filter((s) => s.contentItemId !== id);
      db.shopping.forEach((s) => {
        if (s.contentItemId === id) s.contentItemId = null;
      });
      db.sources.forEach((s) => {
        if (s.contentItemId === id) s.contentItemId = null;
      });
    });
  }

  async countSavedItems() {
    return this.db.items.filter((i) => i.userId === this.userId && i.isSaved).length;
  }

  async categoryCounts() {
    const counts: Partial<Record<Category, number>> = {};
    for (const item of this.db.items) {
      if (item.userId !== this.userId || !item.isSaved) continue;
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }

  async search(params: SearchParams) {
    const db = this.db;
    return db.items
      .filter((i) => i.userId === this.userId && i.isSaved)
      .filter((i) => !params.categories || params.categories.includes(i.category))
      .filter((i) => {
        if (params.maxTotalMinutes == null) return true;
        return (
          i.data.category === "RECIPES" &&
          i.data.recipe.totalMinutes != null &&
          i.data.recipe.totalMinutes <= params.maxTotalMinutes
        );
      })
      .map((i) => ({ item: i, score: scoreItem(withCollections(db, i), params.terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt))
      .slice(0, params.limit)
      .map((r) => withCollections(db, r.item));
  }

  async listCollections() {
    const db = this.db;
    return db.collections
      .filter((c) => c.userId === this.userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((c) => toCollection(db, c));
  }

  async getCollection(id: string) {
    const c = this.db.collections.find((x) => x.id === id && x.userId === this.userId);
    return c ? toCollection(this.db, c) : null;
  }

  async createCollection(name: string, emoji: string) {
    const now = nowIso();
    const c = { id: newId(), userId: this.userId, name, emoji, createdAt: now, updatedAt: now };
    mutateLocalDb((db) => db.collections.push(c));
    return toCollection(this.db, c);
  }

  async updateCollection(id: string, patch: { name?: string; emoji?: string }) {
    mutateLocalDb((db) => {
      const c = db.collections.find((x) => x.id === id && x.userId === this.userId);
      if (c) Object.assign(c, patch, { updatedAt: nowIso() });
    });
  }

  async deleteCollection(id: string) {
    mutateLocalDb((db) => {
      db.collections = db.collections.filter((c) => !(c.id === id && c.userId === this.userId));
      db.collectionItems = db.collectionItems.filter((ci) => ci.collectionId !== id);
    });
  }

  async addToCollection(collectionId: string, itemId: string) {
    mutateLocalDb((db) => {
      const owned =
        db.collections.some((c) => c.id === collectionId && c.userId === this.userId) &&
        db.items.some((i) => i.id === itemId && i.userId === this.userId);
      if (!owned) return;
      if (db.collectionItems.some((ci) => ci.collectionId === collectionId && ci.contentItemId === itemId)) return;
      db.collectionItems.push({ collectionId, contentItemId: itemId, userId: this.userId, addedAt: nowIso() });
      const c = db.collections.find((x) => x.id === collectionId);
      if (c) c.updatedAt = nowIso();
    });
  }

  async removeFromCollection(collectionId: string, itemId: string) {
    mutateLocalDb((db) => {
      db.collectionItems = db.collectionItems.filter(
        (ci) => !(ci.collectionId === collectionId && ci.contentItemId === itemId && ci.userId === this.userId),
      );
    });
  }

  async listSaved(listType?: SavedListType) {
    return this.db.saved
      .filter((s) => s.userId === this.userId && (!listType || s.listType === listType))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async upsertSaved(entry: NewSavedEntry) {
    mutateLocalDb((db) => {
      const exists = db.saved.find(
        (s) =>
          s.userId === this.userId &&
          s.listType === entry.listType &&
          s.contentItemId === entry.contentItemId &&
          s.entityRef === entry.entityRef,
      );
      if (exists) return;
      const saved: SavedEntry = { ...entry, id: newId(), userId: this.userId, status: "todo", createdAt: nowIso() };
      db.saved.push(saved);
    });
  }

  async setSavedStatus(id: string, status: SavedStatus) {
    mutateLocalDb((db) => {
      const s = db.saved.find((x) => x.id === id && x.userId === this.userId);
      if (s) s.status = status;
    });
  }

  async removeSaved(id: string) {
    mutateLocalDb((db) => {
      db.saved = db.saved.filter((s) => !(s.id === id && s.userId === this.userId));
    });
  }

  async removeSavedByRef(listType: SavedListType, contentItemId: string, entityRef: number | null) {
    mutateLocalDb((db) => {
      db.saved = db.saved.filter(
        (s) =>
          !(
            s.userId === this.userId &&
            s.listType === listType &&
            s.contentItemId === contentItemId &&
            s.entityRef === entityRef
          ),
      );
    });
  }

  async listShopping() {
    return this.db.shopping
      .filter((s) => s.userId === this.userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async addShopping(items: NewShoppingItem[]) {
    mutateLocalDb((db) => {
      for (const item of items) {
        db.shopping.push({ ...item, id: newId(), userId: this.userId, checked: false, createdAt: nowIso() });
      }
    });
  }

  async setShoppingChecked(id: string, checked: boolean) {
    mutateLocalDb((db) => {
      const s = db.shopping.find((x) => x.id === id && x.userId === this.userId);
      if (s) s.checked = checked;
    });
  }

  async removeShopping(id: string) {
    mutateLocalDb((db) => {
      db.shopping = db.shopping.filter((s) => !(s.id === id && s.userId === this.userId));
    });
  }

  async clearCheckedShopping() {
    mutateLocalDb((db) => {
      db.shopping = db.shopping.filter((s) => !(s.userId === this.userId && s.checked));
    });
  }

  async exportAll() {
    const db = this.db;
    const mine = <T extends { userId: string | null }>(rows: T[]) => rows.filter((r) => r.userId === this.userId);
    return {
      profile: await this.getProfile(),
      subscription: await this.getSubscription(),
      sources: mine(db.sources),
      items: mine(db.items),
      collections: mine(db.collections),
      collectionItems: mine(db.collectionItems),
      savedItems: mine(db.saved),
      shoppingList: mine(db.shopping),
    };
  }
}

export class LocalAdminStore implements AdminDataStore {
  async trackEvent(userId: string | null, event: AnalyticsEvent, props: Record<string, unknown> = {}) {
    mutateLocalDb((db) => db.events.push({ userId, event, props, createdAt: nowIso() }));
  }

  async upsertSubscription(input: SubscriptionUpsert) {
    mutateLocalDb((db) => {
      const existing = db.subscriptions.find((s) => s.userId === input.userId);
      const next = { ...input, updatedAt: nowIso() };
      if (existing) Object.assign(existing, next);
      else db.subscriptions.push(next);
      const user = db.users.find((u) => u.id === input.userId);
      if (user) user.plan = input.status === "active" || input.status === "trialing" ? "PREMIUM" : "FREE";
    });
  }

  async findUserIdByStripeCustomer(customerId: string) {
    return getLocalDb().subscriptions.find((s) => s.stripeCustomerId === customerId)?.userId ?? null;
  }

  async getStripeCustomerId(userId: string) {
    return getLocalDb().subscriptions.find((s) => s.userId === userId)?.stripeCustomerId ?? null;
  }

  async deleteUser(userId: string) {
    mutateLocalDb((db) => {
      const itemIds = new Set(db.items.filter((i) => i.userId === userId).map((i) => i.id));
      db.users = db.users.filter((u) => u.id !== userId);
      db.subscriptions = db.subscriptions.filter((s) => s.userId !== userId);
      db.sources = db.sources.filter((s) => s.userId !== userId);
      db.items = db.items.filter((i) => i.userId !== userId);
      db.collections = db.collections.filter((c) => c.userId !== userId);
      db.collectionItems = db.collectionItems.filter((ci) => ci.userId !== userId && !itemIds.has(ci.contentItemId));
      db.saved = db.saved.filter((s) => s.userId !== userId);
      db.shopping = db.shopping.filter((s) => s.userId !== userId);
      db.events.forEach((e) => {
        if (e.userId === userId) e.userId = null;
      });
    });
  }

  async overview(): Promise<AdminOverview> {
    const db = getLocalDb();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const sources = [...db.sources].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    const eventCounts: AdminOverview["eventCounts"] = {};
    for (const e of db.events) {
      const key = e.event as AnalyticsEvent;
      eventCounts[key] = (eventCounts[key] ?? 0) + 1;
    }
    return {
      users: [...db.users]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50)
        .map((u) => ({ id: u.id, email: u.email, plan: u.plan, createdAt: u.createdAt, analysisCount: u.analysisCount })),
      totals: {
        users: db.users.length,
        premium: db.users.filter((u) => u.plan === "PREMIUM").length,
        analyses: db.sources.length,
        failedAnalyses: db.sources.filter((s) => s.analysisStatus === "failed").length,
        analyses7d: db.sources.filter((s) => s.importedAt >= weekAgo).length,
      },
      recentSources: sources.slice(0, 20),
      recentErrors: sources.filter((s) => s.analysisStatus === "failed").slice(0, 20),
      recentItems: [...db.items]
        .filter((i) => !i.isExample)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20),
      subscriptions: db.subscriptions,
      eventCounts,
    };
  }
}
