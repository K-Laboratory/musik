import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { classifySong, classifierModel, quadrantFor } from "@/lib/classification/classify";
import { buildPrompt, fetchLyrics } from "@/lib/classification/lyrics";
import type { CatalogSong, Emotion } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const TAXONOMY_VERSION = 1;
const MAX_BATCH = 10;
const DELAY_MS = 300;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SongOutcome {
  songId: string;
  title: string;
  ok: boolean;
  lyricsSource?: string;
  error?: string;
}

/**
 * POST /api/admin/classify/batch
 *   { songIds?: string[] }              re-classify explicit songs
 *   { limit?: number, onlyPending?: boolean }  process pending songs
 *
 * Processes a small batch of songs. The client calls this repeatedly until
 * `pending` is 0. Kept small so it fits a serverless time limit.
 */
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { limit?: number; onlyPending?: boolean; songIds?: unknown } = {};
  try {
    body = (await request.json()) as {
      limit?: number;
      onlyPending?: boolean;
      songIds?: unknown;
    };
  } catch {
    // Empty body is fine; defaults apply.
  }

  const limit = Math.min(Math.max(body.limit ?? 5, 1), MAX_BATCH);
  const onlyPending = body.onlyPending ?? true;
  const requestedIds = Array.isArray(body.songIds)
    ? [
        ...new Set(
          body.songIds.filter(
            (id): id is string => typeof id === "string" && UUID_RE.test(id),
          ),
        ),
      ].slice(0, MAX_BATCH)
    : [];

  if (body.songIds !== undefined && requestedIds.length === 0) {
    return NextResponse.json(
      { error: "songIds must contain at least one valid song id." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: emotions } = await supabase.from("emotions").select("*");
  if (!emotions || emotions.length === 0) {
    return NextResponse.json(
      { error: "Taxonomy is empty. Run the schema migration." },
      { status: 409 },
    );
  }
  const emotionList = emotions as Emotion[];

  let candidates: CatalogSong[] = [];

  if (requestedIds.length > 0) {
    const { data: songs } = await supabase
      .from("catalog_songs")
      .select("*")
      .in("id", requestedIds);
    const byId = new Map((songs ?? []).map((song) => [song.id, song]));
    candidates = requestedIds
      .map((id) => byId.get(id))
      .filter((song): song is CatalogSong => Boolean(song));
  } else if (onlyPending) {
    const { data: analyzed } = await supabase
      .from("song_analysis")
      .select("song_id")
      .eq("taxonomy_version", TAXONOMY_VERSION);
    const analyzedIds = new Set((analyzed ?? []).map((r) => r.song_id));

    const { data: songs } = await supabase
      .from("catalog_songs")
      .select("*")
      .order("year", { ascending: true });

    candidates = (songs ?? []).filter((s) => !analyzedIds.has(s.id)).slice(0, limit);
  } else {
    const { data: songs } = await supabase
      .from("catalog_songs")
      .select("*")
      .order("year", { ascending: true })
      .limit(limit);
    candidates = songs ?? [];
  }

  if (candidates.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, results: [] });
  }

  const results: SongOutcome[] = [];

  for (const song of candidates) {
    try {
      const lyrics = await fetchLyrics(song);
      const { system, user } = buildPrompt(song, emotionList, lyrics?.text ?? null);
      const result = await classifySong(system, user);

      const validIds = new Set(emotionList.map((e) => e.id));
      const categories = result.categories
        .filter((c) => validIds.has(c.id))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);

      if (categories.length === 0) {
        results.push({ songId: song.id, title: song.title, ok: false, error: "no valid categories" });
        continue;
      }

      const quadrant = quadrantFor(result.valence, result.arousal);
      await supabase.from("song_analysis").upsert(
        {
          song_id: song.id,
          valence: result.valence,
          arousal: result.arousal,
          quadrant,
          model: classifierModel(),
          taxonomy_version: TAXONOMY_VERSION,
          rationale: result.rationale,
          needs_review: categories[0]!.confidence < 0.45,
          analyzed_at: new Date().toISOString(),
        },
        { onConflict: "song_id,taxonomy_version" },
      );

      await supabase.from("song_emotions").delete().eq("song_id", song.id);
      await supabase.from("song_emotions").insert(
        categories.map((c, index) => ({
          song_id: song.id,
          emotion_id: c.id,
          confidence: c.confidence,
          is_primary: index === 0,
          source: "auto" as const,
        })),
      );

      results.push({
        songId: song.id,
        title: song.title,
        ok: true,
        lyricsSource: lyrics?.provider ?? "model-knowledge",
      });
    } catch (error) {
      results.push({
        songId: song.id,
        title: song.title,
        ok: false,
        error: error instanceof Error ? error.message : "failed",
      });
    }
    await sleep(DELAY_MS);
  }

  const { count: total } = await supabase
    .from("catalog_songs")
    .select("*", { count: "exact", head: true });
  const { count: analyzed } = await supabase
    .from("song_analysis")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    processed: results.length,
    remaining: Math.max(0, (total ?? 0) - (analyzed ?? 0)),
    results,
  });
}
