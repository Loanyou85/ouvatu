import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { LIST_TABS } from "@/config/lists";
import { requireSubscribedContext } from "@/features/auth/context";
import { SavedList, ShoppingList } from "@/features/lists/list-views";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes listes" };

export default async function ListsPage(props: PageProps<"/lists">) {
  const sp = await props.searchParams;
  const tab = LIST_TABS.find((t) => t.slug === sp.tab) ?? LIST_TABS[0];
  const { store } = await requireSubscribedContext();
  const [shopping, saved] = await Promise.all([store.listShopping(), store.listSaved()]);
  const count = (t: (typeof LIST_TABS)[number]) =>
    t.listType === "SHOPPING" ? shopping.filter((s) => !s.checked).length : saved.filter((s) => s.listType === t.listType && s.status === "todo").length;
  const entries = tab.listType === "SHOPPING" ? [] : saved.filter((s) => s.listType === tab.listType);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-[1.9rem] font-extrabold tracking-[-0.03em]">Mes listes</h1>
      <nav className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {LIST_TABS.map((t) => (
          <Link
            key={t.slug}
            href={`/lists?tab=${t.slug}`}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold transition", t.slug === tab.slug ? "bg-ink text-white" : "bg-card shadow-card hover:bg-hover")}
          >
            {t.emoji} {t.label}
            <span className={cn("ml-1.5 text-xs", t.slug === tab.slug ? "text-white/60" : "text-subtle")}>{count(t)}</span>
          </Link>
        ))}
      </nav>
      {tab.listType === "SHOPPING" ? (
        shopping.length ? (
          <ShoppingList items={shopping} />
        ) : (
          <EmptyState emoji={tab.emoji} title="Ta liste de courses est vide." description={tab.empty} />
        )
      ) : entries.length ? (
        <SavedList entries={entries} category={tab.category} doneLabel={tab.doneLabel} />
      ) : (
        <EmptyState emoji={tab.emoji} title="Rien pour l'instant." description={tab.empty} />
      )}
    </div>
  );
}
