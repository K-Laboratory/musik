import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { parseYouTubeUrl } from "@/lib/youtube-url";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CatalogUpdate = Database["public"]["Tables"]["catalog_songs"]["Update"];

async function authorize() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await authorize();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid song id." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: song, error } = await supabase
    .from("catalog_songs")
    .select(
      "id,title,artist,year,youtube_url,youtube_video_id,youtube_title,youtube_channel,youtube_updated_at,lyrics_text,lyrics_source,lyrics_source_url,lyrics_updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  return NextResponse.json({ song });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await authorize();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid song id." }, { status: 400 });
  }

  let body: {
    youtubeUrl?: unknown;
    lyricsText?: unknown;
    lyricsSource?: unknown;
    lyricsSourceUrl?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const update: CatalogUpdate = {};

  if (body.youtubeUrl !== undefined) {
    const raw =
      typeof body.youtubeUrl === "string" ? body.youtubeUrl.trim() : "";
    if (!raw) {
      update.youtube_url = null;
      update.youtube_video_id = null;
      update.youtube_title = null;
      update.youtube_channel = null;
      update.youtube_updated_at = null;
    } else {
      const parsed = parseYouTubeUrl(raw);
      if (!parsed) {
        return NextResponse.json(
          { error: "Enter a valid YouTube URL or 11-character video id." },
          { status: 400 },
        );
      }
      update.youtube_url = parsed.url;
      update.youtube_video_id = parsed.videoId;
      update.youtube_title = null;
      update.youtube_channel = null;
      update.youtube_updated_at = new Date().toISOString();
    }
  }

  if (body.lyricsText !== undefined) {
    const text =
      typeof body.lyricsText === "string" ? body.lyricsText.trim() : "";
    const sourceUrl =
      typeof body.lyricsSourceUrl === "string"
        ? body.lyricsSourceUrl.trim()
        : "";
    const source =
      typeof body.lyricsSource === "string" && body.lyricsSource.trim()
        ? body.lyricsSource.trim().slice(0, 40)
        : "manual";

    update.lyrics_text = text || null;
    update.lyrics_source = text ? source : null;
    update.lyrics_source_url = text ? sourceUrl || null : null;
    update.lyrics_updated_at = text ? new Date().toISOString() : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: song, error } = await supabase
    .from("catalog_songs")
    .update(update)
    .eq("id", id)
    .select(
      "id,title,artist,year,youtube_url,youtube_video_id,youtube_title,youtube_channel,youtube_updated_at,lyrics_text,lyrics_source,lyrics_source_url,lyrics_updated_at",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  return NextResponse.json({ song });
}
