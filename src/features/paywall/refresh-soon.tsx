"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Waits for the Stripe webhook to activate the plan, then refreshes. */
export function RefreshSoon() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [router]);
  return <p className="mt-4 text-xs text-subtle">Actualisation automatique…</p>;
}
