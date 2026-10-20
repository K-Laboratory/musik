import {
  ALBUM_MAX_TRACKS,
  ALBUM_MIN_TRACKS,
  type AlbumConfig,
  type AlbumEnergy,
  type AlbumStats,
} from "@/lib/albums";
import type { Json } from "@/lib/database.types";

const ENERGIES = new Set<AlbumEnergy>([
  "any",
  "gentle",
  "uplifting",
  "intense",
  "melancholic",
]);

function recordOf(value: Json): Record<string, Json | undefined> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, Json | undefined>;
}

function finite(value: Json | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function strings(value: Json | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function albumStatsFromJson(value: Json): AlbumStats {
  const record = recordOf(value);
  const nullable = (key: string) => {
    const item = record[key];
    return typeof item === "number" && Number.isFinite(item) ? item : null;
  };
  return {
    averagePopularity: finite(record.averagePopularity),
    anchors: finite(record.anchors),
    discoveries: finite(record.discoveries),
    generations: finite(record.generations),
    emotions: finite(record.emotions),
    yearFrom: nullable("yearFrom"),
    yearTo: nullable("yearTo"),
  };
}

export function albumConfigFromJson(
  value: Json,
  title = "",
): AlbumConfig {
  const record = recordOf(value);
  const energy =
    typeof record.energy === "string" &&
    ENERGIES.has(record.energy as AlbumEnergy)
      ? (record.energy as AlbumEnergy)
      : "any";
  const yearFrom = finite(record.yearFrom, 0) || null;
  const yearTo = finite(record.yearTo, 0) || null;
  return {
    generationIds: strings(record.generationIds),
    emotionIds: strings(record.emotionIds),
    yearFrom,
    yearTo,
    count: Math.max(
      ALBUM_MIN_TRACKS,
      Math.min(ALBUM_MAX_TRACKS, finite(record.count, 16)),
    ),
    mainstream: Math.max(0, Math.min(100, finite(record.mainstream, 65))),
    energy,
    onePerArtist: record.onePerArtist !== false,
    language: record.language === "vi" ? "vi" : "en",
    title:
      typeof record.title === "string" && record.title.trim()
        ? record.title.trim()
        : title,
  };
}
