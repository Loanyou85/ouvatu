"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "noma-cookie-notice-v1";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * NOMA only uses strictly necessary cookies (session) and first-party,
 * cookieless analytics: no consent is legally required, but we inform users.
 * If third-party trackers are ever added, replace this with a real consent banner.
 */
export function CookieNotice() {
  const acknowledged = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(KEY) === "1";
      } catch {
        return true;
      }
    },
    () => true,
  );
  if (acknowledged) return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-2xl bg-ink p-4 text-sm text-white shadow-float animate-fade-up md:bottom-6">
      <p>
        NOMA utilise uniquement des cookies nécessaires à ta connexion. Aucun traceur publicitaire.{" "}
        <Link href="/legal/cookies" className="font-semibold underline underline-offset-2">
          En savoir plus
        </Link>
      </p>
      <button
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
            window.dispatchEvent(new StorageEvent("storage"));
          } catch {
            // ignore
          }
        }}
        className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink"
      >
        Compris
      </button>
    </div>
  );
}
