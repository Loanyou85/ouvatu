import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { track } from "@/services/analytics";
import { getSessionUser } from "@/services/users/auth";

/** Client-side events. Only a small allow-list may be sent from the browser. */
const CLIENT_EVENTS = ["add_clicked", "premium_action_clicked", "paywall_viewed"] as const;
const Body = z.object({
  event: z.enum(CLIENT_EVENTS),
  props: z.record(z.string().max(40), z.union([z.string().max(100), z.number(), z.boolean()])).optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 204 });
  if (!rateLimit(`events:${user.id}`, 60, 60_000).ok) return new NextResponse(null, { status: 204 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (parsed.success) await track(user.id, parsed.data.event, parsed.data.props ?? {});
  return new NextResponse(null, { status: 204 });
}
