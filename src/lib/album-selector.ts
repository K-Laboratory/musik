import {
  ALBUM_MAX_TRACKS,
  ALBUM_MIN_TRACKS,
  youtubeThumbnail,
  type AlbumConfig,
  type AlbumEmotionTag,
  type AlbumRole,
  type AlbumSignal,
  type AlbumSignal as AlbumRelaxation,
  type AlbumStats,
  type AlbumTrack,
  type AlbumView,
} from "@/lib/albums";

export interface AlbumCandidateSong {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  generation_id: string | null;
  youtube_video_id: string | null;
  youtube_channel: string | null;
  popularity_score: number | null;
  emotions: AlbumEmotionTag[];
}

export interface AlbumGeneration {
  id: string;
  label_en: string;
  label_vi: string;
  position: number;
}

interface SelectedTrack {
  song: AlbumCandidateSong;
  tier: number;
  energy: number;
  valence: number;
  tierLabel: string | null;
}

interface BuildAlbumInput {
  candidates: AlbumCandidateSong[];
  generations: AlbumGeneration[];
  config: AlbumConfig;
  seed?: number;
}

const ENERGY_KEYS = new Set([
  "any",
  "gentle",
  "uplifting",
  "intense",
  "melancholic",
]);

const ENGLISH_TITLES = [
  "Afterglow",
  "Blue Hour",
  "Midnight Tape",
  "Golden Static",
  "The Long Way Home",
  "Neon Monsoon",
  "Sunday Cinema",
  "Paper Moons",
  "Quiet Voltage",
  "Saigon Reverie",
  "Hanoi After Rain",
  "Electric Lotus",
  "Velvet Signal",
  "Last Light",
  "A Room Full of Echoes",
  "Parallel Hearts",
];

const VIETNAMESE_TITLES = [
  "Ánh Chiều",
  "Giờ Xanh",
  "Băng Cassette Đêm",
  "Tín Hiệu Vàng",
  "Đường Về Dài",
  "Mưa Neon",
  "Chiều Chủ Nhật",
  "Trăng Giấy",
  "Điện Áp Dịu",
  "Sài Gòn Mơ",
  "Hà Nội Sau Mưa",
  "Sen Điện",
  "Tín Hiệu Nhung",
  "Ánh Cuối",
  "Căn Phòng Nhiều Tiếng Vọng",
  "Hai Trái Tim Song Song",
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteNumber(value: number | null, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function normalizedConfig(config: AlbumConfig): AlbumConfig {
  const generationIds = [...new Set(config.generationIds)].slice(0, 12);
  const emotionIds = [...new Set(config.emotionIds)].slice(0, 24);
  const yearFrom =
    Number.isInteger(config.yearFrom) && config.yearFrom
      ? clamp(config.yearFrom, 1900, 2100)
      : null;
  const yearTo =
    Number.isInteger(config.yearTo) && config.yearTo
      ? clamp(config.yearTo, 1900, 2100)
      : null;
  const orderedYears =
    yearFrom !== null && yearTo !== null && yearFrom > yearTo
      ? [yearTo, yearFrom]
      : [yearFrom, yearTo];

  return {
    ...config,
    generationIds,
    emotionIds,
    yearFrom: orderedYears[0] ?? null,
    yearTo: orderedYears[1] ?? null,
    count: clamp(
      Math.round(config.count),
      ALBUM_MIN_TRACKS,
      ALBUM_MAX_TRACKS,
    ),
    mainstream: clamp(Math.round(config.mainstream), 0, 100),
    energy: ENERGY_KEYS.has(config.energy) ? config.energy : "any",
    language: config.language === "vi" ? "vi" : "en",
    title: config.title?.trim().slice(0, 100) || undefined,
  };
}

function tagEnergy(tags: AlbumEmotionTag[]): number {
  if (tags.length === 0) return 0.5;
  const primary = tags.filter((tag) => tag.isPrimary);
  const pool = primary.length > 0 ? primary : tags;
  return clamp(
    pool.reduce((total, tag) => total + (finiteNumber(tag.arousal) + 2) / 4, 0) /
      pool.length,
    0,
    1,
  );
}

function tagValence(tags: AlbumEmotionTag[]): number {
  if (tags.length === 0) return 0.5;
  const primary = tags.filter((tag) => tag.isPrimary);
  const pool = primary.length > 0 ? primary : tags;
  return clamp(
    pool.reduce((total, tag) => total + (finiteNumber(tag.valence) + 2) / 4, 0) /
      pool.length,
    0,
    1,
  );
}

function energyFits(config: AlbumConfig, energy: number, valence: number): boolean {
  switch (config.energy) {
    case "gentle":
      return energy <= 0.44;
    case "uplifting":
      return valence >= 0.56 && energy >= 0.5;
    case "intense":
      return energy >= 0.68;
    case "melancholic":
      return valence <= 0.46 && energy <= 0.66;
    default:
      return true;
  }
}

function matchesEmotion(
  config: AlbumConfig,
  emotions: AlbumEmotionTag[],
): boolean {
  if (config.emotionIds.length === 0) return true;
  return emotions.some((emotion) => config.emotionIds.includes(emotion.id));
}

function matchesGeneration(
  config: AlbumConfig,
  generationId: string | null,
): boolean {
  return (
    config.generationIds.length === 0 ||
    (generationId !== null && config.generationIds.includes(generationId))
  );
}

function matchesYear(config: AlbumConfig, year: number | null): boolean {
  if (config.yearFrom === null && config.yearTo === null) return true;
  if (year === null) return false;
  if (config.yearFrom !== null && year < config.yearFrom) return false;
  if (config.yearTo !== null && year > config.yearTo) return false;
  return true;
}

function matchTier(
  config: AlbumConfig,
  song: AlbumCandidateSong,
  energy: number,
  valence: number,
): number {
  const generation = matchesGeneration(config, song.generation_id);
  const emotion = matchesEmotion(config, song.emotions);
  const year = matchesYear(config, song.year);
  const mood = energyFits(config, energy, valence);

  if (generation && emotion && year && mood) return 0;
  if (generation && emotion && year) return 1;
  if (generation && emotion) return 2;
  if (generation) return 3;
  if (emotion) return 4;
  return 5;
}

function popularityTier(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 75) return "Viral";
  if (score >= 55) return "Popular";
  if (score >= 35) return "Established";
  if (score >= 15) return "Niche";
  return "Deep cut";
}

function quantile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(
    Math.floor((sorted.length - 1) * fraction),
    0,
    sorted.length - 1,
  );
  return sorted[index]!;
}

