import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/library", "/collections", "/items", "/search", "/lists", "/profile", "/premium", "/onboarding", "/admin", "/add"];
const LOCAL_SESSION_COOKIE = "ouvatu_session";

/**
 * Runs before routes: refreshes the Supabase auth session cookies and sends
 * signed-out visitors of app pages to /login. Pages still re-validate the
 * session server-side; this is only a fast first gate.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const rawUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^["']|["']$/g, "").trim();
  const url = rawUrl
    ? (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).replace(/\/+(rest|auth)\/v1\/?$/i, "").replace(/\/+$/, "")
    : "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let signedIn: boolean;

  if (url && key) {
    try {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      });
      const { data } = await supabase.auth.getUser();
      signedIn = Boolean(data.user);
    } catch {
      // Misconfigured Supabase: let pages render (they show a clear message / diagnostic).
      signedIn = false;
    }
  } else {
    signedIn = request.cookies.has(LOCAL_SESSION_COOKIE);
  }

  const { pathname, search } = request.nextUrl;
  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/webhooks|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
