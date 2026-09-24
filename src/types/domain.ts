import type { Category } from "@/config/categories";
import type { PlanId } from "@/config/plans";
import type { Place, Platform, StructuredData } from "@/types/schemas";

export type AnalysisStatus = "pending" | "fetching" | "analyzing" | "enriching" | "completed" | "failed";

/** How an input reached ouvatu. Every channel goes through the same pipeline. */
export type InputChannel = "paste" | "share_extension" | "browser_extension" | "direct_import";

export interface Source {
  id: string;
  userId: string;
  url: string;
  platform: Platform;
  title: string | null;
  thumbnailUrl: string | null;
  author: string | null;
  publishedAt: string | null;
  importedAt: string;
  rawMetadata: Record<string, unknown>;
  analysisStatus: AnalysisStatus;
  /** 0–5, number of completed pipeline steps shown to the user. */
  analysisStep: number;
  analysisError: string | null;
  inputChannel: InputChannel;
  contentItemId: string | null;
}

export type EntityType =
  | "place"
  | "restaurant"
  | "cafe"
  | "activity"
  | "hotel"
  | "movie"
  | "series"
  | "book"
  | "product"
  | "exercise"
  | "garment"
  | "decor_object"
  | "ingredient"
  | "other";

export interface Entity {
  type: EntityType;
  name: string;
  /** Index in the category list it comes from (places[i], titles[i]...). */
  ref: number;
}

export interface ItineraryStop {
  time: string;
  placeIndex: number;
  name: string;
  kind: string;
}
export interface ItineraryDay {
  day: number;
  stops: ItineraryStop[];
}
export interface Itinerary {
  days: ItineraryDay[];
  unplaced: { placeIndex: number; name: string }[];
  generatedAt: string;
}

/** Per-item user state that is not part of the extracted content. */
export interface ItemUserData {
  itinerary?: Itinerary;
  /** Places mentioned in a non-travel content (filled by the analysis). */
  locations?: Place[];
  note?: string;
}

export interface ContentItem {
  id: string;
  userId: string;
  sourceId: string | null;
  category: Category;
  confidence: number;
  title: string;
  summary: string;
  imageUrl: string | null;
  tags: string[];
  entities: Entity[];
  data: StructuredData;
  userData: ItemUserData;
  isSaved: boolean;
  isFavorite: boolean;
  isExample: boolean;
  sourceUrl: string | null;
  sourcePlatform: Platform | null;
  sourceAuthor: string | null;
  createdAt: string;
  updatedAt: string;
  collectionIds: string[];
}

/** Item as returned to the UI, with premium gating applied server-side. */
export interface ItemView extends ContentItem {
  lockedCount: number;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  itemCount: number;
  coverImages: string[];
  createdAt: string;
  updatedAt: string;
}

export type SavedListType = "WATCHLIST" | "WISHLIST" | "READING" | "WORKOUT";
export type SavedStatus = "todo" | "done";

export interface SavedEntry {
  id: string;
  userId: string;
  listType: SavedListType;
  contentItemId: string;
  entityRef: number | null;
  label: string;
  subtitle: string | null;
  imageUrl: string | null;
  status: SavedStatus;
  createdAt: string;
}

export interface ShoppingListItem {
  id: string;
  userId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  contentItemId: string | null;
  recipeTitle: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: PlanId;
  createdAt: string;
  onboardingCompleted: boolean;
  interests: string[];
  analysisCount: number;
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface Subscription {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: SubscriptionStatus;
  interval: "week" | "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export const ANALYTICS_EVENTS = [
  "user_signed_up",
  "onboarding_completed",
  "add_clicked",
  "url_submitted",
  "analysis_started",
  "analysis_completed",
  "analysis_failed",
  "item_saved",
  "collection_created",
  "search_used",
  "paywall_viewed",
  "checkout_started",
  "subscription_started",
  "subscription_cancelled",
  "premium_action_clicked",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export interface ItemFilter {
  categories?: Category[];
  collectionId?: string;
  favoritesOnly?: boolean;
  savedOnly?: boolean;
  sort?: "recent" | "oldest";
  since?: string;
  limit?: number;
}
