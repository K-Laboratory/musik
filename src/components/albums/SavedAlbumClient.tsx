"use client";

import Link from "next/link";

import { AlbumCollection } from "@/components/albums/AlbumCollection";
import { ALBUM_COPY } from "@/lib/album-copy";
import type { AlbumView } from "@/lib/albums";
import { useLanguage } from "@/lib/disguise";

export function SavedAlbumClient({ album }: { album: AlbumView }) {
  const { language } = useLanguage();
  const copy = ALBUM_COPY[language];

  return (
    <div className="space-y-4">
      <Link
        href="/albums/design"
        className="inline-flex text-sm text-slate-400 transition hover:text-white"
      >
        &larr; {copy.backToStudio}
      </Link>
      <AlbumCollection
        album={album}
        actions={
          <Link
            href="/albums/design"
            className="inline-flex items-center rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            {copy.designAnother}
          </Link>
        }
      />
    </div>
  );
}
