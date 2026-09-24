import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getOrigin, safeRedirectPath } from "@/lib/url";

/** Facebook sometimes nests the avatar under `picture.data.url`. */
function extractAvatarUrl(metadata: Record<string, unknown>): string | null {
  const candidates = [metadata.avatar_url, metadata.picture];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      return candidate;
    }
    if (candidate && typeof candidate === "object") {
      const nested = (candidate as { data?: { url?: unknown } }).data?.url;
      if (typeof nested === "string" && nested.startsWith("http")) {
        return nested;
      }
    }
  }
  return null;
}

/**
 * OAuth callback. Supabase redirects here with a `code` after the user signs in
 * with Google/Facebook. We exchange it for a session (which sets the auth
 * cookies) and make sure a profile row exists.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const origin = getOrigin(request);
  const next = safeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const user = data.user;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const displayName =
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    (metadata.user_name as string | undefined) ??
    user.email ??
    null;

  // The database trigger normally creates this row. This upsert is a safety net
  // (e.g. if the trigger was not installed) and never overwrites an existing
  // profile because of `ignoreDuplicates`.
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      avatar_url: extractAvatarUrl(metadata),
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  return NextResponse.redirect(`${origin}${next}`);
}
