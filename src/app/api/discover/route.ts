import { NextResponse } from "next/server";

import { loadAlbumCatalog } from "@/lib/album-catalog.server";
import { buildAlbum } from "@/lib/album-selector";
import { isMissingBehaviorTable, type StoredBehaviorEvent } from "@/lib/behavior";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MOODS = {
  en: {
    "feel-good": "joyful",
    "late-night": "nostalgic",
    "heart-on-sleeve": "sad",
    "slow-down": "relaxed",
  },
} as const;

function getInterestProfile(events: StoredBehaviorEvent[], candidates: Awaited<ReturnType<typeof loadAlbumCatalog>>["candidates"]) {
  const generationScores = new Map<string, number>();
  const emotionScores = new Map<string, number>();
  const bySongId = new Map<string, (typeof candidates)[number]>();
  for (const song of candidates) {
    bySongId.set(song.id, song);
    if (song.youtube_video_id) bySongId.set(song.youtube_video_id, song);
  }

  let signalCount = 0;
  const recentlySeen = new Set<string>();
  const recentlyPlayed = new Set<string>();
  const add = (scores: Map<string, number>, id: string | null, value: number) => {
    if (id) scores.set(id, (scores.get(id) ?? 0) + value);
  };

  for (const event of events) {
    const ageDays = Math.max(0, (Date.now() - new Date(event.created_at).getTime()) / 86_400_000);
    const decay = Math.max(0.2, Math.exp(-ageDays / 45));
    if (event.item_type === "song" && event.item_id) {
      if (event.event_type === "item_view" && ageDays <= 7) recentlySeen.add(event.item_id);
      if (["play", "complete", "save"].includes(event.event_type) && ageDays <= 30) {
        recentlyPlayed.add(event.item_id);
      }
    }
    if (event.event_type === "pointer_pause") {
      const weight = 0.3 * decay;
      if (event.item_type === "generation") add(generationScores, event.item_id, weight);
      else if (event.item_type === "emotion") add(emotionScores, event.item_id, weight);
      else if (event.item_type === "mood" && event.item_id) {
        add(emotionScores, MOODS.en[event.item_id as keyof typeof MOODS.en] ?? null, weight);
      } else if (event.item_type === "song" && event.item_id) {
        const song = bySongId.get(event.item_id);
        if (song) {
          add(generationScores, song.generation_id, weight);
          for (const emotion of song.emotions) add(emotionScores, emotion.id, weight * emotion.confidence);
        }
      }
      signalCount += 1;
      continue;
    }
    if (event.event_type === "filter_select") {
      if (event.item_type === "generation") {
        add(generationScores, event.item_id, 2.5 * decay);
        signalCount += 1;
      } else if (event.item_type === "emotion") {
        add(emotionScores, event.item_id, 2.5 * decay);
        signalCount += 1;
      } else if (event.item_type === "mood" && event.item_id) {
        const emotion = MOODS.en[event.item_id as keyof typeof MOODS.en];
        add(emotionScores, emotion ?? null, 1.5 * decay);
        signalCount += 1;
      }
      continue;
    }

    const weights: Partial<Record<StoredBehaviorEvent["event_type"], number>> = {
      play: 3,
      complete: 2,
      save: 2.5,
      pause: 0.35,
      skip: -2.2,
    };
    const base = weights[event.event_type];
    if (base === undefined || event.item_type !== "song" || !event.item_id) continue;
    signalCount += 1;
    const song = bySongId.get(event.item_id);
    if (!song) continue;
    add(generationScores, song.generation_id, base * decay);
    for (const emotion of song.emotions) {
      const confidence = Math.max(0.25, emotion.confidence);
      add(emotionScores, emotion.id, base * decay * confidence);
    }
  }

  const top = (scores: Map<string, number>, limit: number) => [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  return {
    signalCount,
    generationIds: top(generationScores, 2),
    emotionIds: top(emotionScores, 2),
    recentlySeenIds: [...recentlySeen].filter((id) => !recentlyPlayed.has(id)),
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const mood = params.get("mood") ?? "late-night";
  const language = params.get("language") === "vi" ? "vi" : "en";
  const requestedGenerationId = params.get("generation");
  const requestedEmotionId = params.get("emotion");
  const emotionKey = MOODS.en[mood as keyof typeof MOODS.en] ?? "nostalgic";

  try {
    const [dataset, emotionsResult, preferenceResult] = await Promise.all([
      loadAlbumCatalog(supabase),
      supabase.from("emotions").select("id,name,name_vi").order("name"),
      supabase
        .from("recommendation_preferences")
        .select("personalization_enabled")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (emotionsResult.error) throw new Error(emotionsResult.error.message);
    const missingPreferences = isMissingBehaviorTable(preferenceResult.error, "recommendation_preferences");
    if (preferenceResult.error && !missingPreferences) throw new Error(preferenceResult.error.message);
    const personalizationEnabled = preferenceResult.data?.personalization_enabled === true;
    let personalizationAvailable = !missingPreferences;
    const taxonomy = emotionsResult.data ?? [];
    const moodEmotionId = taxonomy.some((item) => item.id === emotionKey)
      ? emotionKey
      : null;
    const explicitEmotionId = taxonomy.some((item) => item.id === requestedEmotionId)
      ? requestedEmotionId
      : null;
    const generationOptions = dataset.generations.map((generation) => ({
      id: generation.id,
      label: language === "vi" ? generation.label_vi : generation.label_en,
      count: dataset.candidates.filter((song) => song.generation_id === generation.id).length,
    }));
    const generationId = dataset.generations.some((item) => item.id === requestedGenerationId)
      ? requestedGenerationId!
      : null;
    const emotionCounts = new Map<string, number>();
    for (const song of dataset.candidates) {
      for (const emotion of song.emotions) {
        emotionCounts.set(emotion.id, (emotionCounts.get(emotion.id) ?? 0) + 1);
      }
    }
    const emotionOptions = taxonomy
      .map((emotion) => ({
        id: emotion.id,
        label: language === "vi" ? emotion.name_vi ?? emotion.name : emotion.name.split(" /")[0]!,
        count: emotionCounts.get(emotion.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    let interest = {
      signalCount: 0,
      generationIds: [] as string[],
      emotionIds: [] as string[],
      recentlySeenIds: [] as string[],
    };
    if (personalizationEnabled && personalizationAvailable) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events, error: eventsError } = await supabase
        .from("user_behavior_events")
        .select("area_key,event_type,item_type,item_id,duration_ms,created_at")
        .eq("user_id", user.id)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (isMissingBehaviorTable(eventsError, "user_behavior_events")) {
        personalizationAvailable = false;
      } else if (eventsError) {
        throw new Error(eventsError.message);
      } else {
        interest = getInterestProfile((events ?? []) as StoredBehaviorEvent[], dataset.candidates);
      }
    }
    const profileReady = Boolean(personalizationAvailable && personalizationEnabled && interest.signalCount >= 4);
    const effectiveGenerationIds = generationId
      ? [generationId]
      : profileReady ? interest.generationIds : [];
    const effectiveEmotionIds = explicitEmotionId
      ? [explicitEmotionId]
      : profileReady
        ? [...new Set([...interest.emotionIds, ...(moodEmotionId ? [moodEmotionId] : [])])].slice(0, 3)
        : moodEmotionId ? [moodEmotionId] : [];
    const personalized = profileReady && (
      generationId === null && interest.generationIds.length > 0 ||
      explicitEmotionId === null && interest.emotionIds.some((id) => id !== moodEmotionId)
    );
    const effectiveEmotionStrengths = Object.fromEntries(effectiveEmotionIds.map((id, index) => [
      id,
      explicitEmotionId ? 75 : profileReady && id !== moodEmotionId ? 72 : index === 0 ? 65 : 45,
    ]));

    const recentlySeen = new Set(interest.recentlySeenIds);
    const freshCandidates = dataset.candidates.filter((song) =>
      !recentlySeen.has(song.id) && !recentlySeen.has(song.youtube_video_id ?? ""),
    );
    const recommendationCandidates =
      personalizationAvailable && personalizationEnabled && freshCandidates.length >= 8
        ? freshCandidates
        : dataset.candidates;
    const album = buildAlbum({
      candidates: recommendationCandidates,
      generations: dataset.generations,
      config: {
        generationIds: effectiveGenerationIds,
        emotionIds: effectiveEmotionIds,
        emotionStrengths: effectiveEmotionStrengths,
        yearFrom: null,
        yearTo: null,
        count: 8,
        mainstream: personalized ? 45 : 55,
        energy: "any",
        onePerArtist: true,
        language,
      },
      seed: Math.floor(Math.random() * 2_147_483_647),
    });
    const generationLabels = new Map(dataset.generations.map((item) => [
      item.id,
      language === "vi" ? item.label_vi : item.label_en,
    ]));
    const emotionLabels = new Map(taxonomy.map((item) => [
      item.id,
      language === "vi" ? item.name_vi ?? item.name : item.name.split(" /")[0]!,
    ]));
    const reasons = [
      ...(generationId === null ? interest.generationIds : []).map((id) => generationLabels.get(id)),
      ...(explicitEmotionId === null ? interest.emotionIds.filter((id) => id !== moodEmotionId) : [])
        .map((id) => emotionLabels.get(id)),
    ].filter((label): label is string => Boolean(label));
    return NextResponse.json({
      tracks: album.tracks,
      generationOptions,
      emotionOptions,
      personalization: {
        active: personalized,
        available: personalizationAvailable,
        signalCount: interest.signalCount,
        reasons,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load discoveries." },
      { status: 500 },
    );
  }
}
