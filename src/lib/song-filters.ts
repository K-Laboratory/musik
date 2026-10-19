export const SONG_CONTENT_FILTERS = [
  "all",
  "youtube_missing",
  "youtube_present",
  "lyrics_missing",
  "lyrics_present",
  "both_present",
] as const;
export type SongContentFilter = (typeof SONG_CONTENT_FILTERS)[number];

export const SONG_CLASSIFICATION_FILTERS = [
  "all",
  "classified",
  "needs_review",
  "not_classified",
] as const;
export type SongClassificationFilter =
  (typeof SONG_CLASSIFICATION_FILTERS)[number];

export const SONG_SORTS = [
  "year_asc",
  "year_desc",
  "title_asc",
  "title_desc",
  "artist_asc",
  "popularity_desc",
  "popularity_asc",
  "recently_analyzed",
  "recently_added",
  "lyrics_updated",
] as const;
export type SongSort = (typeof SONG_SORTS)[number];

export const DEFAULT_SONG_SORT: SongSort = "year_asc";
export const DEFAULT_SONG_PER_PAGE = 50;
export const SONG_PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;

export interface SongListFilters {
  q: string;
  gen: string;
  content: SongContentFilter;
  classification: SongClassificationFilter;
  emotion: string;
  yearFrom: number | null;
  yearTo: number | null;
  sort: SongSort;
  perPage: number;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function firstValue(raw: RawParams, key: string): string {
  const value = raw[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parseYear(value: string): number | null {
  if (!value) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 1000 && year <= 3000 ? year : null;
}

export function parseSongListFilters(raw: RawParams): SongListFilters {
  let yearFrom = parseYear(firstValue(raw, "yearFrom"));
  let yearTo = parseYear(firstValue(raw, "yearTo"));
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    [yearFrom, yearTo] = [yearTo, yearFrom];
  }

  const requestedPerPage = Number(firstValue(raw, "perPage"));
  const perPage = (SONG_PER_PAGE_OPTIONS as readonly number[]).includes(
    requestedPerPage,
  )
    ? requestedPerPage
    : DEFAULT_SONG_PER_PAGE;
  const page = Math.max(1, Math.floor(Number(firstValue(raw, "page")) || 1));

  return {
    q: firstValue(raw, "q"),
    gen: firstValue(raw, "gen"),
    content: oneOf(
      firstValue(raw, "content"),
      SONG_CONTENT_FILTERS,
      "all",
    ),
    classification: oneOf(
      firstValue(raw, "classification"),
      SONG_CLASSIFICATION_FILTERS,
      "all",
    ),
    emotion: firstValue(raw, "emotion"),
    yearFrom,
    yearTo,
    sort: oneOf(firstValue(raw, "sort"), SONG_SORTS, DEFAULT_SONG_SORT),
    perPage,
    page,
  };
}

export function hasActiveSongFilters(filters: SongListFilters): boolean {
  return Boolean(
    filters.q ||
      filters.gen ||
      filters.emotion ||
      filters.yearFrom !== null ||
      filters.yearTo !== null ||
      filters.content !== "all" ||
      filters.classification !== "all",
  );
}

export function songFilterParams(
  filters: SongListFilters,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q) params.q = filters.q;
  if (filters.gen) params.gen = filters.gen;
  if (filters.emotion) params.emotion = filters.emotion;
  if (filters.yearFrom !== null) params.yearFrom = String(filters.yearFrom);
  if (filters.yearTo !== null) params.yearTo = String(filters.yearTo);
  if (filters.content !== "all") params.content = filters.content;
  if (filters.classification !== "all") {
    params.classification = filters.classification;
  }
  if (filters.sort !== DEFAULT_SONG_SORT) params.sort = filters.sort;
  if (filters.perPage !== DEFAULT_SONG_PER_PAGE) {
    params.perPage = String(filters.perPage);
  }
  return params;
}

export function songListHref(
  filters: SongListFilters,
  page = filters.page,
): string {
  const params = new URLSearchParams(songFilterParams(filters));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/songs${query ? `?${query}` : ""}`;
}
