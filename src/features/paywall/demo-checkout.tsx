"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BillingInterval } from "@/config/plans";

export function DemoCheckoutButton({ interval, label, next = null }: { interval: BillingInterval; label: string; next?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="accent"
      size="lg"
      className="w-full"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const res = await fetch("/api/billing/mock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "subscribe", interval }) });
        if (res.ok) router.push(`/premium/success${next ? `?next=${encodeURIComponent(next)}` : ""}`);
        else setLoading(false);
      }}
    >
      {label}
    </Button>
  );
}

export function DemoCancelButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/billing/mock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
        router.refresh();
        setLoading(false);
      }}
    >
      Résilier (simulation)
    </Button>
  );
}