function weightedPick(
  pool: AlbumCandidateSong[],
  config: AlbumConfig,
  category: "anchor" | "discovery" | "balanced",
  random: () => number,
): AlbumCandidateSong | null {
  if (pool.length === 0) return null;

  const targetCenter = 24 + (config.mainstream / 100) * 56;
  const selectedEmotions = new Set(config.emotionIds);
  const weighted = pool.map((song) => {
    const popularity = clamp(finiteNumber(song.popularity_score, 34), 0, 100);
    const distance = (popularity - targetCenter) / 27;
    let weight = Math.exp(-(distance * distance) / 2) + 0.04;

    if (category === "anchor") {
      weight *= 1 + Math.pow(popularity / 100, 2) * 2.2;
    } else if (category === "discovery") {
      weight *= 1 + Math.pow(1 - popularity / 100, 1.5) * 2;
    }

    if (song.emotions.some((emotion) => emotion.isPrimary && selectedEmotions.has(emotion.id))) {
      weight *= 1.9;
    } else if (song.emotions.some((emotion) => selectedEmotions.has(emotion.id))) {
      weight *= 1.2;
    }

    const confidence =
      song.emotions.length === 0
        ? 0.5
        : song.emotions.reduce((total, emotion) => total + emotion.confidence, 0) /
          song.emotions.length;
    weight *= 0.75 + confidence * 0.5;
    return { song, weight };
  });

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.song;
  }
  return weighted[weighted.length - 1]?.song ?? null;
}

function roleAt(index: number, count: number): AlbumRole {
  if (count <= 1) return "centerpiece";
  const position = index / (count - 1);
  const centerIndex = Math.floor((count - 1) / 2);
  if (index === 0) return "opener";
  if (index === count - 1) return "finale";
  if (index === centerIndex) return "centerpiece";
  if (position < 0.36) return "build";
  if (position > 0.67) return "release";
  return "ride";
}

