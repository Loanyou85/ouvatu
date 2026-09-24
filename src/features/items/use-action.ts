"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { useOpenPaywall } from "@/features/paywall/paywall-sheet";
import type { ActionResult } from "./actions";

/** Run a server action with toast feedback and paywall routing. */
export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const openPaywall = useOpenPaywall();
  const router = useRouter();

  const run = useCallback(
    (fn: () => Promise<ActionResult>, onSuccess?: () => void) => {
      startTransition(async () => {
        try {
          const result = await fn();
          if (result.ok) {
            if (result.message) toast(result.message);
            onSuccess?.();
            router.refresh();
          } else if (result.code === "limit" || result.code === "premium") {
            openPaywall(result.error);
          } else {
            toast(result.error, "error");
          }
        } catch {
          toast("Oups, ça n'a pas marché. Réessaie.", "error");
        }
      });
    },
    [toast, openPaywall, router],
  );
  return { pending, run };
}
