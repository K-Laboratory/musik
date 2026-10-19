import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { parseYouTubeUrl } from "@/lib/youtube-url";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CatalogUpdate = Database["public"]["Tables"]["catalog_songs"]["Update"];
const TAXONOMY_VERSION = 1;

interface ClassificationTag {
  id: string;
  confidence: number;
  is_primary: boolean;
}

interface ClassificationInput {
  valence: number;
  arousal: number;
  needs_review: boolean;
  rationale: string;
  tags: ClassificationTag[];
}

function parseClassification(value: unknown): ClassificationInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const valence = Number(input.valence);
  const arousal = Number(input.arousal);
  if (
    !Number.isFinite(valence) ||
    !Number.isFinite(arousal) ||
    valence < -2 ||
    valence > 2 ||
    arousal < -2 ||
    arousal > 2
  ) {
    return null;
  }

  const rawTags = Array.isArray(input.tags) ? input.tags : [];
  const seen = new Set<string>();
  const tags: ClassificationTag[] = [];
  for (const raw of rawTags) {
    if (!raw || typeof raw !== "object") continue;
    const tag = raw as Record<string, unknown>;
    if (typeof tag.id !== "string" || seen.has(tag.id)) continue;
    const confidence = Number(tag.confidence);
    if (!Number.isFinite(confidence)) continue;
    seen.add(tag.id);
    tags.push({
      id: tag.id,
      confidence: Math.max(0, Math.min(1, confidence)),
      is_primary: tag.is_primary === true,
    });
    if (tags.length === 3) break;
  }
  if (tags.length === 0) return null;

  const primaryIndex = tags.findIndex((tag) => tag.is_primary);
  tags.forEach((tag, index) => {
    tag.is_primary = index === (primaryIndex === -1 ? 0 : primaryIndex);
  });

  return {
    valence,
    arousal,
    needs_review: input.needs_review === true,
    rationale:
      typeof input.rationale === "string" && input.rationale.trim()
        ? input.rationale.trim().slice(0, 300)
        : "Manual edit",
    tags,
  };
}

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
  const [
    { data: song, error },
    { data: analysis },
    { data: tagRows },
    { data: emotions },
  ] = await Promise.all([
    supabase
      .from("catalog_songs")
      .select(
        "id,title,artist,year,youtube_url,youtube_video_id,youtube_title,youtube_channel,youtube_updated_at,lyrics_text,lyrics_source,lyrics_source_url,lyrics_updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("song_analysis")
      .select("valence,arousal,quadrant,needs_review,rationale,model,analyzed_at")
      .eq("song_id", id)
      .eq("taxonomy_version", TAXONOMY_VERSION)
      .maybeSingle(),
    supabase
      .from("song_emotions")
      .select("emotion_id,confidence,is_primary")
      .eq("song_id", id),
    supabase.from("emotions").select("id,name,name_vi,valence,arousal"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  const emotionById = new Map((emotions ?? []).map((emotion) => [emotion.id, emotion]));
  return NextResponse.json({
    song,
    analysis: analysis ?? null,
    tags: (tagRows ?? []).map((tag) => ({
      id: tag.emotion_id,
      confidence: tag.confidence,
      is_primary: tag.is_primary,
      name: emotionById.get(tag.emotion_id)?.name ?? tag.emotion_id,
      name_vi: emotionById.get(tag.emotion_id)?.name_vi ?? null,
    })),
    emotions: emotions ?? [],
  });
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
    classification?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const classification =
    body.classification === undefined
      ? null
      : parseClassification(body.classification);
  if (body.classification !== undefined && !classification) {
    return NextResponse.json(
      { error: "Classification needs valence, arousal, and 1-3 emotion tags." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  if (classification) {
    const { data: emotions } = await supabase.from("emotions").select("id");
    const validIds = new Set((emotions ?? []).map((emotion) => emotion.id));
    if (classification.tags.some((tag) => !validIds.has(tag.id))) {
      return NextResponse.json(
        { error: "One or more emotion tags are invalid." },
        { status: 400 },
      );
    }
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

  if (Object.keys(update).length === 0 && !classification) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const now = new Date().toISOString();
  if (classification) {
    const quadrant =
      classification.valence >= 0 && classification.arousal >= 0
        ? "Q1_happy"
        : classification.valence < 0 && classification.arousal >= 0
          ? "Q2_angry"
          : classification.valence < 0 && classification.arousal < 0
            ? "Q3_sad"
            : "Q4_relaxed";

    const { error: analysisError } = await supabase
      .from("song_analysis")
      .upsert(
        {
          song_id: id,
          valence: classification.valence,
          arousal: classification.arousal,
          quadrant,
          model: "manual",
          taxonomy_version: TAXONOMY_VERSION,
          rationale: classification.rationale,
          needs_review: classification.needs_review,
          analyzed_at: now,
        },
        { onConflict: "song_id,taxonomy_version" },
      );
    if (analysisError) {
      return NextResponse.json(
        { error: analysisError.message },
        { status: 500 },
      );
    }

    const { error: deleteError } = await supabase
      .from("song_emotions")
      .delete()
      .eq("song_id", id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error: tagError } = await supabase.from("song_emotions").insert(
      classification.tags.map((tag) => ({
        song_id: id,
        emotion_id: tag.id,
        confidence: tag.confidence,
        is_primary: tag.is_primary,
        source: "manual" as const,
      })),
    );
    if (tagError) {
      return NextResponse.json({ error: tagError.message }, { status: 500 });
    }
  }

  const songSelect =
    "id,title,artist,year,youtube_url,youtube_video_id,youtube_title,youtube_channel,youtube_updated_at,lyrics_text,lyrics_source,lyrics_source_url,lyrics_updated_at";
  const { data: song, error } =
    Object.keys(update).length > 0
      ? await supabase
          .from("catalog_songs")
          .update(update)
          .eq("id", id)
          .select(songSelect)
          .maybeSingle()
      : await supabase
          .from("catalog_songs")
          .select(songSelect)
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
