import { NextResponse } from "next/server";

import { ALBUM_MAX_TRACKS, ALBUM_MIN_TRACKS } from "@/lib/albums";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const ROLES = new Set([
  "opener",
  "build",
  "ride",
  "centerpiece",
  "release",
  "finale",
  "track",
]);

interface SaveTrack {
  songId: string;
  position: number;
  role: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonObject(value: unknown): Json {
  if (!isRecord(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Json;
  } catch {
    return {};
  }
}

function parseTracks(value: unknown): SaveTrack[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const songId = typeof item.songId === "string" ? item.songId : "";
      if (!songId || seen.has(songId)) return null;
      seen.add(songId);
      const position =
        Number.isInteger(item.position) && Number(item.position) >= 0
          ? Number(item.position)
          : index;
      const role =
        typeof item.role === "string" && ROLES.has(item.role)
          ? item.role
          : "track";
      return { songId, position, role };
    })
    .filter((item): item is SaveTrack => item !== null)
    .slice(0, ALBUM_MAX_TRACKS);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 100) : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 500)
      : null;
  const tracks = parseTracks(body.tracks);
  if (title.length === 0) {
    return NextResponse.json(
      { error: "Give the album a name before saving." },
      { status: 400 },
    );
  }
  if (tracks.length < ALBUM_MIN_TRACKS) {
    return NextResponse.json(
      { error: "An album needs at least three tracks." },
      { status: 400 },
    );
  }

  const songIds = tracks.map((track) => track.songId);
  const { data: catalogRows, error: catalogError } = await supabase
    .from("catalog_songs")
    .select("id,title,artist,youtube_video_id,youtube_channel")
    .in("id", songIds);
  if (catalogError) {
    return NextResponse.json({ error: catalogError.message }, { status: 500 });
  }
  const validSongs = new Set(
    (catalogRows ?? [])
      .filter((song) => Boolean(song.youtube_video_id))
      .map((song) => song.id),
  );
  if (tracks.some((track) => !validSongs.has(track.songId))) {
    return NextResponse.json(
      { error: "One or more tracks are no longer available." },
      { status: 409 },
    );
  }

  const catalogById = new Map(
    (catalogRows ?? []).map((song) => [song.id, song]),
  );
  const orderedTracks = [...tracks].sort(
    (a, b) => a.position - b.position,
  );

  const coverVideoIds = Array.isArray(body.coverVideoIds)
    ? body.coverVideoIds
        .filter((value): value is string => typeof value === "string")
        .slice(0, 4)
    : [];
  const { data: album, error: albumError } = await supabase
    .from("albums")
    .insert({
      user_id: user.id,
      title,
      description,
      config: jsonObject(body.config),
      stats: jsonObject(body.stats),
      track_count: tracks.length,
      cover_video_ids: coverVideoIds,
    })
    .select("id")
    .single();

  if (albumError || !album) {
    return NextResponse.json(
      { error: albumError?.message ?? "Could not save the album." },
      { status: 500 },
    );
  }

  const { error: trackError } = await supabase.from("album_songs").insert(
    tracks.map((track) => ({
      album_id: album.id,
      song_id: track.songId,
      position: track.position,
      role: track.role,
    })),
  );
  if (trackError) {
    await supabase.from("albums").delete().eq("id", album.id);
    return NextResponse.json({ error: trackError.message }, { status: 500 });
  }

  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .insert({ user_id: user.id, name: title })
    .select("id")
    .single();
  if (playlistError || !playlist) {
    await supabase.from("albums").delete().eq("id", album.id);
    return NextResponse.json(
      { error: playlistError?.message ?? "Could not create the playlist." },
      { status: 500 },
    );
  }

  const uniqueVideos = new Map<
    string,
    { title: string; artist: string; channel: string | null }
  >();
  for (const track of orderedTracks) {
    const catalog = catalogById.get(track.songId);
    if (!catalog?.youtube_video_id) continue;
    uniqueVideos.set(catalog.youtube_video_id, {
      title: catalog.title,
      artist: catalog.artist,
      channel: catalog.youtube_channel,
    });
  }

  const { error: libraryError } = await supabase.from("songs").upsert(
    [...uniqueVideos.entries()].map(([videoId, song]) => ({
      user_id: user.id,
      youtube_video_id: videoId,
      title: song.title,
      channel_title: song.channel ?? song.artist,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    })),
    { onConflict: "user_id,youtube_video_id" },
  );
  if (libraryError) {
    await supabase.from("playlists").delete().eq("id", playlist.id);
    await supabase.from("albums").delete().eq("id", album.id);
    return NextResponse.json({ error: libraryError.message }, { status: 500 });
  }

  const { data: librarySongs, error: libraryReadError } = await supabase
    .from("songs")
    .select("id,youtube_video_id")
    .eq("user_id", user.id)
    .in("youtube_video_id", [...uniqueVideos.keys()]);
  if (libraryReadError) {
    await supabase.from("playlists").delete().eq("id", playlist.id);
    await supabase.from("albums").delete().eq("id", album.id);
    return NextResponse.json(
      { error: libraryReadError.message },
      { status: 500 },
    );
  }

  const libraryIdByVideo = new Map(
    (librarySongs ?? []).map((song) => [song.youtube_video_id, song.id]),
  );
  const seenSongIds = new Set<string>();
  const playlistRows: {
    playlist_id: string;
    song_id: string;
    position: number;
  }[] = [];
  for (const track of orderedTracks) {
    const catalog = catalogById.get(track.songId);
    if (!catalog?.youtube_video_id) continue;
    const songId = libraryIdByVideo.get(catalog.youtube_video_id);
    if (!songId || seenSongIds.has(songId)) continue;
    seenSongIds.add(songId);
    playlistRows.push({
      playlist_id: playlist.id,
      song_id: songId,
      position: playlistRows.length,
    });
  }

  if (playlistRows.length === 0) {
    await supabase.from("playlists").delete().eq("id", playlist.id);
    await supabase.from("albums").delete().eq("id", album.id);
    return NextResponse.json(
      { error: "Could not add the album tracks to the playlist." },
      { status: 500 },
    );
  }

  const { error: playlistSongError } = await supabase
    .from("playlist_songs")
    .insert(playlistRows);
  if (playlistSongError) {
    await supabase.from("playlists").delete().eq("id", playlist.id);
    await supabase.from("albums").delete().eq("id", album.id);
    return NextResponse.json(
      { error: playlistSongError.message },
      { status: 500 },
    );
  }

  const { error: linkError } = await supabase
    .from("albums")
    .update({ playlist_id: playlist.id })
    .eq("id", album.id);
  if (linkError) {
    await supabase.from("playlists").delete().eq("id", playlist.id);
    await supabase.from("albums").delete().eq("id", album.id);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ id: album.id, playlistId: playlist.id });
}
