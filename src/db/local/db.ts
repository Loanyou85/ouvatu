import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  ContentItem,
  SavedEntry,
  ShoppingListItem,
  Source,
  Subscription,
  UserProfile,
} from "@/types/domain";

/**
 * Local JSON database used when Supabase is not configured (development / demo).
 * Single-process, write-through. Not meant for production traffic.
 */
export interface LocalUser extends UserProfile {
  passwordHash: string;
}
export interface LocalCollection {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}
export interface LocalCollectionItem {
  collectionId: string;
  contentItemId: string;
  userId: string;
  addedAt: string;
}
export interface LocalEvent {
  userId: string | null;
  event: string;
  props: Record<string, unknown>;
  createdAt: string;
}
export type LocalItem = Omit<ContentItem, "collectionIds">;

export interface LocalDb {
  version: 1;
  users: LocalUser[];
  subscriptions: Subscription[];
  sources: Source[];
  items: LocalItem[];
  collections: LocalCollection[];
  collectionItems: LocalCollectionItem[];
  saved: SavedEntry[];
  shopping: ShoppingListItem[];
  events: LocalEvent[];
}

const emptyDb = (): LocalDb => ({
  version: 1,
  users: [],
  subscriptions: [],
  sources: [],
  items: [],
  collections: [],
  collectionItems: [],
  saved: [],
  shopping: [],
  events: [],
});

function dbPath(): string {
  return process.env.OUVATU_LOCAL_DB_PATH || path.join(process.cwd(), ".data", "ouvatu-local-db.json");
}

const globalRef = globalThis as unknown as { __ouvatuLocalDb?: LocalDb };

export function getLocalDb(): LocalDb {
  if (globalRef.__ouvatuLocalDb) return globalRef.__ouvatuLocalDb;
  let db = emptyDb();
  try {
    const file = dbPath();
    if (fs.existsSync(/*turbopackIgnore: true*/ file)) {
      db = { ...emptyDb(), ...(JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as Partial<LocalDb>) } as LocalDb;
    }
  } catch (error) {
    console.error("[local-db] could not read database, starting empty", error);
  }
  globalRef.__ouvatuLocalDb = db;
  return db;
}

/** Apply a mutation and persist atomically. */
export function mutateLocalDb<T>(fn: (db: LocalDb) => T): T {
  const db = getLocalDb();
  const result = fn(db);
  if (db.events.length > 5000) db.events.splice(0, db.events.length - 5000);
  try {
    const file = dbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, file);
  } catch (error) {
    console.error("[local-db] could not persist database", error);
  }
  return result;
}
