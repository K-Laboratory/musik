"use client";

/** Embedded YouTube player for a saved song. */
export function YouTubePlayer({
  videoId,
  title,
}: {
  videoId: string;
  title?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-xl">
      <div className="relative aspect-video">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title ? `Playing: ${title}` : "YouTube player"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}
