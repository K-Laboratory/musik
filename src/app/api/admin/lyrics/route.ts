import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { fetchLyrics } from "@/lib/classification/lyrics";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/lyrics?songId=...
 *
 * Returns a short lyrics preview for the admin table. `url` points at the
 * provider so the reviewer can open the full lyrics there.
 */
export async function GET(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const songId = new URL(request.url).searchParams.get("songId") ?? "";
  if (!UUID_RE.test(songId)) {
    return NextResponse.json({ error: "Invalid song id." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: song } = await supabase
    .from("catalog_songs")
    .select("*")
    .eq("id", songId)
    .maybeSingle();

  if (!song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  const lyrics = await fetchLyrics(song);
  if (!lyrics) {
    return NextResponse.json({ available: false });
  }

  const words = lyrics.text.replace(/\s+/g, " ").trim().split(" ");
  const preview = words.slice(0, 10).join(" ");
  const excerpt = `${words.slice(0, 40).join(" ")}${words.length > 40 ? "..." : ""}`;
  const sourceUrl = lyrics.provider.startsWith("lrclib")
    ? `https://lrclib.net/search?q=${encodeURIComponent(`${song.title} ${song.artist}`)}`
    : lyrics.url;

  return NextResponse.json({
    available: true,
    provider: lyrics.provider,
    url: sourceUrl,
    preview,
    excerpt,
  });
}
