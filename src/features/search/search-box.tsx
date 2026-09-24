"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" />
      <input
        autoFocus={!initial}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={200}
        placeholder="Ex. mes restaurants japonais à Paris"
        aria-label="Rechercher dans mon espace"
        className="h-14 w-full rounded-2xl border border-line bg-card pl-12 pr-12 text-base shadow-card placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {q ? (
        <button
          type="button"
          aria-label="Effacer"
          onClick={() => {
            setQ("");
            router.push("/search");
          }}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-hover"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </form>
  );
}