function sequenceTracks(tracks: SelectedTrack[], random: () => number): SelectedTrack[] {
  if (tracks.length <= 2) return tracks;
  const remaining = [...tracks];
  const ordered: SelectedTrack[] = [];
  const centerIndex = Math.floor(tracks.length * 0.48);

  for (let index = 0; index < tracks.length; index += 1) {
    const position = index / (tracks.length - 1);
    const targetEnergy =
      index === 0
        ? 0.82
        : index === tracks.length - 1
          ? 0.36
          : 0.42 + Math.sin(position * Math.PI) * 0.45;
    const wantsAnchor =
      index === 0 || index === centerIndex || index === tracks.length - 1;

    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let candidateIndex = 0; candidateIndex < remaining.length; candidateIndex += 1) {
      const candidate = remaining[candidateIndex]!;
      const popularity = clamp(finiteNumber(candidate.song.popularity_score, 34), 0, 100) / 100;
      const energyDistance = Math.abs(candidate.energy - targetEnergy);
      const previousArtist =
        ordered.length === 0
          ? null
          : ordered[ordered.length - 1]!.song.artist.toLowerCase();
      const sameArtist =
        previousArtist !== null &&
        candidate.song.artist.toLowerCase() === previousArtist;
      const score =
        popularity * (wantsAnchor ? 1.35 : 0.45) -
        energyDistance * 1.7 +
        (sameArtist ? -0.75 : 0.22) +
        random() * 0.08;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = candidateIndex;
      }
    }

    ordered.push(remaining.splice(bestIndex, 1)[0]!);
  }

  // Prefer not to place the same artist back-to-back. A later swap is enough
  // here because every track has already been selected.
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!;
    if (
      ordered[index]!.song.artist.toLowerCase() !==
      previous.song.artist.toLowerCase()
    ) {
      continue;
    }
    const swapIndex = ordered.findIndex(
      (track, candidateIndex) =>
        candidateIndex > index &&
        track.song.artist.toLowerCase() !== previous.song.artist.toLowerCase() &&
        (candidateIndex === ordered.length - 1 ||
          ordered[candidateIndex + 1]!.song.artist.toLowerCase() !==
            ordered[index]!.song.artist.toLowerCase()),
    );
    if (swapIndex > index) {
      [ordered[index], ordered[swapIndex]] = [
        ordered[swapIndex]!,
        ordered[index]!,
      ];
    }
  }

  return ordered;
}

