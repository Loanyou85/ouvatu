"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { AddFlow, trackAddClicked } from "./add-flow";

const AddContext = createContext<(from?: string) => void>(() => undefined);

export function AddProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  const openAdd = useCallback((from = "unknown") => {
    trackAddClicked(from);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <AddContext.Provider value={openAdd}>
      {children}
      <Sheet open={open} onClose={close} title="Ajouter une inspiration">
        <AddFlow key={session} onDone={close} />
      </Sheet>
    </AddContext.Provider>
  );
}

export function useOpenAdd() {
  return useContext(AddContext);
}

/** Any element that opens the add sheet. */
export function AddTrigger({ from, className, children, ariaLabel }: { from: string; className?: string; children: React.ReactNode; ariaLabel?: string }) {
  const openAdd = useOpenAdd();
  return (
    <button type="button" aria-label={ariaLabel} className={className} onClick={() => openAdd(from)}>
      {children}
    </button>
  );
}
