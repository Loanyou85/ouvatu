import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { limitsFor } from "@/config/plans";
import { requireSubscribedContext } from "@/features/auth/context";
import { CollectionCard } from "@/features/collections/collection-card";
import { NewCollectionButton } from "@/features/collections/collection-forms";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const { store, plan } = await requireSubscribedContext();
  const collections = await store.listCollections();
  const limit = limitsFor(plan).maxCollections;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-extrabold tracking-[-0.03em]">Collections</h1>
          <p className="text-sm text-muted">
            {collections.length} collection{collections.length > 1 ? "s" : ""}
            {Number.isFinite(limit) ? ` sur ${limit}` : ""}
          </p>
        </div>
        {collections.length ? <NewCollectionButton /> : null}
      </div>
      {collections.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="🗂️"
          title="Crée ta première collection."
          description="Regroupe tes inspirations : 🇯🇵 Japon, 🍝 Recettes rapides, 🏠 Mon appartement, 🛍️ À acheter…"
          action={<NewCollectionButton />}
        />
      )}
    </div>
  );
}
