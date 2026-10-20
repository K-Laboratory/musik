import { NextResponse } from "next/server";

import { loadAlbumCatalog } from "@/lib/album-catalog.server";
import { buildAlbum } from "@/lib/album-selector";
import {
  ALBUM_MAX_TRACKS,
  ALBUM_MIN_TRACKS,
  type AlbumConfig,
  type AlbumEnergy,
} from "@/lib/albums";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ENERGY_VALUES = new Set<AlbumEnergy>([
  "any",
  "gentle",
  "uplifting",
  "intense",
  "melancholic",
]);

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 24);
}

function integerOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseConfig(body: unknown): AlbumConfig {
  const value =
    body !== null && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const energy =
    typeof value.energy === "string" &&
    ENERGY_VALUES.has(value.energy as AlbumEnergy)
      ? (value.energy as AlbumEnergy)
      : "any";
  const requestedCount = Number(value.count ?? 16);
  const count = Math.max(
    ALBUM_MIN_TRACKS,
    Math.min(
      ALBUM_MAX_TRACKS,
      Number.isFinite(requestedCount) ? Math.round(requestedCount) : 16,
    ),
  );
  const requestedMainstream = Number(value.mainstream ?? 65);
  const mainstream = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(requestedMainstream) ? Math.round(requestedMainstream) : 65,
    ),
  );

  return {
    generationIds: stringArray(value.generationIds),
    emotionIds: stringArray(value.emotionIds),
    yearFrom: integerOrNull(value.yearFrom),
    yearTo: integerOrNull(value.yearTo),
    count,
    mainstream,
    energy,
    onePerArtist: value.onePerArtist !== false,
    language: value.language === "vi" ? "vi" : "en",
    title:
      typeof value.title === "string"
        ? value.title.trim().slice(0, 100)
        : undefined,
  };
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

  try {
    const config = parseConfig(body);
    const dataset = await loadAlbumCatalog(supabase);
    if (dataset.candidates.length === 0) {
      return NextResponse.json(
        { error: "No playable songs are available in the catalog." },
        { status: 503 },
      );
    }

    const album = buildAlbum({
      candidates: dataset.candidates,
      generations: dataset.generations,
      config,
      seed: Math.floor(Math.random() * 2_147_483_647),
    });
    return NextResponse.json({ album });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not design the album.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
