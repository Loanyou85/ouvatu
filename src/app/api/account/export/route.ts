import { NextResponse } from "next/server";
import { getUserStore } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/services/users/auth";

/** RGPD data portability: everything we store about the user, as JSON. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`export:${user.id}`, 5, 60_000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const store = await getUserStore();
  const data = await store.exportAll();
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="noma-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
