"use client";

import { ArrowRight, Check, ClipboardPaste, Link2, Plus, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ANALYSIS_ERRORS } from "@/config/messages";
import { trackClient } from "@/lib/client/analytics";
import { cn } from "@/lib/utils";
import { PLATFORM_LABEL, detectPlatform, normalizeInputUrl } from "@/services/content-ingestion/url";
import type { Platform } from "@/types/schemas";

type Phase = "idle" | "submitting" | "analyzing" | "error";
interface ErrorCopy {
  code: string;
  title: string;
  hint: string;
}

const STEPS = ["Contenu récupéré", "Sujet identifié", "Informations extraites", "Catégorie détectée", "Fiche créée"];

interface ProgressPayload {
  status: string;
  step: number;
  itemId: string | null;
  title: string | null;
  thumbnailUrl: string | null;
  error: ErrorCopy | null;
}

/** Polls the analysis status until it completes, fails or times out. */
async function pollAnalysis(
  sourceId: string,
  isCancelled: () => boolean,
  handlers: { onProgress: (p: ProgressPayload) => void; onDone: (itemId: string) => void; onError: (e: ErrorCopy) => void },
): Promise<void> {
  const deadline = Date.now() + 150_000;
  while (!isCancelled() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 900));
    const res = await fetch(`/api/analyze/${sourceId}`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) continue;
    const data = (await res.json()) as ProgressPayload;
    handlers.onProgress(data);
    if (data.status === "completed" && data.itemId) return handlers.onDone(data.itemId);
    if (data.status === "failed") return handlers.onError(data.error ?? { code: "internal", ...ANALYSIS_ERRORS.internal });
  }
  if (!isCancelled()) handlers.onError({ code: "unavailable", ...ANALYSIS_ERRORS.unavailable });
}

function lookingAt(platform: Platform | null): string {
  if (platform === "web" || platform === null) return "On regarde ce qu'il y a sur cette page…";
  if (platform === "pinterest") return "On regarde ce qu'il y a dans cette épingle…";
  if (platform === "instagram") return "On regarde ce qu'il y a dans ce post…";
  return "On regarde ce qu'il y a dans cette vidéo…";
}

