"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** Bottom sheet on mobile, centered dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Fermer" className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={panelRef}
        className={cn(
          "relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-card p-5 pb-8 shadow-float animate-sheet-up sm:max-w-lg sm:rounded-[1.75rem] sm:p-7",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        {title || !hideClose ? (
          <div className="mb-5 flex items-start justify-between gap-4">
            {title ? <h2 className="text-xl font-extrabold tracking-tight">{title}</h2> : <span />}
            {!hideClose ? (
              <button onClick={onClose} aria-label="Fermer" className="-m-1 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-hover">
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
