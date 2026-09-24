"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useServerAction } from "@/features/items/use-action";
import { deleteAccountAction, updateNameAction } from "./actions";

export function NameForm({ name }: { name: string | null }) {
  const [value, setValue] = useState(name ?? "");
  const { pending, run } = useServerAction();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateNameAction(value));
      }}
    >
      <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} placeholder="Ton prénom" aria-label="Prénom" className="h-11" />
      <Button type="submit" variant="secondary" loading={pending} disabled={value === (name ?? "")}>
        OK
      </Button>
    </form>
  );
}

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="dark"
        loading={loading}
        onClick={async () => {
          setLoading(true);
          const res = await fetch("/api/billing/portal", { method: "POST" }).catch(() => null);
          const data = (await res?.json().catch(() => null)) as { url?: string } | null;
          if (data?.url) window.location.assign(data.url);
          else {
            setLoading(false);
            setError("Impossible d'ouvrir la gestion de l'abonnement pour le moment.");
          }
        }}
      >
        Gérer mon abonnement
      </Button>
      <FormError message={error} />
    </div>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left font-semibold text-error hover:bg-error-soft">
        <Trash2 className="h-5 w-5" /> Supprimer mon compte
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Supprimer ton compte ?">
        <p className="text-muted">
          Toutes tes inspirations, collections, listes et ton historique seront définitivement supprimés. Ton abonnement éventuel sera résilié. Cette action est irréversible.
        </p>
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const result = await deleteAccountAction(confirm);
              if (result && !result.ok) setError(result.error);
            });
          }}
        >
          <FormError message={error} />
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Tape SUPPRIMER" aria-label="Confirmation" autoCapitalize="characters" />
          <Button type="submit" variant="danger" size="lg" className="w-full" loading={pending} disabled={confirm.trim().toUpperCase() !== "SUPPRIMER"}>
            Supprimer définitivement
          </Button>
        </form>
      </Sheet>
    </>
  );
}
