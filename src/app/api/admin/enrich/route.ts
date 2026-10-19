import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { fetchLyrics } from "@/lib/classification/lyrics";
import { createClient } from "@/lib/supabase/server";
import type { CatalogSong } from "@/lib/types";
import { pickBestYouTubeMatch } from "@/lib/youtube-match";
import { searchMusic, YouTubeApiError } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BATCH = 5;
const MAX_LYRICS_LENGTH = 60_000;

type Kind = "youtube" | "lyrics" | "both";

interface YouTubeOutcome {
  ok: boolean;
  skipped?: boolean;
  url?: string;
  videoId?: string;
  title?: string;
  channel?: string;
  score?: number;
  reason?: string;
  error?: string;
}

interface LyricsOutcome {
  ok: boolean;
  skipped?: boolean;
  provider?: string;
  chars?: number;
  sourceUrl?: string | null;
  error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    songIds?: unknown;
    kind?: unknown;
    overwrite?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const songIds = Array.isArray(body.songIds)
    ? [
        ...new Set(
          body.songIds.filter(
            (id): id is string => typeof id === "string" && UUID_RE.test(id),
          ),
        ),
      ].slice(0, MAX_BATCH)
    : [];
  if (songIds.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one valid song." },
      { status: 400 },
    );
  }

  const kind: Kind =
    body.kind === "youtube" || body.kind === "lyrics" ? body.kind : "both";
  const overwrite = body.overwrite === true;

  const supabase = await createClient();
  const { data: songs, error } = await supabase
    .from("catalog_songs")
    .select("*")
    .in("id", songIds);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byId = new Map((songs ?? []).map((song) => [song.id, song]));
  const ordered = songIds
    .map((id) => byId.get(id))
    .filter((song): song is CatalogSong => Boolean(song));

  const results: {
    songId: string;
    title: string;
    youtube?: YouTubeOutcome;
    lyrics?: LyricsOutcome;
  }[] = [];

  for (const song of ordered) {
    const youtubeOutcome: YouTubeOutcome | undefined =
      kind === "youtube" || kind === "both"
        ? { ok: false }
        : undefined;
    const lyricsOutcome: LyricsOutcome | undefined =
      kind === "lyrics" || kind === "both" ? { ok: false } : undefined;

    if (youtubeOutcome) {
      if (song.youtube_url && !overwrite) {
        youtubeOutcome.ok = true;
        youtubeOutcome.skipped = true;
      } else {
        try {
          const found = await searchMusic(`${song.title} ${song.artist}`, 10);
          const match = pickBestYouTubeMatch(song.title, song.artist, found);
          if (!match) {
            youtubeOutcome.error = "No confident YouTube match.";
          } else {
            const { error: updateError } = await supabase
              .from("catalog_songs")
              .update({
                youtube_url: `https://www.youtube.com/watch?v=${match.result.videoId}`,
                youtube_video_id: match.result.videoId,
                youtube_title: match.result.title,
                youtube_channel: match.result.channelTitle,
                youtube_updated_at: new Date().toISOString(),
              })
              .eq("id", song.id);
            if (updateError) {
              youtubeOutcome.error = updateError.message;
            } else {
              youtubeOutcome.ok = true;
              youtubeOutcome.url = `https://www.youtube.com/watch?v=${match.result.videoId}`;
              youtubeOutcome.videoId = match.result.videoId;
              youtubeOutcome.title = match.result.title;
              youtubeOutcome.channel = match.result.channelTitle;
              youtubeOutcome.score = Math.round(match.score);
              youtubeOutcome.reason = match.reason;
            }
          }
        } catch (error) {
          youtubeOutcome.error =
            error instanceof YouTubeApiError
              ? error.message
              : "YouTube search failed.";
        }
      }
    }

    if (lyricsOutcome) {
      if (song.lyrics_text && !overwrite) {
        lyricsOutcome.ok = true;
        lyricsOutcome.skipped = true;
      } else {
        const lyrics = await fetchLyrics(song);
        if (!lyrics) {
          lyricsOutcome.error = "No lyrics found.";
        } else {
          const text = lyrics.text.trim().slice(0, MAX_LYRICS_LENGTH);
          const { error: updateError } = await supabase
            .from("catalog_songs")
            .update({
              lyrics_text: text,
              lyrics_source: lyrics.provider,
              lyrics_source_url: lyrics.url,
              lyrics_updated_at: new Date().toISOString(),
            })
            .eq("id", song.id);
          if (updateError) {
            lyricsOutcome.error = updateError.message;
          } else {
            lyricsOutcome.ok = true;
            lyricsOutcome.provider = lyrics.provider;
            lyricsOutcome.chars = text.length;
            lyricsOutcome.sourceUrl = lyrics.url;
          }
        }
      }
    }

    results.push({
      songId: song.id,
      title: song.title,
      youtube: youtubeOutcome,
      lyrics: lyricsOutcome,
    });

    await sleep(250);
  }

  return NextResponse.json({ processed: results.length, results });
}
