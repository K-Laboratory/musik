/**
 * Loads the YouTube IFrame Player API exactly once and shares the promise.
 * We need the API (rather than a plain <iframe>) so the app can control
 * play/pause and auto-advance to the next song in a playlist.
 */

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<typeof YT> | null = null;

export function loadYouTubeIframeApi(): Promise<typeof YT> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube player is browser-only."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise<typeof YT>((resolve, reject) => {
    const previousHandler = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousHandler?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("The YouTube player could not be initialised."));
    };

    if (!document.querySelector('script[data-youtube-iframe-api="true"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.youtubeIframeApi = "true";
      script.onerror = () =>
        reject(new Error("Could not load the YouTube player."));
      document.head.appendChild(script);
    }

    // Safety net in case the global callback never fires.
    window.setTimeout(() => {
      if (window.YT?.Player) resolve(window.YT);
    }, 10000);
  });

  return apiPromise;
}
