import { AlbumDesigner, type SavedAlbumSummary } from "@/components/albums/AlbumDesigner";
import { albumStatsFromJson } from "@/lib/album-db";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Album design - Favorite Songs" };
export const dynamic = "force-dynamic";

export default async function AlbumDesignPage() {
  const supabase = await createClient();
  const [
    generationsResult,
    emotionsResult,
    albumsResult,
    oldestYearResult,
    newestYearResult,
  ] = await Promise.all([
      supabase
        .from("generations")
        .select("id,label_en,label_vi,position")
        .order("position"),
      supabase
        .from("emotions")
        .select("id,name,name_vi,valence,arousal,quadrant")
        .order("name"),
      supabase
        .from("albums")
        .select(
          "id,title,description,track_count,cover_video_ids,created_at,stats",
        )
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("catalog_songs")
        .select("year")
        .not("year", "is", null)
        .order("year", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("catalog_songs")
        .select("year")
        .not("year", "is", null)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (generationsResult.error) throw new Error(generationsResult.error.message);
  if (emotionsResult.error) throw new Error(emotionsResult.error.message);

  const generations = generationsResult.data ?? [];
  const counts = await Promise.all(
    generations.map((generation) =>
      supabase
        .from("catalog_songs")
        .select("id", { count: "exact", head: true })
        .eq("generation_id", generation.id),
    ),
  );
  const yearMin = oldestYearResult.data?.year ?? 1940;
  const yearMax =
    newestYearResult.data?.year ?? new Date().getFullYear();
  const initialAlbums: SavedAlbumSummary[] = (albumsResult.data ?? []).map(
    (album) => ({
      id: album.id,
      title: album.title,
      description: album.description,
      trackCount: album.track_count,
      coverVideoIds: album.cover_video_ids ?? [],
      createdAt: album.created_at,
      stats: albumStatsFromJson(album.stats),
    }),
  );

  return (
    <AlbumDesigner
      generations={generations.map((generation, index) => ({
        ...generation,
        songCount: counts[index]?.count ?? 0,
      }))}
      emotions={emotionsResult.data ?? []}
      yearMin={yearMin}
      yearMax={yearMax}
      initialAlbums={initialAlbums}
    />
  );
}
