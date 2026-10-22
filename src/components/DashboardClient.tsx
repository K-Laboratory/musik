"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useData } from "@/components/DataProvider";
import {
  AlertIcon,
  DocumentIcon,
  MusicIcon,
  SparklesIcon,
  TrashIcon,
} from "@/components/Icons";
import { PlaylistPanel } from "@/components/PlaylistPanel";
import { DraggableSongCard, SongCardVisual } from "@/components/SongCard";
import { SongSearch } from "@/components/SongSearch";
import { useDisguise, useLabels, useLanguage } from "@/lib/disguise";
import { getErrorMessage } from "@/lib/errors";
import { usePersonalization } from "@/lib/personalization";
import { usePlayer } from "@/lib/player";
import type { Song } from "@/lib/types";
import type { AlbumTrack } from "@/lib/albums";
import { useViewMode } from "@/lib/view-mode";

export function DashboardClient() {
  const {
    songs,
    loading,
    error,
    refresh,
    addSongToPlaylist,
    removeSong,
    notify,
  } = useData();

  const { playSong, toggle, isCurrentSong, isPlaying } = usePlayer();
  const { track } = usePersonalization();
  const { mode } = useViewMode();
  const { isWork } = useDisguise();
  const { language } = useLanguage();
  const labels = useLabels();
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [discoveries, setDiscoveries] = useState<AlbumTrack[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedMood, setSelectedMood] = useState("late-night");
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [selectedEmotionId, setSelectedEmotionId] = useState<string | null>(null);
  const [generationOptions, setGenerationOptions] = useState<Array<{ id: string; label: string; count: number }>>([]);
  const [emotionOptions, setEmotionOptions] = useState<Array<{ id: string; label: string; count: number }>>([]);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [personalizationHint, setPersonalizationHint] = useState<string | null>(null);
  const discoverStarted = useRef(false);

  const discover = useCallback(async (mood = selectedMood, generationId = selectedGenerationId, emotionId = selectedEmotionId) => {
    setSelectedMood(mood);
    setSelectedGenerationId(generationId);
    setSelectedEmotionId(emotionId);
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const params = new URLSearchParams({ mood, language });
      if (generationId) params.set("generation", generationId);
      if (emotionId) params.set("emotion", emotionId);
      const response = await fetch(`/api/discover?${params.toString()}`);
      const payload = await response.json() as { tracks?: AlbumTrack[]; generationOptions?: Array<{ id: string; label: string; count: number }>; emotionOptions?: Array<{ id: string; label: string; count: number }>; personalization?: { active?: boolean; reasons?: string[] }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load your mix.");
      setDiscoveries(payload.tracks ?? []);
      setGenerationOptions(payload.generationOptions ?? []);
      setEmotionOptions(payload.emotionOptions ?? []);
      setPersonalizationHint(payload.personalization?.active && payload.personalization.reasons?.length
        ? payload.personalization.reasons.join(" · ")
        : null);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Could not load your mix.");
    } finally {
      setDiscovering(false);
    }
  }, [language, selectedEmotionId, selectedGenerationId, selectedMood]);

  useEffect(() => {
    if (!isWork && !loading && !discoverStarted.current) {
      discoverStarted.current = true;
      void discover("late-night", null, null);
    }
  }, [discover, isWork, loading]);

  function playDiscovery(track: AlbumTrack) {
    const song: Song = {
      id: track.songId,
      user_id: "discovery",
      youtube_video_id: track.videoId,
      title: track.title,
      channel_title: track.artist,
      thumbnail_url: track.thumbnailUrl,
      duration: null,
      created_at: new Date().toISOString(),
    };
    void playSong(song);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "song") {
      setActiveSong(songs.find((song) => song.id === data.songId) ?? null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveSong(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "song" && overData?.type === "playlist") {
      try {
        const { status } = await addSongToPlaylist(
          overData.playlistId as string,
          activeData.songId as string,
        );
        if (status === "added") {
          const savedSong = songs.find((song) => song.id === activeData.songId);
          track({
            eventType: "save",
            areaKey: "playlists",
            itemType: "song",
            itemId: savedSong?.youtube_video_id ?? activeData.songId as string,
          });
        }
        notify(
          status === "added"
            ? labels.addedToProject
            : labels.alreadyInProject,
          status === "added" ? "success" : "info",
        );
      } catch (err) {
        notify(getErrorMessage(err, labels.addToProjectError), "error");
      }
    }
  }

  async function handleRemoveSong(song: Song) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(labels.removeConfirm(song.title))
    ) {
      return;
    }
    try {
      await removeSong(song.id);
      notify(labels.removedFromLibrary, "success");
    } catch (err) {
      notify(getErrorMessage(err, labels.removeError), "error");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragCancel={() => setActiveSong(null)}
    >
      <div className={`grid gap-4 ${isWork ? "grid-cols-1" : "min-[900px]:grid-cols-[minmax(0,1fr)_18rem]"}`}>
        <div className="min-w-0 space-y-4">
          <section data-behavior-area={isWork ? undefined : "dashboard_discover"} className="relative isolate overflow-hidden rounded-xl border border-violet-300/15 bg-[#17122b] px-4 py-4 shadow-lg shadow-violet-950/15 sm:px-5">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_18%,rgba(244,114,182,0.18),transparent_38%),radial-gradient(ellipse_at_12%_100%,rgba(139,92,246,0.20),transparent_40%)]" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/75">{isWork ? "Workspace" : language === "vi" ? "Khám phá theo tâm trạng" : "Discover by mood"}</p><h1 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">{isWork ? "Welcome back" : language === "vi" ? "Tìm bài hát tiếp theo" : "Find your next favorite"}</h1></div>
              <Link href="/albums/design" className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-violet-100"><SparklesIcon className="h-3.5 w-3.5" />{isWork ? "Build a collection" : language === "vi" ? "Tạo bộ sưu tập" : "Create a mix"}</Link>
            </div>
            {!isWork && <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                ["feel-good", "☀", language === "vi" ? "Vui lên nào" : "Lift me up"],
                ["late-night", "◐", language === "vi" ? "Đêm khuya" : "After hours"],
                ["heart-on-sleeve", "♥", language === "vi" ? "Thật lòng" : "Feel it all"],
                ["slow-down", "♫", language === "vi" ? "Thư giãn" : "Take it slow"],
              ].map(([mood, icon, label]) => <button key={mood} type="button" data-behavior-action="filter_select" data-behavior-item-type="mood" data-behavior-item-id={mood} onClick={() => void discover(mood, selectedGenerationId, null)} className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${selectedMood === mood && !selectedEmotionId ? "border-violet-200/70 bg-white/15 text-white" : "border-white/15 bg-black/10 text-slate-200 hover:border-white/35 hover:bg-white/10"}`} aria-pressed={selectedMood === mood && !selectedEmotionId}>{icon} <span className="ml-1">{label}</span></button>)}
            </div>}
          </section>

          <section data-behavior-area={isWork ? undefined : "dashboard_search"}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">{labels.findHeading}</h2>
              <span className="text-[11px] text-slate-500">{labels.findSubtitle}</span>
            </div>
            <div className="mt-2">
              <SongSearch />
            </div>
          </section>

          {isWork && <PlaylistPanel className="h-fit" wide />}

          {!isWork && <section data-behavior-area="dashboard_mix" className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0"><h2 className="text-sm font-semibold text-white">{language === "vi" ? "Tuyển chọn cho lúc này" : selectedMood === "late-night" ? "A mix for right now" : "Your mood mix"}<span className="ml-2 text-xs font-normal text-slate-500">{discoveries.length ? `${discoveries.length} ${language === "vi" ? "bài" : "tracks"}` : language === "vi" ? "Từ kho nhạc" : "Catalog picks"}</span></h2>{personalizationHint && <p className="mt-0.5 truncate text-[10px] text-violet-300">{language === "vi" ? "Dựa trên gu nghe của bạn · " : "Picked from your listening · "}{personalizationHint}</p>}</div>
              <button type="button" onClick={() => void discover()} disabled={discovering} className="rounded-md px-2 py-1 text-xs font-medium text-violet-200 hover:bg-violet-500/10 disabled:opacity-50">{discovering ? language === "vi" ? "Đang tìm…" : "Finding…" : language === "vi" ? "Đổi bài ↻" : "Refresh ↻"}</button>
            </div>
            {discoverError && <p role="alert" className="mb-3 flex items-center justify-between gap-2 text-xs text-red-300"><span>{discoverError}</span><button type="button" onClick={() => void discover()} className="underline">Retry</button></p>}
            {discoveries.length ? <ul className="grid gap-1 sm:grid-cols-2">{discoveries.map((track, index) => <li key={`${track.songId}-${index}`}><button type="button" data-behavior-item-type="song" data-behavior-item-id={track.videoId} onClick={() => playDiscovery(track)} className="group flex w-full items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-950/50 p-1.5 text-left transition hover:border-violet-500/50 hover:bg-slate-900"><span className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-slate-800"><Image src={track.thumbnailUrl} alt="" fill sizes="56px" className="object-cover" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-white">{track.title}</span><span className="block truncate text-[10px] text-slate-400">{track.artist}{track.year ? ` · ${track.year}` : ""}</span></span><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[10px] text-violet-200 group-hover:bg-violet-500">▶</span></button></li>)}</ul> : <p className="px-2 py-3 text-xs text-slate-400">{discovering ? language === "vi" ? "Đang tìm bài phù hợp…" : "Finding songs for your mood…" : discoverError ? language === "vi" ? "Không thể tải danh sách nhạc." : "Your mix couldn’t load." : language === "vi" ? "Chọn tâm trạng để nghe danh sách nhạc tuyển chọn." : "Tap a mood above to hear a handpicked mini mix."}</p>}
          </section>}

          <section data-behavior-area={isWork ? undefined : "library"}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                {labels.documentsHeading}{" "}
                <span className="text-sm font-normal text-slate-400">
                  ({songs.length})
                </span>
              </h2>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">{error}</div>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="shrink-0 font-medium text-red-100 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {loading && songs.length === 0 ? (
              <div
                className={`grid gap-2.5 ${mode === "compact" ? "" : isWork ? "sm:grid-cols-2 min-[900px]:grid-cols-3" : "sm:grid-cols-2 min-[1380px]:grid-cols-3"}`}
                aria-hidden="true"
              >
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[72px] animate-pulse rounded-xl bg-slate-800/60"
                  />
                ))}
              </div>
            ) : songs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-12 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/70 text-slate-400">
                  {isWork ? (
                    <DocumentIcon className="h-6 w-6" />
                  ) : (
                    <MusicIcon className="h-6 w-6" />
                  )}
                </span>
                <p className="text-sm text-slate-300">
                  {labels.emptyLibraryTitle}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {labels.emptyLibraryHint}
                </p>
              </div>
            ) : (
              <ul className={`grid gap-2.5 ${mode === "compact" ? "" : isWork ? "sm:grid-cols-2 min-[900px]:grid-cols-3" : "sm:grid-cols-2 min-[1380px]:grid-cols-3"}`}>
                {songs.map((song) => {
                  const current = isCurrentSong(song.id);
                  return (
                    <li key={song.id} data-behavior-item-type="song" data-behavior-item-id={song.youtube_video_id}>
                      <DraggableSongCard
                        song={song}
                        active={current}
                        playing={current && isPlaying}
                        onTogglePlay={() => (current ? toggle() : playSong(song))}
                        actions={
                          <button
                            type="button"
                            aria-label={`Remove ${song.title} from library`}
                            onClick={() => void handleRemoveSong(song)}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {!isWork && <aside className="space-y-3">
          <PlaylistPanel className="h-fit" />
          {!isWork && <section data-behavior-area="browse_generations" className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{language === "vi" ? "Khám phá theo thế hệ" : "Browse generations"}</h2>
              <span className="text-[10px] text-slate-500">{generationOptions.reduce((sum, item) => sum + item.count, 0).toLocaleString()} {language === "vi" ? "bài" : "songs"}</span>
            </div>
            <div className="divide-y divide-slate-800/80">
              {generationOptions.map((generation) => <button key={generation.id} type="button" data-behavior-action={selectedGenerationId === generation.id ? "click" : "filter_select"} data-behavior-item-type="generation" data-behavior-item-id={generation.id} onClick={() => void discover(selectedMood, selectedGenerationId === generation.id ? null : generation.id, selectedEmotionId)} aria-pressed={selectedGenerationId === generation.id} className={`flex w-full items-center justify-between gap-3 rounded px-2 py-2 text-left text-xs transition ${selectedGenerationId === generation.id ? "bg-violet-500/15 text-violet-100" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"}`}><span>{generation.label}</span><span className="tabular-nums text-slate-500">{generation.count.toLocaleString()}</span></button>)}
            </div>
          </section>}
          {!isWork && <section data-behavior-area="browse_emotions" className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{language === "vi" ? "Khám phá theo cảm xúc" : "Browse by feeling"}</h2>
              {selectedEmotionId && <button type="button" onClick={() => void discover(selectedMood, selectedGenerationId, null)} className="text-[10px] text-violet-300 hover:text-white">{language === "vi" ? "Xóa" : "Clear"}</button>}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {emotionOptions.map((emotion) => <button key={emotion.id} type="button" data-behavior-action={selectedEmotionId === emotion.id ? "click" : "filter_select"} data-behavior-item-type="emotion" data-behavior-item-id={emotion.id} onClick={() => void discover(selectedMood, selectedGenerationId, selectedEmotionId === emotion.id ? null : emotion.id)} aria-pressed={selectedEmotionId === emotion.id} className={`flex min-w-0 items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] transition ${selectedEmotionId === emotion.id ? "border-violet-500/40 bg-violet-500/15 text-violet-100" : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white"}`}><span className="truncate">{emotion.label}</span><span className="shrink-0 tabular-nums text-[10px] text-slate-500">{emotion.count}</span></button>)}
            </div>
          </section>}
        </aside>}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeSong ? (
          <div className="w-80 cursor-grabbing">
            <SongCardVisual
              song={activeSong}
              variant={isWork ? "compact" : mode}
              className="border-violet-500/60 shadow-2xl shadow-violet-900/40"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
