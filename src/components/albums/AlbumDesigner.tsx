"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useData } from "@/components/DataProvider";
import {
  CheckIcon,
  MusicIcon,
  RefreshIcon,
  SparklesIcon,
  SpinnerIcon,
} from "@/components/Icons";
import { AlbumCollection } from "@/components/albums/AlbumCollection";
import { AlbumCover } from "@/components/albums/AlbumCover";
import { ALBUM_COPY } from "@/lib/album-copy";
import {
  ALBUM_MAX_TRACKS,
  ALBUM_MIN_TRACKS,
  type AlbumConfig,
  type AlbumEnergy,
  type AlbumStats,
  type AlbumView,
} from "@/lib/albums";
import { useLanguage } from "@/lib/disguise";

export interface StudioEmotion {
  id: string;
  name: string;
  name_vi: string | null;
  valence: number;
  arousal: number;
  quadrant: string;
}

export interface StudioGeneration {
  id: string;
  label_en: string;
  label_vi: string;
  position: number;
}

export interface SavedAlbumSummary {
  id: string;
  title: string;
  description: string | null;
  trackCount: number;
  coverVideoIds: string[];
  createdAt: string;
  stats: AlbumStats;
}

interface GenerateResponse {
  album?: AlbumView;
  error?: string;
}

const QUADRANT_DOT: Record<string, string> = {
  Q1_happy: "bg-amber-300",
  Q2_angry: "bg-rose-400",
  Q3_sad: "bg-sky-400",
  Q4_relaxed: "bg-emerald-400",
};

