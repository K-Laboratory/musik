"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CloseIcon, SearchIcon } from "@/components/Icons";
import { useAdminLabels } from "@/lib/admin-i18n";
import { useLanguage } from "@/lib/disguise";
import {
  SONG_CLASSIFICATION_FILTERS,
  SONG_CONTENT_FILTERS,
  SONG_PER_PAGE_OPTIONS,
  SONG_SORTS,
  hasActiveSongFilters,
  songListHref,
  type SongClassificationFilter,
  type SongContentFilter,
  type SongListFilters,
  type SongSort,
} from "@/lib/song-filters";

const CONTROL_CLASS =
  "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none";
const LABEL_CLASS =
  "mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500";

function parseYearInput(value: string): number | null {
  if (!value.trim()) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 1000 && year <= 3000 ? year : null;
}

export function SongsFilter({
  filters,
  generations,
  emotions,
}: {
  filters: SongListFilters;
  generations: { id: string; label_en: string; label_vi: string }[];
  emotions: { id: string; name: string; name_vi: string | null }[];
}) {
  const labels = useAdminLabels();
  const { language } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState(filters.q);
  const [yearFrom, setYearFrom] = useState(
    filters.yearFrom === null ? "" : String(filters.yearFrom),
  );
  const [yearTo, setYearTo] = useState(
    filters.yearTo === null ? "" : String(filters.yearTo),
  );
  const searchTimer = useRef<number | null>(null);

  useEffect(() => setQuery(filters.q), [filters.q]);
  useEffect(
    () =>
      setYearFrom(
        filters.yearFrom === null ? "" : String(filters.yearFrom),
      ),
    [filters.yearFrom],
  );
  useEffect(
    () => setYearTo(filters.yearTo === null ? "" : String(filters.yearTo)),
    [filters.yearTo],
  );
  useEffect(
    () => () => {
      if (searchTimer.current !== null) {
        window.clearTimeout(searchTimer.current);
      }
    },
    [],
  );

  const cancelSearch = () => {
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
  };

  const push = (patch: Partial<SongListFilters>) => {
    cancelSearch();
    const next: SongListFilters = {
      ...filters,
      q: query,
      yearFrom: parseYearInput(yearFrom),
      yearTo: parseYearInput(yearTo),
      page: 1,
      ...patch,
    };
    router.push(songListHref(next, 1));
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    cancelSearch();
    searchTimer.current = window.setTimeout(() => {
      const next: SongListFilters = { ...filters, q: value, page: 1 };
      router.push(songListHref(next, 1));
    }, 350);
  };

  const commitYears = () => {
    const from = parseYearInput(yearFrom);
    const to = parseYearInput(yearTo);
    if (from !== filters.yearFrom || to !== filters.yearTo) {
      push({ yearFrom: from, yearTo: to });
    }
  };

  const clear = () => {
    cancelSearch();
    setQuery("");
    setYearFrom("");
    setYearTo("");
    router.push("/admin/songs");
  };

  const sortLabels: Record<SongSort, string> = {
    year_asc: labels.sortYearAsc,
    year_desc: labels.sortYearDesc,
    title_asc: labels.sortTitleAsc,
    title_desc: labels.sortTitleDesc,
    artist_asc: labels.sortArtistAsc,
    recently_analyzed: labels.sortRecentlyAnalyzed,
    recently_added: labels.sortRecentlyAdded,
    lyrics_updated: labels.sortLyricsUpdated,
  };

  const contentLabels: Record<SongContentFilter, string> = {
    all: labels.anyContent,
    youtube_missing: labels.youtubeMissing,
    youtube_present: labels.youtubePresent,
    lyrics_missing: labels.lyricsMissing,
    lyrics_present: labels.lyricsPresent,
    both_present: labels.bothPresent,
  };

  const classificationLabels: Record<SongClassificationFilter, string> = {
    all: labels.anyClassification,
    classified: labels.classified,
    needs_review: labels.needsReviewOnly,
    not_classified: labels.notClassifiedOnly,
  };

  const active = hasActiveSongFilters(filters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <label className="block sm:col-span-2">
          <span className={LABEL_CLASS}>{labels.filterSearch}</span>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  push({ q: query });
                }
                if (event.key === "Escape") {
                  cancelSearch();
                  setQuery(filters.q);
                }
              }}
              placeholder={labels.searchPlaceholder}
              className={`${CONTROL_CLASS} pl-9 pr-9`}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  push({ q: "" });
                }}
                aria-label={labels.clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>{labels.filterGeneration}</span>
          <select
            value={filters.gen}
            onChange={(event) => push({ gen: event.target.value })}
            className={CONTROL_CLASS}
          >
            <option value="">{labels.allGenerations}</option>
            {generations.map((generation) => (
              <option key={generation.id} value={generation.id}>
                {language === "vi"
                  ? generation.label_vi
                  : generation.label_en}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>{labels.filterEmotion}</span>
          <select
            value={filters.emotion}
            onChange={(event) => push({ emotion: event.target.value })}
            className={CONTROL_CLASS}
          >
            <option value="">{labels.allEmotions}</option>
            {emotions.map((emotion) => (
              <option key={emotion.id} value={emotion.id}>
                {language === "vi"
                  ? emotion.name_vi ?? emotion.name
                  : emotion.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>{labels.sortBy}</span>
          <select
            value={filters.sort}
            onChange={(event) =>
              push({ sort: event.target.value as SongSort })
            }
            className={CONTROL_CLASS}
          >
            {SONG_SORTS.map((sort) => (
              <option
                key={sort}
                value={sort}
                disabled={
                  filters.classification === "not_classified" &&
                  sort === "recently_analyzed"
                }
              >
                {sortLabels[sort]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>{labels.filterContent}</span>
          <select
            value={filters.content}
            onChange={(event) =>
              push({ content: event.target.value as SongContentFilter })
            }
            className={CONTROL_CLASS}
          >
            {SONG_CONTENT_FILTERS.map((content) => (
              <option key={content} value={content}>
                {contentLabels[content]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>{labels.filterClassification}</span>
          <select
            value={filters.classification}
            onChange={(event) => {
              const classification = event.target
                .value as SongClassificationFilter;
              if (
                classification === "not_classified" &&
                filters.sort === "recently_analyzed"
              ) {
                push({ classification, sort: "title_asc" });
              } else {
                push({ classification });
              }
            }}
            className={CONTROL_CLASS}
          >
            {SONG_CLASSIFICATION_FILTERS.map((classification) => (
              <option key={classification} value={classification}>
                {classificationLabels[classification]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>{labels.filterYearFrom}</span>
          <input
            type="number"
            min={1900}
            max={2100}
            value={yearFrom}
            onChange={(event) => setYearFrom(event.target.value)}
            onBlur={commitYears}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            placeholder="1950"
            className={CONTROL_CLASS}
          />
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>{labels.filterYearTo}</span>
          <input
            type="number"
            min={1900}
            max={2100}
            value={yearTo}
            onChange={(event) => setYearTo(event.target.value)}
            onBlur={commitYears}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            placeholder="2026"
            className={CONTROL_CLASS}
          />
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>{labels.perPage}</span>
          <select
            value={String(filters.perPage)}
            onChange={(event) =>
              push({ perPage: Number(event.target.value) })
            }
            className={CONTROL_CLASS}
          >
            {SONG_PER_PAGE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        {active && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={clear}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {labels.clearFilters}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
