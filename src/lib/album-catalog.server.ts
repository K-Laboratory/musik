import "server-only";

import type { AlbumEmotionTag } from "@/lib/albums";
import type {
  AlbumCandidateSong,
  AlbumGeneration,
} from "@/lib/album-selector";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface AlbumCatalogDataset {
  candidates: AlbumCandidateSong[];
  generations: AlbumGeneration[];
}

interface CatalogRow {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  generation_id: string | null;
  youtube_video_id: string | null;
  youtube_channel: string | null;
  popularity_score: number | null;
}

interface TagRow {
  id: string;
  song_id: string;
  emotion_id: string;
  confidence: number;
  is_primary: boolean;
}

interface EmotionRow {
  id: string;
  name: string;
  name_vi: string | null;
  valence: number;
  arousal: number;
  quadrant: string;
}

let cached: { expiresAt: number; dataset: AlbumCatalogDataset } | null = null;

async function catalogPage(
  supabase: Supabase,
  offset: number,
) {
  return supabase
    .from("catalog_songs")
    .select(
      "id,title,artist,year,generation_id,youtube_video_id,youtube_channel,popularity_score",
      { count: offset === 0 ? "exact" : undefined },
    )
    .not("youtube_video_id", "is", null)
    .order("id")
    .range(offset, offset + 999);
}

async function tagPage(supabase: Supabase, offset: number) {
  return supabase
    .from("song_emotions")
    .select("id,song_id,emotion_id,confidence,is_primary", {
      count: offset === 0 ? "exact" : undefined,
    })
    .order("id")
    .range(offset, offset + 999);
}

async function loadDataset(supabase: Supabase): Promise<AlbumCatalogDataset> {
  const [firstCatalog, firstTags, emotionsResult, generationsResult] =
    await Promise.all([
      catalogPage(supabase, 0),
      tagPage(supabase, 0),
      supabase
        .from("emotions")
        .select("id,name,name_vi,valence,arousal,quadrant")
        .order("id"),
      supabase
        .from("generations")
        .select("id,label_en,label_vi,position")
        .order("position"),
    ]);

  const baseError =
    firstCatalog.error ??
    firstTags.error ??
    emotionsResult.error ??
    generationsResult.error;
  if (baseError) throw new Error(baseError.message);

  const catalogCount = firstCatalog.count ?? firstCatalog.data?.length ?? 0;
  const tagCount = firstTags.count ?? firstTags.data?.length ?? 0;
  const catalogOffsets: number[] = [];
  const tagOffsets: number[] = [];

  for (let offset = 1000; offset < catalogCount; offset += 1000) {
    catalogOffsets.push(offset);
  }
  for (let offset = 1000; offset < tagCount; offset += 1000) {
    tagOffsets.push(offset);
  }

  const [catalogPages, tagPages] = await Promise.all([
    Promise.all(catalogOffsets.map((offset) => catalogPage(supabase, offset))),
    Promise.all(tagOffsets.map((offset) => tagPage(supabase, offset))),
  ]);

  const pageError =
    catalogPages.find((page) => page.error)?.error ??
    tagPages.find((page) => page.error)?.error ??
    null;
  if (pageError) throw new Error(pageError.message);

  const catalog = [
    ...(firstCatalog.data as CatalogRow[]),
    ...catalogPages.flatMap((page) => page.data as CatalogRow[]),
  ];
  const tags = [
    ...(firstTags.data as TagRow[]),
    ...tagPages.flatMap((page) => page.data as TagRow[]),
  ];
  const emotionRows = (emotionsResult.data ?? []) as EmotionRow[];
  const generationRows = (generationsResult.data ??
    []) as AlbumGeneration[];
  const emotionById = new Map(emotionRows.map((emotion) => [emotion.id, emotion]));
  const tagsBySong = new Map<string, AlbumEmotionTag[]>();

  for (const tag of tags) {
    const emotion = emotionById.get(tag.emotion_id);
    if (!emotion) continue;
    const list = tagsBySong.get(tag.song_id) ?? [];
    list.push({
      id: emotion.id,
      name: emotion.name,
      nameVi: emotion.name_vi,
      confidence: tag.confidence,
      isPrimary: tag.is_primary,
      valence: emotion.valence,
      arousal: emotion.arousal,
      quadrant: emotion.quadrant,
    });
    tagsBySong.set(tag.song_id, list);
  }

  return {
    candidates: catalog.map((song) => ({
      ...song,
      emotions: tagsBySong.get(song.id) ?? [],
    })),
    generations: generationRows,
  };
}

/**
 * The catalog is public to authenticated users, so a short warm-instance cache
 * keeps repeated design clicks fast without exposing any user data.
 */
export async function loadAlbumCatalog(
  supabase: Supabase,
): Promise<AlbumCatalogDataset> {
  if (cached && cached.expiresAt > Date.now()) return cached.dataset;
  const dataset = await loadDataset(supabase);
  cached = { expiresAt: Date.now() + 60_000, dataset };
  return dataset;
}
