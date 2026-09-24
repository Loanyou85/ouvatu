import Link from "next/link";
import { cn, pluralize } from "@/lib/utils";
import type { Collection } from "@/types/domain";

export function CollectionCard({ collection, className }: { collection: Collection; className?: string }) {
  const covers = collection.coverImages;
  return (
    <Link href={`/collections/${collection.id}`} className={cn("group block animate-fade-up", className)}>
      <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-card bg-card p-1 shadow-card transition group-hover:-translate-y-0.5">
        {covers.length === 0 ? (
          <div className="col-span-2 row-span-2 grid place-items-center rounded-[1rem] bg-accent-soft text-5xl">{collection.emoji}</div>
        ) : (
          [0, 1, 2, 3].map((i) =>
            covers[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={covers[i]} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full rounded-[0.8rem] object-cover" />
            ) : (
              <div key={i} className="grid place-items-center rounded-[0.8rem] bg-accent-soft/70 text-xl">
                {i === 0 ? collection.emoji : ""}
              </div>
            ),
          )
        )}
      </div>
      <h3 className="mt-2.5 line-clamp-1 font-bold tracking-tight">
        <span aria-hidden>{collection.emoji} </span>
        {collection.name}
      </h3>
      <p className="text-[0.8rem] text-muted">{pluralize(collection.itemCount, "élément")}</p>
    </Link>
  );
}
