"use client";

import { FolderHeart, Home, LibraryBig, Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOpenAdd } from "@/features/add/add-provider";
import { cn } from "@/lib/utils";

const DESKTOP_LINKS = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Bibliothèque" },
  { href: "/collections", label: "Collections" },
  { href: "/search", label: "Recherche" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
      {DESKTOP_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            isActive(pathname, link.href) ? "bg-ink text-white" : "text-muted hover:bg-hover hover:text-ink",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function AddButtonDesktop() {
  const openAdd = useOpenAdd();
  return (
    <button
      onClick={() => openAdd("header")}
      className="hidden h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-accent transition hover:bg-accent-strong active:scale-[0.97] md:inline-flex"
    >
      <Plus className="h-4 w-4" strokeWidth={2.75} /> Ajouter
    </button>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const openAdd = useOpenAdd();
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/library", label: "Bibliothèque", icon: LibraryBig },
    null,
    { href: "/collections", label: "Collections", icon: FolderHeart },
    { href: "/profile", label: "Profil", icon: UserRound },
  ];
  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-card/90 backdrop-blur-xl pb-safe md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {items.map((item) =>
          item === null ? (
            <li key="add" className="flex justify-center">
              <button
                onClick={() => openAdd("bottom_nav")}
                aria-label="Ajouter une inspiration"
                className="-mt-7 grid h-14 w-14 place-items-center rounded-[1.35rem] bg-accent text-white shadow-accent ring-4 ring-bg transition active:scale-95"
              >
                <Plus className="h-7 w-7" strokeWidth={2.75} />
              </button>
            </li>
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 text-[0.68rem] font-semibold transition-colors",
                  isActive(pathname, item.href) ? "text-ink" : "text-subtle",
                )}
              >
                <item.icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={isActive(pathname, item.href) ? 2.4 : 2} />
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

export function MobileSearchLink() {
  return (
    <Link href="/search" aria-label="Rechercher" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-hover md:hidden">
      <Search className="h-5 w-5" />
    </Link>
  );
}