export function AddFlow({
  initialUrl = "",
  autoStart = false,
  onDone,
  onBeforeSubmit,
}: {
  initialUrl?: string;
  autoStart?: boolean;
  onDone?: () => void;
  /** Runs before the analysis starts (e.g. saving onboarding answers). */
  onBeforeSubmit?: () => Promise<void>;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [showText, setShowText] = useState(false);
  const [sharedText, setSharedText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [actualStep, setActualStep] = useState(0);
  const [shownStep, setShownStep] = useState(0);
  const [error, setError] = useState<ErrorCopy | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string | null; thumbnailUrl: string | null } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  const started = useRef(false);

  const normalized = normalizeInputUrl(url);
  const platform = normalized ? detectPlatform(normalized) : null;
  const invalid = url.trim().length > 6 && !normalized;

  // Reset on (re)mount: React Strict Mode mounts twice in development.
  useEffect(() => {
    cancelled.current = false;
    return () => void (cancelled.current = true);
  }, []);

  // Reveal steps one by one, but never ahead of what the server really did.
  useEffect(() => {
    if (shownStep >= actualStep) return;
    const t = setTimeout(() => setShownStep((s) => s + 1), 380);
    return () => clearTimeout(t);
  }, [shownStep, actualStep]);

  const succeeded = phase === "analyzing" && Boolean(itemId) && shownStep >= STEPS.length;
  useEffect(() => {
    if (!succeeded || !itemId) return;
    const t = setTimeout(() => {
      router.push(`/items/${itemId}?new=1`);
      onDone?.();
    }, 1100);
    return () => clearTimeout(t);
  }, [succeeded, itemId, router, onDone]);

  function poll(sourceId: string) {
    void pollAnalysis(sourceId, () => cancelled.current, {
      onProgress: (data) => {
        setActualStep(data.step);
        if (data.title || data.thumbnailUrl) setPreview({ title: data.title, thumbnailUrl: data.thumbnailUrl });
      },
      onDone: (id) => {
        setActualStep(STEPS.length);
        setItemId(id);
      },
      onError: (copy) => {
        setError(copy);
        setPhase("error");
      },
    });
  }

  async function submit() {
    if (!normalized) {
      setError({ code: "invalid_url", ...ANALYSIS_ERRORS.invalid_url });
      setPhase("error");
      return;
    }
    setPhase("submitting");
    setError(null);
    setActualStep(0);
    setShownStep(0);
    setItemId(null);
    setPreview(null);
    if (onBeforeSubmit) await onBeforeSubmit().catch(() => undefined);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: normalized, channel: "paste", ...(sharedText.trim() ? { sharedText: sharedText.trim() } : {}) }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { sourceId?: string; error?: string } | null;
    if (!res || !res.ok || !data?.sourceId) {
      const code = data?.error ?? "internal";
      setError({ code, ...(ANALYSIS_ERRORS[code] ?? ANALYSIS_ERRORS.internal) });
      setPhase("error");
      return;
    }
    setPhase("analyzing");
    poll(data.sourceId);
  }

  useEffect(() => {
    if (autoStart && normalizeInputUrl(initialUrl) && !started.current) {
      started.current = true;
      void submit();
    }
    // Runs once on mount for share-target style entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      inputRef.current?.focus();
    }
  }

  if (phase === "analyzing" || phase === "submitting") {
    const done = succeeded;
    return (
      <div className="flex flex-col items-center py-2 text-center" aria-live="polite">
        <div className="relative mb-6 mt-2 grid h-28 w-28 place-items-center">
          <div className={cn("absolute inset-0 rounded-full bg-accent-soft", !done && "animate-breathe")} />
          {!done ? (
            <div className="absolute inset-1 rounded-full border-2 border-dashed border-accent/40 animate-orbit" />
          ) : null}
          <div className={cn("relative grid h-16 w-16 place-items-center rounded-full text-white shadow-accent", done ? "bg-success animate-pop" : "bg-accent")}>
            {done ? <Check className="h-8 w-8" strokeWidth={3} /> : <Sparkles className="h-7 w-7" />}
          </div>
        </div>
        <p className="text-lg font-extrabold tracking-tight">{done ? "✨ Ton inspiration est prête." : lookingAt(platform)}</p>
        {preview?.title && !done ? <p className="mt-1 line-clamp-1 max-w-xs text-sm text-muted">« {preview.title} »</p> : null}

        <ol className="mt-6 w-full max-w-xs space-y-2.5 text-left">
          {STEPS.map((label, i) => {
            const complete = shownStep > i;
            const current = shownStep === i && !done;
            return (
              <li key={label} className={cn("flex items-center gap-3 text-[0.95rem] transition-colors", complete ? "text-ink" : "text-subtle")}>
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all",
                    complete ? "border-success bg-success text-white animate-pop" : current ? "border-accent" : "border-line",
                  )}
                >
                  {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> : null}
                </span>
                <span className={cn(complete && "font-semibold")}>{label}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 text-xs text-subtle">L&apos;analyse continue même si tu fermes cette fenêtre.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      {phase === "error" && error ? (
        <div className="rounded-2xl bg-error-soft px-4 py-3.5" role="alert">
          <p className="font-bold text-error">{error.title}</p>
          <p className="mt-0.5 text-sm text-ink/80">{error.hint}</p>
          {error.code === "subscription_required" ? (
            <Link href="/premium" onClick={onDone} className={buttonClass("accent", "sm", "mt-3")}>
              Débloquer mon espace
            </Link>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" />
          <input
            ref={inputRef}
            autoFocus
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Colle un lien TikTok, Instagram, YouTube, Pinterest ou autre"
            aria-label="Lien à analyser"
            aria-invalid={invalid}
            className={cn(
              "h-14 w-full rounded-2xl border bg-bg pl-12 pr-28 text-[0.95rem] placeholder:text-subtle focus:bg-card focus:outline-none focus:ring-4",
              invalid ? "border-error focus:ring-error/15" : "border-line focus:border-accent focus:ring-accent/15",
            )}
          />
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-semibold text-ink shadow-card hover:bg-hover"
          >
            <ClipboardPaste className="h-4 w-4" /> Coller
          </button>
        </div>
        <div className="mt-2 flex min-h-5 items-center gap-2 px-1 text-xs">
          {invalid ? (
            <span className="font-medium text-error">Ce lien ne semble pas valide.</span>
          ) : platform ? (
            <span className="inline-flex items-center gap-1 font-semibold text-success">
              <Check className="h-3.5 w-3.5" /> Lien {PLATFORM_LABEL[platform]} détecté
            </span>
          ) : null}
        </div>
      </div>

      {showText ? (
        <div className="animate-fade-up">
          <Textarea
            value={sharedText}
            onChange={(e) => setSharedText(e.target.value)}
            maxLength={5000}
            placeholder="Colle ici la légende ou la description (facultatif). Utile quand la plateforme partage peu d'informations."
            aria-label="Texte complémentaire"
          />
        </div>
      ) : (
        <button type="button" onClick={() => setShowText(true)} className="inline-flex items-center gap-1.5 px-1 text-sm font-semibold text-muted hover:text-ink">
          <Plus className="h-4 w-4" /> Ajouter du texte (légende, description)
        </button>
      )}

      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={!url.trim()}>
        {phase === "error" ? <RotateCcw className="h-5 w-5" /> : null}
        {phase === "error" ? "Réessayer" : "Analyser"}
        {phase !== "error" ? <ArrowRight className="h-5 w-5" /> : null}
      </Button>
      <p className="text-center text-xs text-subtle">OUVATU lit uniquement les informations publiques du lien.</p>
    </form>
  );
}

export function trackAddClicked(from: string) {
  trackClient("add_clicked", { from });
}
