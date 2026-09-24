import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { searchMusic, YouTubeApiError } from "@/lib/youtube";

export const runtime = "nodejs";

/**
 * GET /api/youtube/search?q=<query>
 *
 * Server-side proxy for the YouTube Data API. The API key never reaches the
 * browser. Only signed-in users may call it.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchMusic(query);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof YouTubeApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("YouTube search failed:", error);
    return NextResponse.json(
      { error: "Could not search YouTube right now." },
      { status: 502 },
    );
  }
}
