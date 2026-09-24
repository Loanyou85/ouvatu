import type { Category } from "@/config/categories";
import type {
  AnalyticsEvent,
  Collection,
  ContentItem,
  ItemFilter,
  ItemUserData,
  SavedEntry,
  SavedListType,
  SavedStatus,
  ShoppingListItem,
  Source,
  Subscription,
  UserProfile,
} from "@/types/domain";
import type { StructuredData } from "@/types/schemas";
import type { Entity } from "@/types/domain";

export type NewSource = Pick<Source, "url" | "platform" | "inputChannel"> &
  Partial<Pick<Source, "title" | "thumbnailUrl" | "author" | "publishedAt" | "rawMetadata">>;

export type SourcePatch = Partial<
  Pick<
    Source,
    | "title"
    | "thumbnailUrl"
    | "author"
    | "publishedAt"
    | "rawMetadata"
    | "analysisStatus"
    | "analysisStep"
    | "analysisError"
    | "contentItemId"
  >
>;

export interface NewContentItem {
  sourceId: string | null;
  category: Category;
  confidence: number;
  title: string;
  summary: string;
  imageUrl: string | null;
  tags: string[];
  entities: Entity[];
  data: StructuredData;
  isSaved?: boolean;
  isExample?: boolean;
  sourceUrl: string | null;
  sourcePlatform: ContentItem["sourcePlatform"];
  sourceAuthor: string | null;
  createdAt?: string;
}

export type ItemPatch = Partial<{
  /** Structured content edited by the user (e.g. places added by hand). */
  data: StructuredData;
  entities: Entity[];
  title: string;
  isSaved: boolean;
  isFavorite: boolean;
  userData: ItemUserData;
}>;

export interface SearchParams {
  terms: string[];
  categories: Category[] | null;
  maxTotalMinutes: number | null;
  limit: number;
}

export interface NewSavedEntry {
  listType: SavedListType;
  contentItemId: string;
  entityRef: number | null;
  label: string;
  subtitle: string | null;
  imageUrl: string | null;
}

export interface NewShoppingItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  contentItemId: string | null;
  recipeTitle: string | null;
}

/**
 * Data access scoped to ONE authenticated user. Implementations must never
 * return or modify rows belonging to another user (enforced by RLS in Supabase).
 */
export interface UserDataStore {
  readonly userId: string;

  getProfile(): Promise<UserProfile | null>;
  updateProfile(patch: Partial<Pick<UserProfile, "name" | "avatarUrl" | "onboardingCompleted" | "interests">>): Promise<void>;
  incrementAnalysisCount(): Promise<void>;
  getSubscription(): Promise<Subscription | null>;

  createSource(input: NewSource): Promise<Source>;
  updateSource(id: string, patch: SourcePatch): Promise<void>;
  getSource(id: string): Promise<Source | null>;
  countSourcesSince(sinceIso: string): Promise<number>;

  createItem(input: NewContentItem): Promise<ContentItem>;
  getItem(id: string): Promise<ContentItem | null>;
  listItems(filter?: ItemFilter): Promise<ContentItem[]>;
  updateItem(id: string, patch: ItemPatch): Promise<void>;
  deleteItem(id: string): Promise<void>;
  countSavedItems(): Promise<number>;
  categoryCounts(): Promise<Partial<Record<Category, number>>>;
  search(params: SearchParams): Promise<ContentItem[]>;

  listCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | null>;
  createCollection(name: string, emoji: string): Promise<Collection>;
  updateCollection(id: string, patch: { name?: string; emoji?: string }): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  addToCollection(collectionId: string, itemId: string): Promise<void>;
  removeFromCollection(collectionId: string, itemId: string): Promise<void>;

  listSaved(listType?: SavedListType): Promise<SavedEntry[]>;
  upsertSaved(entry: NewSavedEntry): Promise<void>;
  setSavedStatus(id: string, status: SavedStatus): Promise<void>;
  removeSaved(id: string): Promise<void>;
  removeSavedByRef(listType: SavedListType, contentItemId: string, entityRef: number | null): Promise<void>;

  listShopping(): Promise<ShoppingListItem[]>;
  addShopping(items: NewShoppingItem[]): Promise<void>;
  setShoppingChecked(id: string, checked: boolean): Promise<void>;
  removeShopping(id: string): Promise<void>;
  clearCheckedShopping(): Promise<void>;

  exportAll(): Promise<Record<string, unknown>>;
}

export interface AdminOverview {
  users: { id: string; email: string; plan: string; createdAt: string; analysisCount: number }[];
  totals: {
    users: number;
    premium: number;
    analyses: number;
    failedAnalyses: number;
    analyses7d: number;
  };
  recentSources: Pick<Source, "id" | "url" | "platform" | "analysisStatus" | "analysisError" | "importedAt">[];
  recentErrors: Pick<Source, "id" | "url" | "platform" | "analysisError" | "importedAt">[];
  recentItems: Pick<ContentItem, "id" | "title" | "category" | "createdAt">[];
  subscriptions: Subscription[];
  eventCounts: Partial<Record<AnalyticsEvent, number>>;
}

export interface SubscriptionUpsert {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: Subscription["status"];
  interval: Subscription["interval"];
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/** Privileged operations (service role). Never exposed to the client. */
export interface AdminDataStore {
  trackEvent(userId: string | null, event: AnalyticsEvent, props?: Record<string, unknown>): Promise<void>;
  upsertSubscription(input: SubscriptionUpsert): Promise<void>;
  findUserIdByStripeCustomer(customerId: string): Promise<string | null>;
  getStripeCustomerId(userId: string): Promise<string | null>;
  deleteUser(userId: string): Promise<void>;
  overview(): Promise<AdminOverview>;
}
