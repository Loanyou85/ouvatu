import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/onboarding";
}

/**
 * Target of the confirmation email. Signs the user in and sends them straight
 * back into the app (to `next`). Supports both Supabase link styles:
 *  - `?code=` (PKCE, default)          → exchangeCodeForSession
 *  - `?token_hash=&type=` (email OTP)  → verifyOtp (works even on another device)
 * If the session cannot be opened here (e.g. link opened on another device),
 * the email is already confirmed by Supabase: we ask the user to log in and
 * then continue to the same destination.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  const expired = url.searchParams.get("error_code") === "otp_expired";
  const login = new URL("/login", url.origin);
  login.searchParams.set(expired ? "error" : "confirmed", expired ? "link_expired" : "1");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
