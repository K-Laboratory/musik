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
    .select("id,youtube_video_id")
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

  return NextResponse.json({ id: album.id });
}
