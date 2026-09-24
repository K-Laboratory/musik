"use client";

import { useEffect, useRef, useState } from "react";

import { useData } from "@/components/DataProvider";
import { usePlayer } from "@/lib/player";
import { loadYouTubeIframeApi } from "@/lib/youtube-iframe";

/**
 * Owns the single YouTube player instance for the whole app.
 *
 * In normal mode it is rendered inside the Now Playing bar so the video is
 * visible. In compact mode its container is collapsed to 1x1 px, which keeps
 * the audio playing without showing any video.
 */
export function PlayerEngine({ className = "" }: { className?: string }) {
  const { currentSong, isPlaying, setIsPlaying, setProgress, setReady, next } =
    usePlayer();
  const { notify } = useData();

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [ready, setLocalReady] = useState(false);

  const videoId = currentSong?.youtube_video_id ?? null;

  // Keep callbacks in refs so the player is created exactly once.
  const nextRef = useRef(next);
  const playingRef = useRef(setIsPlaying);
  const notifyRef = useRef(notify);
  useEffect(() => {
    nextRef.current = next;
    playingRef.current = setIsPlaying;
    notifyRef.current = notify;
  }, [next, setIsPlaying, notify]);

  // Create the player.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const mount = document.createElement("div");
    mount.style.width = "100%";
    mount.style.height = "100%";
    container.appendChild(mount);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (destroyed) return;

        const player = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (destroyed) return;
              playerRef.current = player;
              setLocalReady(true);
              setReady(true);
            },
            onStateChange: (event) => {
              const namespace = window.YT;
              if (!namespace) return;
              if (event.data === namespace.PlayerState.PLAYING) {
                playingRef.current(true);
              } else if (event.data === namespace.PlayerState.PAUSED) {
                playingRef.current(false);
              } else if (event.data === namespace.PlayerState.ENDED) {
                nextRef.current();
              }
            },
            onError: () => {
              playingRef.current(false);
              notifyRef.current(
                "This video can't be played in the app. Try another song.",
                "error",
              );
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        // The bar still renders song metadata; only playback is unavailable.
      });

    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // The player may already be gone.
      }
      playerRef.current = null;
      mount.remove();
    };
  }, [setReady]);

  // Load the current video (or stop when nothing is selected).
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;

    if (!videoId) {
      player.stopVideo();
      return;
    }
    player.loadVideoById(videoId);
  }, [ready, videoId]);

  // Sync play / pause with our state.
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player || !videoId) return;

    const playerState = player.getPlayerState();
    const isActuallyPlaying =
      playerState === YT.PlayerState.PLAYING ||
      playerState === YT.PlayerState.BUFFERING;

    if (isPlaying && !isActuallyPlaying) {
      player.playVideo();
    } else if (!isPlaying && playerState === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    }
  }, [ready, isPlaying, videoId]);

  // Report progress for the progress bar.
  useEffect(() => {
    if (!ready) return;

    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        setProgress(
          Math.floor(player.getCurrentTime() ?? 0),
          Math.floor(player.getDuration() ?? 0),
        );
      } catch {
        // Player not ready yet.
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [ready, setProgress]);

  return <div ref={containerRef} className={className} />;
}
