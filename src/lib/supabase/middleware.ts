import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";

/**
 * Routes that unauthenticated visitors are allowed to reach. API routes are
 * included because they perform their own auth check and should return 401
 * JSON rather than an HTML redirect.
 */
const PUBLIC_PREFIXES = ["/login", "/auth", "/api"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection:
 *   - unauthenticated users are redirected to /login
 *   - authenticated users are redirected away from /login to /dashboard
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail open (but don't crash the site) when the project isn't configured yet.
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser(). A
  // simple mistake here can make it very hard to debug users being randomly
  // logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const response = NextResponse.redirect(url);
    // Carry over any refreshed auth cookies.
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      response.cookies.set(cookie),
    );
    return response;
  };

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      response.cookies.set(cookie),
    );
    return response;
  }

  if (user && pathname === "/login") {
    return redirectTo("/dashboard");
  }

  return supabaseResponse;
}
