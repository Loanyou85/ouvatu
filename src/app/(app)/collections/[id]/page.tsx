import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getAppContext } from "@/features/auth/context";
import { CollectionHeaderActions, CollectionItems } from "@/features/collections/collection-forms";
import { isUuid, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Collection" };

export default async function CollectionPage(props: PageProps<"/collections/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const { store } = await getAppContext();
  const collection = await store.getCollection(id);
  if (!collection) notFound();
  const items = await store.listItems({ collectionId: id });

  return (
    <div>
      <Link href="/collections" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Collections
      </Link>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-accent-soft text-3xl">{collection.emoji}</span>
          <div>
            <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em]">{collection.name}</h1>
            <p className="text-sm text-muted">{pluralize(items.length, "élément")}</p>
          </div>
        </div>
        <CollectionHeaderActions id={collection.id} name={collection.name} emoji={collection.emoji} />
      </div>
      {items.length ? (
        <CollectionItems collectionId={collection.id} items={items} />
      ) : (
        <EmptyState
          emoji={collection.emoji}
          title="Cette collection est vide."
          description="Ouvre une inspiration puis touche « Collection » pour l'ajouter ici."
          action={
            <Link href="/library" className={buttonClass("dark")}>
              Parcourir ma bibliothèque
            </Link>
          }
        />
      )}
    </div>
  );
}
