"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl" aria-hidden>
        🫠
      </p>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Oups, quelque chose s&apos;est mal passé.</h1>
      <p className="mt-2 text-muted">Ce n&apos;est pas toi, c&apos;est nous. Réessaie dans un instant.</p>
      {error.digest ? <p className="mt-2 text-xs text-subtle">Code : {error.digest}</p> : null}
      <Button variant="dark" className="mt-6" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
