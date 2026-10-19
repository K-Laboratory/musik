import { SongTable, type AdminSongRow } from "@/components/admin/SongTable";
import { SongsFilter } from "@/components/admin/SongsFilter";
import { SongsPagination } from "@/components/admin/SongsPagination";
import { AdminText } from "@/lib/admin-i18n";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Songs - Admin" };

const PAGE_SIZE = 50;

/** PostgREST likes `%` escaped in ilike patterns. */
function likeValue(value: string): string {
  return `%${value.replace(/[%_]/g, "")}%`;
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
  searchParams: Promise<{ q?: string; gen?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const gen = params.gen ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let request = supabase
    .from("catalog_songs")
    .select("*", { count: "exact" });

  if (query) {
    request = request.or(
      `title.ilike.${likeValue(query)},artist.ilike.${likeValue(query)}`,
    );
  }
  if (gen) request = request.eq("generation_id", gen);

  const { data: songs, count } = await request
    .order("year", { ascending: true })
    .order("title", { ascending: true })
    .range(from, to);

  const songIds = (songs ?? []).map((s) => s.id);

  const [{ data: gens }, { data: emotionRows }, { data: analysisRows }, { data: emotions }] =
    await Promise.all([
      supabase.from("generations").select("*").order("position", { ascending: true }),
      songIds.length
        ? supabase.from("song_emotions").select("*").in("song_id", songIds)
        : Promise.resolve({ data: [] as { song_id: string; emotion_id: string; confidence: number; is_primary: boolean }[] }),
      songIds.length
        ? supabase.from("song_analysis").select("*").in("song_id", songIds)
        : Promise.resolve({ data: [] as { song_id: string; quadrant: string | null; valence: number | null; arousal: number | null; needs_review: boolean; analyzed_at: string; model: string | null }[] }),
      supabase.from("emotions").select("id, name"),
    ]);

  const emotionName = new Map((emotions ?? []).map((e) => [e.id, e.name]));

  const tagsBySong = new Map<string, { name: string; confidence: number; is_primary: boolean }[]>();
  for (const row of emotionRows ?? []) {
    const list = tagsBySong.get(row.song_id) ?? [];
    list.push({
      name: emotionName.get(row.emotion_id) ?? row.emotion_id,
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
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            <AdminText k="songsTitle" />
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            <AdminText k="songCount" values={{ count: total }} />
          </p>
        </div>
        <SongsFilter query={query} gen={gen} generations={gens ?? []} />
      </div>

      <SongTable
        songs={rows}
        startIndex={from}
        pageKey={`${query}|${gen}|${page}`}
      />

      <SongsPagination page={page} pages={pages} query={query} gen={gen} />
    </div>
  );
}