const PRESETS = [
  {
    key: "lateNight" as const,
    emotions: ["dreamy", "brooding", "bittersweet"],
    energy: "any" as AlbumEnergy,
    mainstream: 58,
    generations: [] as string[],
  },
  {
    key: "goldenHour" as const,
    emotions: ["nostalgic", "tender", "bittersweet"],
    energy: "gentle" as AlbumEnergy,
    mainstream: 70,
    generations: ["pre1975", "genx"],
  },
  {
    key: "mainCharacter" as const,
    emotions: ["euphoric", "triumphant", "funky"],
    energy: "uplifting" as AlbumEnergy,
    mainstream: 82,
    generations: [] as string[],
  },
  {
    key: "healing" as const,
    emotions: ["sad", "bittersweet", "tender"],
    energy: "melancholic" as AlbumEnergy,
    mainstream: 48,
    generations: [] as string[],
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function labelForGeneration(
  generation: StudioGeneration,
  language: "en" | "vi",
): string {
  return language === "vi" ? generation.label_vi : generation.label_en;
}

function emotionPosition(emotion: StudioEmotion) {
  return {
    left: `${8 + ((clamp(emotion.valence, -2, 2) + 2) / 4) * 84}%`,
    top: `${8 + (1 - (clamp(emotion.arousal, -2, 2) + 2) / 4) * 84}%`,
  };
}

export function AlbumDesigner({
  generations,
  emotions,
  yearMin,
  yearMax,
  initialAlbums,
}: {
  generations: StudioGeneration[];
  emotions: StudioEmotion[];
  yearMin: number;
  yearMax: number;
  initialAlbums: SavedAlbumSummary[];
}) {
  const router = useRouter();
  const { notify, refresh } = useData();
  const { language } = useLanguage();
  const copy = ALBUM_COPY[language];
  const [selectedGenerationIds, setSelectedGenerationIds] = useState<string[]>(
    [],
  );
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<string[]>([]);
  const [emotionStrengths, setEmotionStrengths] = useState<Record<string, number>>({});
  const [yearRange, setYearRange] = useState<[number, number]>([yearMin, yearMax]);
  const [yearRangeActive, setYearRangeActive] = useState(false);
  const [count, setCount] = useState(16);
  const [mainstream, setMainstream] = useState(68);
  const [energy, setEnergy] = useState<AlbumEnergy>("any");
  const [onePerArtist, setOnePerArtist] = useState(true);
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<AlbumView | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAlbums, setSavedAlbums] =
    useState<SavedAlbumSummary[]>(initialAlbums);

  const selectedGenerationCount = selectedGenerationIds.length;
  const selectedEmotionCount = selectedEmotionIds.length;
  const activeEmotions = useMemo(
    () => emotions.filter((emotion) => selectedEmotionIds.includes(emotion.id)),
    [emotions, selectedEmotionIds],
  );

  function toggleValue(value: string, current: string[], setter: (next: string[]) => void) {
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleEmotion(emotionId: string) {
    if (selectedEmotionIds.includes(emotionId)) {
      setSelectedEmotionIds((current) => current.filter((id) => id !== emotionId));
      setEmotionStrengths((current) => {
        const next = { ...current };
        delete next[emotionId];
        return next;
      });
      return;
    }
    setSelectedEmotionIds((current) => [...current, emotionId]);
    setEmotionStrengths((current) => ({ ...current, [emotionId]: 50 }));
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setSelectedEmotionIds(preset.emotions);
    setEmotionStrengths(
      Object.fromEntries(preset.emotions.map((emotionId) => [emotionId, 65])),
    );
    setSelectedGenerationIds(preset.generations);
    setEnergy(preset.energy);
    setMainstream(preset.mainstream);
    setResult(null);
    setSavedId(null);
    setError(null);
    notify(copy.presetApplied, "info");
  }

  function clearFilters() {
    setSelectedGenerationIds([]);
    setSelectedEmotionIds([]);
    setEmotionStrengths({});
    setYearRange([yearMin, yearMax]);
    setYearRangeActive(false);
    setEnergy("any");
    setMainstream(68);
    setCount(16);
    setOnePerArtist(true);
    setTitle("");
    setResult(null);
    setSavedId(null);
    setError(null);
  }

  function requestBody(): AlbumConfig {
    return {
      generationIds: selectedGenerationIds,
      emotionIds: selectedEmotionIds,
      emotionStrengths,
      yearFrom: yearRangeActive ? yearRange[0] : null,
      yearTo: yearRangeActive ? yearRange[1] : null,
      count,
      mainstream,
      energy,
      onePerArtist,
      language,
      title: title.trim(),
    };
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setSavedId(null);

    try {
      const response = await fetch("/api/albums/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody()),
      });
      const payload = (await response.json()) as GenerateResponse;
      if (!response.ok || !payload.album) {
        throw new Error(payload.error || copy.generateError);
      }
      setResult(payload.album);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.generateError);
    } finally {
      setGenerating(false);
    }
  }

  async function saveAlbum() {
    if (!result || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          description: result.description,
          config: result.config,
          stats: result.stats,
          coverVideoIds: result.tracks.slice(0, 4).map((track) => track.videoId),
          tracks: result.tracks.map((track, index) => ({
            songId: track.songId,
            position: index,
            role: track.role,
          })),
        }),
      });
      const payload = (await response.json()) as {
        id?: string;
        playlistId?: string;
        error?: string;
      };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error || copy.saveError);
      }

      setSavedId(payload.id);
      notify(copy.saveSuccess, "success");
      setSavedAlbums((current) => [
        {
          id: payload.id!,
          title: result.title,
          description: result.description,
          trackCount: result.tracks.length,
          coverVideoIds: result.tracks.slice(0, 4).map((track) => track.videoId),
          createdAt: new Date().toISOString(),
          stats: result.stats,
        },
        ...current,
      ]);
      await refresh();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  const resultCover =
    result?.tracks.slice(0, 4).map((track) => track.videoId) ?? [];

  return (
    <div className="space-y-6">
      <header className="max-w-4xl">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">
          <SparklesIcon className="h-4 w-4" />
          {copy.studioEyebrow}
        </p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {copy.studioTitle}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          {copy.studioIntro}
        </p>
        <p className="mt-3 flex max-w-3xl items-start gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 text-xs leading-5 text-emerald-200">
          <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {copy.guarantee}
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/35">
            <div className="border-b border-slate-800 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {copy.presetHeading}
                </h2>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-slate-400 transition hover:text-white"
                >
                  {copy.clearFilters}
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-left transition hover:border-violet-500/40 hover:bg-violet-500/[0.06]"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-200 group-hover:text-white">
                        {copy.presets[preset.key].title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                        {copy.presets[preset.key].detail}
                      </span>
                    </span>
                    <SparklesIcon className="h-4 w-4 shrink-0 text-violet-400" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-5">
              <fieldset>
                <legend className="flex w-full items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>{copy.generationHeading}</span>
                  <span className="font-normal normal-case tracking-normal text-slate-600">
                    {selectedGenerationCount
                      ? copy.generationalMix(selectedGenerationCount)
                      : copy.allGenerations}
                  </span>
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={selectedGenerationCount === 0}
                    onClick={() => setSelectedGenerationIds([])}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      selectedGenerationCount === 0
                        ? "border-violet-500/60 bg-violet-500/15 text-violet-100"
                        : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {copy.allGenerations}
                  </button>
                  {generations.map((generation) => {
                    const selected = selectedGenerationIds.includes(generation.id);
                    return (
                      <button
                        key={generation.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          toggleValue(
                            generation.id,
                            selectedGenerationIds,
                            setSelectedGenerationIds,
                          )
                        }
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                          selected
                            ? "border-violet-500/60 bg-violet-500/15 text-violet-100"
                            : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <span className="block font-medium">
                          {labelForGeneration(generation, language)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="flex w-full items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>{copy.emotionHeading}</span>
                  <span className="flex items-center gap-2 font-normal normal-case tracking-normal text-slate-500">
                    {selectedEmotionCount
                      ? `${selectedEmotionCount} / ${emotions.length}`
                      : copy.anyMood}
                    {selectedEmotionCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmotionIds([]);
                          setEmotionStrengths({});
                        }}
                        className="text-violet-300 transition hover:text-white"
                      >
                        {copy.anyMood}
                      </button>
                    )}
                  </span>
                </legend>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {copy.emotionMapHint}
                </p>
                <div className="mt-3 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2">
                  <div className="flex h-64 flex-col items-end justify-between py-1 text-right text-[9px] text-slate-500 sm:h-72">
                    <span>{copy.highEnergy}</span>
                    <span className="-rotate-90 whitespace-nowrap text-[10px] font-medium uppercase tracking-wider">
                      {copy.energyHeading}
                    </span>
                    <span>{copy.lowEnergy}</span>
                  </div>
                  <div>
                  <div className="relative isolate h-64 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/60 sm:h-72">
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                      <div className="border-b border-r border-white/5 bg-rose-400/[0.055]" />
                      <div className="border-b border-white/5 bg-amber-300/[0.055]" />
                      <div className="border-r border-white/5 bg-sky-400/[0.055]" />
                      <div className="bg-emerald-400/[0.055]" />
                    </div>
                    <div className="absolute left-1/2 top-0 h-full border-l border-dashed border-slate-600/60" />
                    <div className="absolute left-0 top-1/2 w-full border-t border-dashed border-slate-600/60" />
                    {emotions.map((emotion) => {
                    const selected = selectedEmotionIds.includes(emotion.id);
                    const position = emotionPosition(emotion);
                    const name =
                      language === "vi"
                        ? emotion.name_vi ?? emotion.name
                        : emotion.name;
                    return (
                      <button
                        key={emotion.id}
                        type="button"
                        aria-pressed={selected}
                        aria-label={name}
                        title={name}
                        onClick={() => toggleEmotion(emotion.id)}
                        style={position}
                        className={`group absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                          selected
                            ? "scale-110 border-white bg-violet-500 text-white shadow-lg shadow-violet-950/50"
                            : "border-slate-950/70 text-slate-950 shadow-sm hover:z-20 hover:scale-110 hover:ring-2 hover:ring-white/70"
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            QUADRANT_DOT[emotion.quadrant] ?? "bg-slate-400"
                          }`}
                        />
                        <span className="pointer-events-none absolute bottom-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-xl group-hover:block group-focus-visible:block">
                          {name}
                        </span>
                      </button>
                    );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{copy.lowValence}</span>
                    <span>{copy.highValence}</span>
                  </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ["Q1_happy", copy.emotionQuadrants[0]],
                    ["Q2_angry", copy.emotionQuadrants[1]],
                    ["Q3_sad", copy.emotionQuadrants[2]],
                    ["Q4_relaxed", copy.emotionQuadrants[3]],
                  ].map(([quadrant, label]) => (
                    <div
                      key={quadrant}
                      className="rounded-lg border border-slate-800/80 bg-slate-950/35 p-2"
                    >
                      <p className="mb-1.5 text-[9px] font-medium text-slate-500">
                        {label}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {emotions
                          .filter((emotion) => emotion.quadrant === quadrant)
                          .map((emotion) => {
                            const selected = selectedEmotionIds.includes(emotion.id);
                            const name =
                              language === "vi"
                                ? emotion.name_vi ?? emotion.name
                                : emotion.name;
                            return (
                              <button
                                key={emotion.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleEmotion(emotion.id)}
                                className={`inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition ${selected ? "border-violet-400/60 bg-violet-500/15 text-violet-100" : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-white"}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${QUADRANT_DOT[emotion.quadrant] ?? "bg-slate-400"}`}
                                />
                                {name}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
                {activeEmotions.length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {activeEmotions.map((emotion) => {
                      const name =
                        language === "vi"
                          ? emotion.name_vi ?? emotion.name
                          : emotion.name;
                      const strength = emotionStrengths[emotion.id] ?? 50;
                      const strengthLabel =
                        strength < 34
                          ? copy.subtle
                          : strength < 67
                            ? copy.balanced
                            : copy.strong;
                      return (
                        <label
                          key={emotion.id}
                          className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                        >
                          <span className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex min-w-0 items-center gap-2 font-medium text-slate-200">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${QUADRANT_DOT[emotion.quadrant] ?? "bg-slate-400"}`}
                              />
                              <span className="truncate">{name}</span>
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-500">
                              {strengthLabel} · {strength}%
                            </span>
                          </span>
                          <span className="sr-only">{copy.emotionStrength}</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={strength}
                            aria-label={`${copy.emotionStrength}: ${name}`}
                            onChange={(event) =>
                              setEmotionStrengths((current) => ({
                                ...current,
                                [emotion.id]: Number(event.target.value),
                              }))
                            }
                            className="mt-1.5 h-4 w-full cursor-pointer accent-violet-400"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <div className="grid gap-5 lg:grid-cols-2">
                <fieldset>
                  <legend className="flex w-full items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <span>{copy.eraHeading}</span>
                    <span className="text-sm font-semibold normal-case tracking-normal text-slate-100">
                      {yearRangeActive
                        ? `${yearRange[0]}–${yearRange[1]}`
                        : copy.yearAll}
                    </span>
                  </legend>
                  <div className="mt-4">
                    <div className="relative h-7 px-2">
                      <div
                        className="absolute left-2 right-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                        style={{
                          background: yearRangeActive
                            ? `linear-gradient(to right, rgb(51 65 85) 0%, rgb(51 65 85) ${((yearRange[0] - yearMin) / Math.max(1, yearMax - yearMin)) * 100}%, rgb(139 92 246) ${((yearRange[0] - yearMin) / Math.max(1, yearMax - yearMin)) * 100}%, rgb(139 92 246) ${((yearRange[1] - yearMin) / Math.max(1, yearMax - yearMin)) * 100}%, rgb(51 65 85) ${((yearRange[1] - yearMin) / Math.max(1, yearMax - yearMin)) * 100}%, rgb(51 65 85) 100%)`
                            : "rgb(51 65 85)",
                        }}
                      />
                      <input
                        type="range"
                        min={yearMin}
                        max={yearMax}
                        value={yearRange[0]}
                        aria-label={copy.fromYear}
                        aria-valuetext={String(yearRange[0])}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setYearRange((current) => [
                            Math.min(next, current[1]),
                            current[1],
                          ]);
                          setYearRangeActive(true);
                        }}
                        className="pointer-events-none absolute inset-x-2 top-1/2 h-6 w-[calc(100%-1rem)] -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-950 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-950 [&::-webkit-slider-thumb]:bg-white"
                        style={{ zIndex: yearRange[0] >= yearRange[1] - 2 ? 30 : 20 }}
                      />
                      <input
                        type="range"
                        min={yearMin}
                        max={yearMax}
                        value={yearRange[1]}
                        aria-label={copy.toYear}
                        aria-valuetext={String(yearRange[1])}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setYearRange(([from]) => [from, Math.max(next, from)]);
                          setYearRangeActive(true);
                        }}
                        className="pointer-events-none absolute inset-x-2 top-1/2 h-6 w-[calc(100%-1rem)] -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-950 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-950 [&::-webkit-slider-thumb]:bg-white"
                        style={{ zIndex: yearRange[1] <= yearRange[0] + 2 ? 30 : 10 }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] tabular-nums text-slate-500">
                      <span>{yearMin}</span>
                      <span>{yearMax}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        aria-pressed={!yearRangeActive}
                        onClick={() => {
                          setYearRange([yearMin, yearMax]);
                          setYearRangeActive(false);
                        }}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${!yearRangeActive ? "border-violet-400/60 bg-violet-500/15 text-violet-100" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"}`}
                      >
                        {copy.yearAll}
                      </button>
                      {copy.yearRanges.map((range) => {
                        const from = Math.max(yearMin, range.from);
                        const to = Math.min(yearMax, range.to);
                        const selected =
                          yearRangeActive &&
                          yearRange[0] === from &&
                          yearRange[1] === to;
                        return (
                          <button
                            key={range.label}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              setYearRange([from, to]);
                              setYearRangeActive(true);
                            }}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${selected ? "border-violet-400/60 bg-violet-500/15 text-violet-100" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"}`}
                          >
                            {range.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="flex w-full items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <span>{copy.lengthHeading}</span>
                    <span className="font-normal normal-case tracking-normal text-violet-300">
                      {copy.tracksUnit(count)}
                    </span>
                  </legend>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={ALBUM_MIN_TRACKS}
                      max={ALBUM_MAX_TRACKS}
                      value={count}
                      onChange={(event) =>
                        setCount(clamp(Number(event.target.value), ALBUM_MIN_TRACKS, ALBUM_MAX_TRACKS))
                      }
                      className="min-w-0 flex-1 accent-violet-500"
                    />
                    <input
                      type="number"
                      min={ALBUM_MIN_TRACKS}
                      max={ALBUM_MAX_TRACKS}
                      value={count}
                      onChange={(event) =>
                        setCount(
                          clamp(
                            Number(event.target.value) || ALBUM_MIN_TRACKS,
                            ALBUM_MIN_TRACKS,
                            ALBUM_MAX_TRACKS,
                          ),
                        )
                      }
                      className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-sm tabular-nums text-white focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </fieldset>
              </div>

              <fieldset>
                <legend className="flex w-full items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>{copy.mixHeading}</span>
                  <span className="font-normal normal-case tracking-normal text-violet-300">
                    {mainstream}%
                  </span>
                </legend>
                <div className="mt-3 flex items-center gap-3">
                  <span className="w-24 text-right text-[11px] text-slate-500">
                    {copy.discoveries}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={mainstream}
                    onChange={(event) => setMainstream(Number(event.target.value))}
                    className="min-w-0 flex-1 accent-violet-500"
                    aria-label={copy.mixHeading}
                  />
                  <span className="w-24 text-[11px] text-slate-500">
                    {copy.hits}
                  </span>
                </div>
              </fieldset>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {copy.energyHeading}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(
                      [
                        "any",
                        "gentle",
                        "uplifting",
                        "intense",
                        "melancholic",
                      ] as AlbumEnergy[]
                    ).map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={energy === value}
                        onClick={() => setEnergy(value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          energy === value
                            ? "border-violet-500/60 bg-violet-500/15 text-violet-100"
                            : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        {copy.energy[value]}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {copy.artistVariety}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={onePerArtist}
                      onClick={() => setOnePerArtist((value) => !value)}
                      className={`relative h-6 w-11 rounded-full border transition ${
                        onePerArtist
                          ? "border-violet-400/40 bg-violet-500"
                          : "border-slate-600 bg-slate-800"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                          onePerArtist ? "left-[1.35rem]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    {copy.artistVarietyHint}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 bg-slate-950/30 p-4 sm:p-5">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {copy.titleLabel}
                <input
                  value={title}
                  maxLength={100}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={copy.titlePlaceholder}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </label>

              {activeEmotions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeEmotions.map((emotion) => (
                    <span
                      key={emotion.id}
                      className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400"
                    >
                      {language === "vi"
                        ? emotion.name_vi ?? emotion.name
                        : emotion.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-70"
                >
                  {generating ? (
                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <SparklesIcon className="h-4 w-4" />
                  )}
                  {generating ? copy.generating : copy.generate}
                </button>
                <span className="text-xs text-slate-500">
                  {copy.tracksUnit(count)}
                </span>
              </div>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          {result ? (
            <div aria-busy={generating}>
              <AlbumCollection
                album={result}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => void generate()}
                      disabled={generating || saving}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
                    >
                      <RefreshIcon
                        className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
                      />
                      {copy.shuffle}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveAlbum()}
                      disabled={saving || Boolean(savedId)}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-60"
                    >
                      {saving ? (
                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckIcon className="h-4 w-4" />
                      )}
                      {saving ? copy.saving : savedId ? copy.saved : copy.save}
                    </button>
                    {savedId && (
                      <Link
                        href={`/albums/${savedId}`}
                        className="text-sm font-medium text-violet-300 underline decoration-violet-500/40 underline-offset-4 transition hover:text-violet-200"
                      >
                        {copy.openSaved}
                      </Link>
                    )}
                  </>
                }
              />
            </div>
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-slate-500">
                {generating ? (
                  <SpinnerIcon className="h-6 w-6 animate-spin text-violet-300" />
                ) : (
                  <MusicIcon className="h-6 w-6" />
                )}
              </span>
              <h2 className="mt-4 text-base font-semibold text-slate-200">
                {generating ? copy.generating : copy.emptyResultTitle}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                {copy.emptyResultHint}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {copy.briefHeading}
            </p>
            {result ? (
              <>
                <AlbumCover
                  videoIds={resultCover}
                  title={result.title}
                  className="mt-3 w-full"
                />
                <h2 className="mt-4 text-lg font-semibold leading-6 text-white">
                  {result.title}
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {copy.briefDetail}
                </p>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                    <dt className="text-slate-500">{copy.averageHeat}</dt>
                    <dd className="font-medium tabular-nums text-slate-200">
                      {result.stats.averagePopularity.toFixed(1)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                    <dt className="text-slate-500">{copy.hitBalance}</dt>
                    <dd className="font-medium tabular-nums text-slate-200">
                      {result.stats.anchors}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">{copy.discoveryShare}</dt>
                    <dd className="font-medium tabular-nums text-slate-200">
                      {result.stats.discoveries}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <>
                <div className="mt-3 flex aspect-square items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60">
                  <MusicIcon className="h-10 w-10 text-slate-700" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-200">
                  {copy.briefTitle}
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {copy.briefDetail}
                </p>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {copy.myAlbums}
              </h2>
              <span className="text-[11px] tabular-nums text-slate-600">
                {savedAlbums.length}
              </span>
            </div>
            {savedAlbums.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm font-medium text-slate-300">
                  {copy.noAlbums}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {copy.noAlbumsHint}
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-1">
                {savedAlbums.slice(0, 5).map((album) => (
                  <Link
                    key={album.id}
                    href={`/albums/${album.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-800/70"
                  >
                    <AlbumCover
                      videoIds={album.coverVideoIds}
                      title={album.title}
                      className="w-11 shrink-0 rounded-lg"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-200">
                        {album.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {copy.tracksUnit(album.trackCount)} /{" "}
                        {new Date(album.createdAt).toLocaleDateString(
                          language === "vi" ? "vi-VN" : "en-US",
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
