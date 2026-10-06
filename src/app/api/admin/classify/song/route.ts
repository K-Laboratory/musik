import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import {
  classifySong,
  classifierModel,
  quadrantFor,
} from "@/lib/classification/classify";
import { buildPrompt, fetchLyrics } from "@/lib/classification/lyrics";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const TAXONOMY_VERSION = 1;

/**
 * POST /api/admin/classify/song  { songId }
 *
 * Classifies a single catalog song:
 *   fetch lyrics (transient) -> LLM -> store ONLY derived tags.
 * Idempotent per (song, taxonomy_version).
 */
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { songId?: string };
  try {
    body = (await request.json()) as { songId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const songId = body.songId;
  if (!songId) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const [{ data: song }, { data: emotions }] = await Promise.all([
    supabase.from("catalog_songs").select("*").eq("id", songId).maybeSingle(),
    supabase.from("emotions").select("*"),
  ]);

  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }
  if (!emotions || emotions.length === 0) {
    return NextResponse.json(
      { error: "Taxonomy is empty. Run the schema migration." },
      { status: 409 },
    );
  }

  try {
    const lyrics = await fetchLyrics(song);
    const { system, user } = buildPrompt(song, emotions, lyrics?.text ?? null);
    const result = await classifySong(system, user);

    // Only accept category ids that exist in the taxonomy.
    const validIds = new Set(emotions.map((e) => e.id));
    const categories = result.categories
      .filter((c) => validIds.has(c.id))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    if (categories.length === 0) {
      return NextResponse.json(
        { error: "Model returned no valid categories." },
        { status: 502 },
      );
    }

    const quadrant = quadrantFor(result.valence, result.arousal);
    const needsReview = categories[0]!.confidence < 0.45;

    await supabase
      .from("song_analysis")
      .upsert(
        {
          song_id: song.id,
          valence: result.valence,
          arousal: result.arousal,
          quadrant,
          model: classifierModel(),
          taxonomy_version: TAXONOMY_VERSION,
          rationale: result.rationale,
          needs_review: needsReview,
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

    return NextResponse.json({
      ok: true,
      songId: song.id,
      lyricsSource: lyrics?.provider ?? "model-knowledge",
      valence: result.valence,
      arousal: result.arousal,
      quadrant,
      categories,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Classification failed.";
    console.error("classify/song failed:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
