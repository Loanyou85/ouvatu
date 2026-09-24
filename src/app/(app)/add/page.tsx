import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { AddFlow } from "@/features/add/add-flow";
import { requireSubscribedContext } from "@/features/auth/context";

export const metadata: Metadata = { title: "Ajouter une inspiration" };

/**
 * Standalone entry point. Future share targets (PWA Web Share Target,
 * iOS/Android extensions, browser extension) can open
 * /add?url=…&text=… and land in the exact same flow and pipeline.
 */
export default async function AddPage(props: PageProps<"/add">) {
  await requireSubscribedContext();
  const sp = await props.searchParams;
  const pick = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  // Share targets often put the URL inside "text".
  const initial = pick(sp.url) || pick(sp.text).match(/https?:\/\/\S+/)?.[0] || "";
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 text-[1.9rem] font-extrabold tracking-[-0.03em]">Ajouter une inspiration</h1>
      <Card className="p-5 sm:p-7">
        <AddFlow initialUrl={initial} autoStart={Boolean(initial) && sp.auto === "1"} />
      </Card>
    </div>
  );
}
