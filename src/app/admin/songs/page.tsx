import { AlertIcon } from "@/components/Icons";
import { SongTable, type AdminSongRow } from "@/components/admin/SongTable";
import { SongsFilter } from "@/components/admin/SongsFilter";
import { SongsPagination } from "@/components/admin/SongsPagination";
import { AdminText } from "@/lib/admin-i18n";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import {
  hasActiveSongFilters,
  parseSongListFilters,
} from "@/lib/song-filters";

export const metadata = { title: "Songs - Admin" };

const TAXONOMY_VERSION = 1;

type CatalogRow = Database["public"]["Tables"]["catalog_songs"]["Row"];

/** PostgREST likes `%` escaped in ilike patterns. */
function likeValue(value: string): string {
  const cleaned = value
    .replace(/[%_,()\\*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? `%${cleaned}%` : "";
}

function lyricsPreview(text: string | null): string | null {
  if (!text) return null;
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length === 0) return null;
  return `${words.slice(0, 12).join(" ")}${words.length > 12 ? "..." : ""}`;
}

export default async function AdminSongsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseSongListFilters(await searchParams);
  const {
    q,
    gen,
    content,
    classification,
    emotion,
    yearFrom,
    yearTo,
    sort,
    perPage,
    page,
  } = filters;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const effectiveSort =
    classification === "not_classified" && sort === "recently_analyzed"
      ? "title_asc"
      : sort;

  const supabase = await createClient();

  const needsEmotionJoin = Boolean(emotion);
  const needsAnalysisInner =
    classification === "classified" ||
    classification === "needs_review" ||
    effectiveSort === "recently_analyzed";
  const needsAnalysisLeft = classification === "not_classified";

  let selectClause = "*";
  if (needsAnalysisInner) selectClause += ", song_analysis!inner(id)";
  else if (needsAnalysisLeft) selectClause += ", song_analysis!left(id)";
  if (needsEmotionJoin) selectClause += ", song_emotions!inner(emotion_id)";

  let request = supabase
    .from("catalog_songs")
    .select(selectClause, { count: "exact" });

  if (q) {
    const like = likeValue(q);
    if (like) request = request.or(`title.ilike.${like},artist.ilike.${like}`);
  }
  if (gen) request = request.eq("generation_id", gen);
  if (emotion) request = request.eq("song_emotions.emotion_id", emotion);

  switch (content) {
    case "youtube_missing":
      request = request.is("youtube_url", null);
      break;
    case "youtube_present":
      request = request.not("youtube_url", "is", null);
      break;
    case "lyrics_missing":
      request = request.is("lyrics_text", null);
      break;
    case "lyrics_present":
      request = request.not("lyrics_text", "is", null);
      break;
    case "both_present":
      request = request
        .not("youtube_url", "is", null)
        .not("lyrics_text", "is", null);
      break;
    default:
      break;
  }

  if (yearFrom !== null) request = request.gte("year", yearFrom);
  if (yearTo !== null) request = request.lte("year", yearTo);

  if (classification === "classified" || classification === "needs_review") {
    request = request.eq("song_analysis.taxonomy_version", TAXONOMY_VERSION);
  }
  if (classification === "needs_review") {
    request = request.eq("song_analysis.needs_review", true);
  }
  if (classification === "not_classified") {
    request = request.is("song_analysis", null);
  }

  switch (effectiveSort) {
    case "year_desc":
      request = request
        .order("year", { ascending: false, nullsFirst: false })
        .order("title", { ascending: true });
      break;
    case "title_asc":
      request = request
        .order("title", { ascending: true })
        .order("artist", { ascending: true });
      break;
    case "title_desc":
      request = request
        .order("title", { ascending: false })
        .order("artist", { ascending: true });
      break;
    case "artist_asc":
      request = request
        .order("artist", { ascending: true })
        .order("year", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true });
      break;
    case "recently_analyzed":
      request = request
        .order("analyzed_at", {
          referencedTable: "song_analysis",
          ascending: false,
        })
        .order("title", { ascending: true });
      break;
    case "recently_added":
      request = request
        .order("created_at", { ascending: false })
        .order("title", { ascending: true });
      break;
    case "lyrics_updated":
      request = request
        .order("lyrics_updated_at", {
          ascending: false,
          nullsFirst: false,
        })
        .order("title", { ascending: true });
      break;
    default:
      request = request
        .order("year", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true });
      break;
  }

  const [songsResult, { data: gens }, { data: emotions }] = await Promise.all([
    request.range(from, to),
    supabase.from("generations").select("*").order("position", {
      ascending: true,
    }),
    supabase.from("emotions").select("id, name, name_vi").order("name", {
      ascending: true,
    }),
  ]);

  const songs = (songsResult.data ?? []) as unknown as CatalogRow[];
  const count = songsResult.count;
  const loadError = songsResult.error?.message ?? "";

  const songIds = (songs ?? []).map((s) => s.id);

  const [{ data: emotionRows }, { data: analysisRows }] = await Promise.all([
    songIds.length
      ? supabase.from("song_emotions").select("*").in("song_id", songIds)
      : Promise.resolve({
          data: [] as {
            song_id: string;
            emotion_id: string;
            confidence: number;
            is_primary: boolean;
          }[],
        }),
    songIds.length
      ? supabase
          .from("song_analysis")
          .select(
            "song_id, quadrant, valence, arousal, needs_review, analyzed_at, model",
          )
          .in("song_id", songIds)
          .eq("taxonomy_version", TAXONOMY_VERSION)
      : Promise.resolve({
          data: [] as {
            song_id: string;
            quadrant: string | null;
            valence: number | null;
            arousal: number | null;
            needs_review: boolean;
            analyzed_at: string;
            model: string | null;
          }[],
        }),
  ]);

  const emotionById = new Map((emotions ?? []).map((e) => [e.id, e]));

  const tagsBySong = new Map<
    string,
    {
      id: string;
      name: string;
      name_vi: string | null;
      confidence: number;
      is_primary: boolean;
    }[]
  >();
  for (const row of emotionRows ?? []) {
    const list = tagsBySong.get(row.song_id) ?? [];
    const emotion = emotionById.get(row.emotion_id);
    list.push({
      id: row.emotion_id,
      name: emotion?.name ?? row.emotion_id,
      name_vi: emotion?.name_vi ?? null,
      confidence: row.confidence,
      is_primary: row.is_primary,
    });
    tagsBySong.set(row.song_id, list);
  }
  for (const list of tagsBySong.values()) list.sort((a, b) => b.confidence - a.confidence);

  const analysisBySong = new Map((analysisRows ?? []).map((a) => [a.song_id, a]));

  const rows: AdminSongRow[] = (songs ?? []).map((song) => {
    const analysis = analysisBySong.get(song.id);
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      year: song.year,
      source: song.source,
      source_id: song.source_id,
      source_url: song.source_url,
      youtube_url: song.youtube_url,
      youtube_title: song.youtube_title,
      youtube_channel: song.youtube_channel,
      lyrics_preview: lyricsPreview(song.lyrics_text),
      lyrics_text: song.lyrics_text,
      lyrics_source: song.lyrics_source,
      has_lyrics: Boolean(song.lyrics_text),
      tags: tagsBySong.get(song.id) ?? [],
      analysis: analysis
        ? {
            valence: analysis.valence,
            arousal: analysis.arousal,
            needs_review: analysis.needs_review,
            analyzed_at: analysis.analyzed_at,
            model: analysis.model,
          }
        : null,
    };
  });

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const activeFilters = hasActiveSongFilters(filters);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          <AdminText k="songsTitle" />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          <AdminText
            k={activeFilters ? "songMatchCount" : "songCount"}
            values={{ count: total }}
          />
        </p>
      </div>

      <SongsFilter
        filters={filters}
        generations={gens ?? []}
        emotions={emotions ?? []}
      />

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <AdminText k="songsLoadFailed" /> {loadError}
          </span>
        </div>
      )}

      <SongTable
        songs={rows}
        startIndex={from}
        pageKey={JSON.stringify(filters)}
      />

      <SongsPagination page={page} pages={pages} filters={filters} />
    </div>
  );
}
