import { NextResponse } from "next/server";
import { signOut } from "@/services/users/auth";

export async function POST(request: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

/** GET is used internally when a session exists without a profile. */
export async function GET(request: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
