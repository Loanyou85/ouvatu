import { NextResponse } from "next/server";
import { z } from "zod";
import { ONBOARDING_INTERESTS } from "@/config/categories";
import { getUserStore } from "@/db";
import { track } from "@/services/analytics";
import { getSessionUser } from "@/services/users/auth";

const ids = ONBOARDING_INTERESTS.map((i) => i.id) as [string, ...string[]];
const Body = z.object({ interests: z.array(z.enum(ids)).max(ids.length) });

/**
 * POST /api/onboarding — saves the onboarding answers without navigating
 * (a server action would refresh the page while the first link is analysed).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const interests = parsed.success ? parsed.data.interests : [];
  const store = await getUserStore();
  const profile = await store.getProfile();
  await store.updateProfile({ onboardingCompleted: true, interests });
  if (!profile?.onboardingCompleted) await track(user.id, "onboarding_completed", { interests });
  return NextResponse.json({ ok: true });
}
