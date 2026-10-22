"use client";

import { useMemo, type ReactNode } from "react";

import { useData } from "@/components/DataProvider";
import {
  EqualizerIcon,
  PauseIcon,
  PlayIcon,
  SparklesIcon,
} from "@/components/Icons";
import { AlbumCover } from "@/components/albums/AlbumCover";
import { ALBUM_COPY } from "@/lib/album-copy";
import {
  albumTracksToSongs,
  type AlbumSignal,
  type AlbumTrack,
  type AlbumView,
} from "@/lib/albums";
import { useLanguage } from "@/lib/disguise";
import { usePlayer } from "@/lib/player";

function yearAndEra(track: AlbumTrack): string {
  if (track.year && track.generationLabel) {
    return `${track.year} / ${track.generationLabel}`;
  }
  if (track.year) return String(track.year);
  return track.generationLabel;
}

function SignalChip({
  signal,
  label,
}: {
  signal: AlbumSignal;
  label: string;
}) {
  const styles: Record<AlbumSignal, string> = {
    anchor: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    discovery: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    emotion: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    era: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    widened: "border-orange-400/20 bg-orange-400/10 text-orange-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles[signal]}`}
    >
      {label}
    </span>
  );
}

export function AlbumCollection({
  album,
  actions,
  compact = false,
}: {
  album: AlbumView;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const { user } = useData();
  const { language } = useLanguage();
  const copy = ALBUM_COPY[language];
  const {
    playPlaylist,
    toggle,
    currentSong,
    isPlaying,
    isPlaylistPlaying,
  } = usePlayer();
  const playerSongs = useMemo(
    () => albumTracksToSongs(album, user.id),
    [album, user.id],
  );
  const albumKey = `album:${album.id}`;
  const albumActive = isPlaylistPlaying(albumKey);
  const coverIds = album.tracks.slice(0, 4).map((track) => track.videoId);
  const artistCount = new Set(
    album.tracks.map((track) => track.artist.trim().toLowerCase()),
  ).size;

  function playFrom(index: number) {
    const current = currentSong?.id === playerSongs[index]?.id;
    if (current) toggle();
    else playPlaylist(albumKey, playerSongs, index);
  }

  return (
    <section
      data-behavior-area="saved_collection"
      className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 ${
        compact ? "max-w-3xl" : ""
      }`}
    >
      <div className="grid gap-5 border-b border-slate-800 p-4 sm:p-6 md:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)]">
        <AlbumCover
          videoIds={coverIds}
          title={album.title}
          className="w-full max-w-[13rem] shadow-xl shadow-black/30"
        />

        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              <SparklesIcon className="h-3.5 w-3.5" />
              {copy.liveMix}
            </p>
            <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {album.title}
            </h2>
            {album.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {album.description}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">{copy.playlistLength}</dt>
              <dd className="mt-0.5 font-medium text-slate-200">
                {copy.tracksUnit(album.tracks.length)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{copy.hitBalance}</dt>
              <dd className="mt-0.5 font-medium text-slate-200">
                {album.stats.anchors}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{copy.discoveryShare}</dt>
              <dd className="mt-0.5 font-medium text-slate-200">
                {album.stats.discoveries}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{copy.yearSpan}</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-slate-200">
                {album.stats.yearFrom && album.stats.yearTo
                  ? `${album.stats.yearFrom}-${album.stats.yearTo}`
                  : "-"}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                albumActive
                  ? toggle()
                  : playPlaylist(albumKey, playerSongs, 0)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              {albumActive && isPlaying ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              {albumActive && isPlaying ? copy.pauseAlbum : copy.playAlbum}
            </button>
            {actions}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {copy.trackHeading}
          </h3>
          <p className="text-xs text-slate-500">
            {copy.generationalMix(album.stats.generations)} /{" "}
            {copy.artists(artistCount)}
          </p>
        </div>

        <ol className="divide-y divide-slate-800/80">
          {album.tracks.map((track, index) => {
            const playerSong = playerSongs[index];
            const current = currentSong?.id === playerSong?.id;
            const role = copy.role[track.role] ?? track.role;
            return (
              <li
                key={`${track.songId}-${index}`}
                className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(8rem,auto)_auto] ${
                  current ? "bg-violet-500/[0.06]" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => playFrom(index)}
                  aria-label={
                    current && isPlaying
                      ? `${copy.pauseTrack} ${track.title}`
                      : `${copy.playTrack} ${track.title}`
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-violet-600 hover:text-white"
                >
                  {current && isPlaying ? (
                    <EqualizerIcon className="h-3.5 w-3.5" />
                  ) : (
                    <PlayIcon className="h-3.5 w-3.5" />
                  )}
                </button>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {track.artist}
                    {yearAndEra(track) ? ` / ${yearAndEra(track)}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
                      {role}
                    </span>
                    {track.emotions.slice(0, 2).map((emotion) => (
                      <span
                        key={emotion.id}
                        className="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-400"
                      >
                        {language === "vi"
                          ? emotion.nameVi ?? emotion.name
                          : emotion.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                  {track.signals.slice(0, 2).map((signal) => (
                    <SignalChip
                      key={signal}
                      signal={signal}
                      label={copy.signal[signal]}
                    />
                  ))}
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-200">
                    {track.popularityScore === null
                      ? "-"
                      : track.popularityScore.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {track.popularityTier ?? ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
            album.relaxations.includes("widened")
              ? "border-orange-400/20 bg-orange-400/[0.07] text-orange-200"
              : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
          }`}
        >
          {album.relaxations.includes("widened")
            ? copy.filterWidened
            : copy.noFilterWidened}
        </p>
      </div>
    </section>
  );
}
