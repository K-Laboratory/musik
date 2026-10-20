import Link from "next/link";
import { cookies } from "next/headers";

import { SavedAlbumClient } from "@/components/albums/SavedAlbumClient";
import { AlertIcon } from "@/components/Icons";
import { ALBUM_COPY } from "@/lib/album-copy";
import { albumConfigFromJson, albumStatsFromJson } from "@/lib/album-db";
import {
  youtubeThumbnail,
  type AlbumRole,
  type AlbumSignal,
  type AlbumTrack,
  type AlbumView,
} from "@/lib/albums";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Album - Favorite Songs" };
export const dynamic = "force-dynamic";

const ROLES = new Set<AlbumRole>([
  "opener",
  "build",
  "ride",
  "centerpiece",
  "release",
  "finale",
]);

function popularityTier(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 75) return "Viral";
  if (score >= 55) return "Popular";
  if (score >= 35) return "Established";
  if (score >= 15) return "Niche";
  return "Deep cut";
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const language =
    cookieStore.get("musik_lang")?.value === "vi" ? "vi" : "en";
  const copy = ALBUM_COPY[language];
  const supabase = await createClient();

  const { data: album } = await supabase
    .from("albums")
    .select(
      "id,title,description,config,stats,track_count,cover_video_ids,created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!album) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/70 text-slate-400">
          <AlertIcon className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-white">{copy.albumNotFound}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {copy.albumNotFoundHint}
        </p>
        <Link
          href="/albums/design"
          className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
        >
          {copy.backToStudio}
        </Link>
      </div>
    );
  }

  const { data: entries } = await supabase
    .from("album_songs")
    .select("song_id,position,role")
    .eq("album_id", album.id)
    .order("position");
  const orderedEntries = entries ?? [];
  const songIds = orderedEntries.map((entry) => entry.song_id);
  if (songIds.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
        <h1 className="text-lg font-semibold text-white">{copy.albumNotFound}</h1>
        <Link href="/albums/design" className="mt-4 inline-flex text-sm text-violet-300">
          {copy.backToStudio}
        </Link>
      </div>
    );
  }

  const [
    { data: songs },
    { data: tags },
    { data: emotions },
    { data: generations },
  ] = await Promise.all([
    supabase
      .from("catalog_songs")
      .select(
        "id,title,artist,year,generation_id,youtube_video_id,youtube_channel,popularity_score",
      )
      .in("id", songIds),
    supabase
      .from("song_emotions")
      .select("song_id,emotion_id,confidence,is_primary")
      .in("song_id", songIds),
    supabase.from("emotions").select("id,name,name_vi"),
    supabase.from("generations").select("id,label_en,label_vi,position"),
  ]);

  const songById = new Map((songs ?? []).map((song) => [song.id, song]));
  const emotionById = new Map(
    (emotions ?? []).map((emotion) => [emotion.id, emotion]),
  );
  const generationById = new Map(
    (generations ?? []).map((generation) => [generation.id, generation]),
  );
  const tagsBySong = new Map<
    string,
    {
      id: string;
      name: string;
      nameVi: string | null;
      confidence: number;
      isPrimary: boolean;
    }[]
  >();
  for (const tag of tags ?? []) {
    const emotion = emotionById.get(tag.emotion_id);
    if (!emotion) continue;
    const list = tagsBySong.get(tag.song_id) ?? [];
    list.push({
      id: emotion.id,
      name: emotion.name,
      nameVi: emotion.name_vi,
      confidence: tag.confidence,
      isPrimary: tag.is_primary,
    });
    tagsBySong.set(tag.song_id, list);
  }

  const config = albumConfigFromJson(album.config, album.title);
  const tracks: AlbumTrack[] = orderedEntries
    .map((entry): AlbumTrack | null => {
      const song = songById.get(entry.song_id);
      if (!song?.youtube_video_id) return null;
      const songTags = [...(tagsBySong.get(song.id) ?? [])].sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          b.confidence - a.confidence,
      );
      const generation = song.generation_id
        ? generationById.get(song.generation_id)
        : null;
      const signals: AlbumSignal[] = [];
      if ((song.popularity_score ?? 0) >= 55) signals.push("anchor");
      if ((song.popularity_score ?? 100) < 35) signals.push("discovery");
      if (
        songTags.some(
          (tag) => tag.isPrimary && config.emotionIds.includes(tag.id),
        )
      ) {
        signals.push("emotion");
      }
      if (
        song.generation_id &&
        config.generationIds.includes(song.generation_id)
      ) {
        signals.push("era");
      }
      const role = ROLES.has(entry.role as AlbumRole)
        ? (entry.role as AlbumRole)
        : "ride";
      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        year: song.year,
        generationId: song.generation_id,
        generationLabel: generation
          ? language === "vi"
            ? generation.label_vi
            : generation.label_en
          : "",
        videoId: song.youtube_video_id,
        youtubeChannel: song.youtube_channel,
        popularityScore: song.popularity_score,
        popularityTier: popularityTier(song.popularity_score),
        thumbnailUrl: youtubeThumbnail(song.youtube_video_id),
        emotions: songTags.slice(0, 3).map((tag) => ({
          id: tag.id,
          name: tag.name,
          nameVi: tag.nameVi,
        })),
        role,
        signals: [...new Set(signals)].slice(0, 3),
      };
    })
    .filter((track): track is AlbumTrack => track !== null);

  const storedConfigLanguage = config.language;
  const description =
    storedConfigLanguage === language
      ? album.description
      : language === "vi"
        ? `${tracks.length} bản nhạc được tuyển chọn và sắp xếp thành một album có mở đầu, cao trào và kết thúc.`
        : `${tracks.length} tracks curated and sequenced into an album with a clear opening, center, and finish.`;
  const albumView: AlbumView = {
    id: album.id,
    title: album.title,
    description,
    config,
    stats: albumStatsFromJson(album.stats),
    tracks,
    relaxations: [],
    createdAt: album.created_at,
  };

  return <SavedAlbumClient album={albumView} />;
}
