"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { useData } from "@/components/DataProvider";
import { PlusIcon, SearchIcon, SpinnerIcon } from "@/components/Icons";
import { getErrorMessage } from "@/lib/errors";
import { useDebounce } from "@/lib/hooks/useDebounce";
import type { YouTubeSearchResult } from "@/lib/types";

export function SongSearch() {
  const { songs, addSongFromYouTube, notify } = useData();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [addingId, setAddingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query.trim(), 400);

  const savedVideoIds = useMemo(
    () => new Set(songs.map((song) => song.youtube_video_id)),
    [songs],
  );

  // Debounced search against our server-side YouTube proxy.
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          results?: YouTubeSearchResult[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Search failed.");
        }
        const items = payload.results ?? [];
        setResults(items);
        setHighlighted(items.length ? 0 : -1);
        setOpen(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(getErrorMessage(err, "Could not search YouTube."));
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSelect(result: YouTubeSearchResult) {
    if (savedVideoIds.has(result.videoId)) {
      notify(`"${result.title}" is already in your library.`, "info");
      setOpen(false);
      return;
    }

    setAddingId(result.videoId);
    try {
      const { status } = await addSongFromYouTube(result);
      notify(
        status === "added"
          ? `Added "${result.title}" to your library.`
          : `"${result.title}" is already in your library.`,
        status === "added" ? "success" : "info",
      );
      setQuery("");
      setResults([]);
      setOpen(false);
    } catch (err) {
      notify(getErrorMessage(err, "Could not save that song."), "error");
    } finally {
      setAddingId(null);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      void handleSelect(results[highlighted]!);
    }
  }

  const showDropdown = open && (loading || !!error || results.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="song-search" className="sr-only">
        Search for a song
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          id="song-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search YouTube for a song..."
          autoComplete="off"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        {(loading || query) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            {loading ? (
              <SpinnerIcon className="h-5 w-5 animate-spin" />
            ) : (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="rounded p-0.5 transition hover:text-slate-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full animate-fade-in overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {error && (
            <p className="px-4 py-3 text-sm text-red-300">{error}</p>
          )}

          {!error && loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">Searching...</p>
          )}

          {!error && (
            <ul className="max-h-96 overflow-y-auto py-1">
              {results.map((result, index) => {
                const inLibrary = savedVideoIds.has(result.videoId);
                const isAdding = addingId === result.videoId;
                return (
                  <li key={result.videoId}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => void handleSelect(result)}
                      disabled={isAdding}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                        index === highlighted ? "bg-slate-800" : "hover:bg-slate-800"
                      } disabled:opacity-60`}
                    >
                      <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-slate-800">
                        <Image
                          src={result.thumbnailUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">
                          {result.title}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {result.channelTitle}
                          {result.duration ? ` - ${result.duration}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0">
                        {isAdding ? (
                          <SpinnerIcon className="h-4 w-4 animate-spin text-violet-300" />
                        ) : inLibrary ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                            Saved
                          </span>
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white">
                            <PlusIcon className="h-4 w-4" />
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!error && !loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">
              No songs found. Try a different search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
