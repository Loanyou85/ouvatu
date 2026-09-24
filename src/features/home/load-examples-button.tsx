"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { loadExamplesAction } from "./actions";

export function LoadExamplesButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" loading={pending} onClick={() => start(() => loadExamplesAction())}>
      Voir des exemples
    </Button>
  );
}