function buildDescription(
  config: AlbumConfig,
  tracks: AlbumTrack[],
  generations: Map<string, AlbumGeneration>,
): string {
  const emotionCounts = new Map<string, { name: string; count: number }>();
  for (const track of tracks) {
    for (const emotion of track.emotions) {
      const current = emotionCounts.get(emotion.id);
      if (current) current.count += 1;
      else {
        emotionCounts.set(emotion.id, {
          name: config.language === "vi" ? emotion.nameVi ?? emotion.name : emotion.name,
          count: 1,
        });
      }
    }
  }
  const topEmotions = [...emotionCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((emotion) => emotion.name);
  const generationNames = [
    ...new Set(
      tracks
        .map((track) =>
          track.generationId
            ? generations.get(track.generationId)
            : null,
        )
        .filter((generation): generation is AlbumGeneration => Boolean(generation))
        .map((generation) =>
          config.language === "vi" ? generation.label_vi : generation.label_en,
        ),
    ),
  ];

  if (config.language === "vi") {
    const mood = topEmotions.length ? ` với sắc thái ${topEmotions.join(" và ")}` : "";
    const era = generationNames.length ? `, trải qua ${generationNames.join(", ")}` : "";
    return `${tracks.length} bản nhạc${mood}${era}. Một thứ tự được thiết kế để mở đầu cuốn hút, giữ nhịp và kết thúc đáng nhớ.`;
  }
  const mood = topEmotions.length ? ` shaped by ${topEmotions.join(" and ")}` : "";
  const era = generationNames.length
    ? `, across ${generationNames.join(", ")}`
    : "";
  return `${tracks.length} tracks${mood}${era}. Sequenced to open strong, keep the momentum, and land with a memorable finish.`;
}

export function buildAlbum({
  candidates,
  generations,
  config: rawConfig,
  seed,
}: BuildAlbumInput): AlbumView {
  const config = normalizedConfig(rawConfig);
  const random = mulberry32(
    seed ?? Math.floor(Math.random() * 2_147_483_647),
  );
  const generationMap = new Map(
    generations.map((generation) => [generation.id, generation]),
  );
  const availableGenerationIds = generations.map((generation) => generation.id);
  const selectedGenerationIds = config.generationIds.filter((id) =>
    availableGenerationIds.includes(id),
  );
  const generationKeys =
    selectedGenerationIds.length > 0 ? selectedGenerationIds : ["__all__"];
  const tiers: SelectedTrack[][] = Array.from({ length: 6 }, () => []);

  for (const song of candidates) {
    if (!song.youtube_video_id) continue;
    const energy = tagEnergy(song.emotions);
    const valence = tagValence(song.emotions);
    tiers[matchTier(config, song, energy, valence)]!.push({
      song,
      tier: 0,
      energy,
      valence,
      tierLabel: popularityTier(song.popularity_score),
    });
  }

  const selected: SelectedTrack[] = [];
  const selectedSongIds = new Set<string>();
  const selectedVideoIds = new Set<string>();
  const artistCounts = new Map<string, number>();
  const hitTarget = Math.min(
    config.count,
    Math.max(1, Math.round(config.count * (0.28 + (config.mainstream / 100) * 0.46))),
  );
  const discoveryTarget = Math.min(
    config.count - hitTarget,
    Math.max(1, Math.round(config.count * (0.32 - (config.mainstream / 100) * 0.22))),
  );
  let anchors = 0;
  let discoveries = 0;
  let generationCursor = 0;

  const artistLimitPasses = config.onePerArtist ? [1, 2, Infinity] : [Infinity];

  for (let tierIndex = 0; tierIndex < tiers.length && selected.length < config.count; tierIndex += 1) {
    const tierPool = tiers[tierIndex]!.map((entry) => ({
      ...entry,
      tier: tierIndex,
    }));
    if (tierPool.length === 0) continue;
    const scores = tierPool.map((entry) =>
      finiteNumber(entry.song.popularity_score, 34),
    );
    const anchorCutoff = quantile(scores, 0.7);
    const discoveryCutoff = quantile(scores, 0.35);

    for (const artistLimit of artistLimitPasses) {
      let passProgress = true;
      while (selected.length < config.count && passProgress) {
        passProgress = false;
        const category =
          anchors < hitTarget
            ? "anchor"
            : discoveries < discoveryTarget
              ? "discovery"
              : "balanced";

        for (let attempt = 0; attempt < generationKeys.length; attempt += 1) {
          const generationKey =
            generationKeys[generationCursor++ % generationKeys.length]!;
          const pool = tierPool.filter((entry) => {
            if (entry.song.youtube_video_id === null) return false;
            if (selectedSongIds.has(entry.song.id)) return false;
            if (selectedVideoIds.has(entry.song.youtube_video_id)) return false;
            const artist = entry.song.artist.trim().toLowerCase();
            if (artistLimit !== Infinity && (artistCounts.get(artist) ?? 0) >= artistLimit) {
              return false;
            }
            if (generationKey === "__all__") return true;
            return entry.song.generation_id === generationKey;
          });
          if (pool.length === 0) continue;

          const popularity = (entry: SelectedTrack) =>
            finiteNumber(entry.song.popularity_score, 34);
          const categoryPool =
            category === "anchor"
              ? pool.filter((entry) => popularity(entry) >= anchorCutoff)
              : category === "discovery"
                ? pool.filter((entry) => popularity(entry) <= discoveryCutoff)
                : pool;
          const picked = weightedPick(
            (categoryPool.length > 0 ? categoryPool : pool).map(
              (entry) => entry.song,
            ),
            config,
            category,
            random,
          );
          if (!picked) continue;

          const selectedEntry =
            pool.find((entry) => entry.song.id === picked.id) ?? null;
          if (!selectedEntry || !picked.youtube_video_id) continue;

          selected.push({ ...selectedEntry, tier: tierIndex });
          selectedSongIds.add(picked.id);
          selectedVideoIds.add(picked.youtube_video_id);
          const artist = picked.artist.trim().toLowerCase();
          artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
          const score = finiteNumber(picked.popularity_score, 34);
          if (score >= 55) anchors += 1;
          if (score < 35) discoveries += 1;
          passProgress = true;
          break;
        }
      }
      if (selected.length >= config.count) break;
    }
  }

  const sequenced = sequenceTracks(selected, random).slice(0, config.count);
  const selectedPopularities = sequenced
    .map((entry) => entry.song.popularity_score)
    .filter((score): score is number => score !== null);
  const selectedYears = sequenced
    .map((entry) => entry.song.year)
    .filter((year): year is number => year !== null);
  const averagePopularity =
    selectedPopularities.length > 0
      ? selectedPopularities.reduce((total, score) => total + score, 0) /
        selectedPopularities.length
      : 0;
  const topSelectionCutoff = quantile(selectedPopularities, 0.68);
  const bottomSelectionCutoff = quantile(selectedPopularities, 0.32);
  const selectedEmotionSet = new Set(config.emotionIds);

  const tracks: AlbumTrack[] = sequenced.map((entry, index) => {
    const song = entry.song;
    const signals: AlbumSignal[] = [];
    const score = finiteNumber(song.popularity_score, 34);
    if (score >= Math.max(55, topSelectionCutoff)) signals.push("anchor");
    if (score <= Math.min(45, bottomSelectionCutoff)) signals.push("discovery");
    if (
      song.emotions.some(
        (emotion) => selectedEmotionSet.has(emotion.id) && emotion.isPrimary,
      )
    ) {
      signals.push("emotion");
    }
    if (matchesGeneration(config, song.generation_id)) signals.push("era");
    if (entry.tier > 0) signals.push("widened");

    const generation = song.generation_id
      ? generationMap.get(song.generation_id)
      : null;
    const orderedEmotions = [...song.emotions].sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) ||
        b.confidence - a.confidence,
    );

    return {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      year: song.year,
      generationId: song.generation_id,
      generationLabel: generation
        ? config.language === "vi"
          ? generation.label_vi
          : generation.label_en
        : "",
      videoId: song.youtube_video_id!,
      youtubeChannel: song.youtube_channel,
      popularityScore: song.popularity_score,
      popularityTier: popularityTier(song.popularity_score),
      thumbnailUrl: youtubeThumbnail(song.youtube_video_id!),
      emotions: orderedEmotions.slice(0, 3).map((emotion) => ({
        id: emotion.id,
        name: emotion.name,
        nameVi: emotion.nameVi,
      })),
      role: roleAt(index, sequenced.length),
      signals: [...new Set(signals)].slice(0, 3),
    };
  });

  const stats: AlbumStats = {
    averagePopularity: Number(averagePopularity.toFixed(1)),
    anchors: tracks.filter((track) => track.signals.includes("anchor")).length,
    discoveries: tracks.filter((track) => track.signals.includes("discovery"))
      .length,
    generations: new Set(
      tracks
        .map((track) => track.generationId)
        .filter((generation): generation is string => Boolean(generation)),
    ).size,
    emotions: new Set(
      tracks.flatMap((track) => track.emotions.map((emotion) => emotion.id)),
    ).size,
    yearFrom: selectedYears.length > 0 ? Math.min(...selectedYears) : null,
    yearTo: selectedYears.length > 0 ? Math.max(...selectedYears) : null,
  };
  const titlePool =
    config.language === "vi" ? VIETNAMESE_TITLES : ENGLISH_TITLES;
  const generatedTitle =
    titlePool[Math.floor(random() * titlePool.length)] ?? titlePool[0]!;
  const title = config.title || generatedTitle;
  const relaxations: AlbumRelaxation[] = tracks.some((track) =>
    track.signals.includes("widened"),
  )
    ? ["widened"]
    : [];

  return {
    id: "preview",
    title,
    description: buildDescription(config, tracks, generationMap),
    config,
    stats,
    tracks,
    relaxations,
  };
}
