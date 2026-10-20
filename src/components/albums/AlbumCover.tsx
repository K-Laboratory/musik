import Image from "next/image";

import { MusicIcon } from "@/components/Icons";

export function AlbumCover({
  videoIds,
  title,
  className = "",
}: {
  videoIds: string[];
  title: string;
  className?: string;
}) {
  const ids = [...new Set(videoIds.filter(Boolean))].slice(0, 4);
  const cellCount = ids.length <= 1 ? 1 : ids.length === 2 ? 2 : 4;
  const cells = Array.from({ length: cellCount }, (_, index) => ids[index] ?? null);

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 ${className}`}
      aria-label={title}
    >
      <div
        className={`grid h-full w-full gap-px bg-slate-800 ${
          cellCount === 1
            ? "grid-cols-1"
            : cellCount === 2
              ? "grid-cols-2"
              : "grid-cols-2 grid-rows-2"
        }`}
      >
        {cells.map((videoId, index) =>
          videoId ? (
            <div key={`${videoId}-${index}`} className="relative overflow-hidden bg-slate-900">
              <Image
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt=""
                fill
                sizes="(min-width: 1024px) 320px, 80vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div
              key={`empty-${index}`}
              className="flex items-center justify-center bg-slate-900 text-slate-700"
            >
              <MusicIcon className="h-8 w-8" />
            </div>
          ),
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5" />
    </div>
  );
}
