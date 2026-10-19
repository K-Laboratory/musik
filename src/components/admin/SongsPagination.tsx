"use client";

"use client";

import Link from "next/link";

import { useAdminLabels } from "@/lib/admin-i18n";
import {
  songFilterParams,
  songListHref,
  type SongListFilters,
} from "@/lib/song-filters";

export function SongsPagination({
  page,
  pages,
  filters,
}: {
  page: number;
  pages: number;
  filters: SongListFilters;
}) {
  const labels = useAdminLabels();
  if (pages <= 1) return null;

  const params = songFilterParams(filters);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link
          href={songListHref(filters, page - 1)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800"
        >
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}
      <div className="flex flex-wrap items-center gap-2 text-slate-400">
        <span>
          {labels.pageOf
            .replace("{page}", String(page))
            .replace("{pages}", String(pages))}
        </span>
        <form
          action="/admin/songs"
          method="get"
          className="flex items-center gap-1.5"
        >
          {Object.entries(params).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label htmlFor="admin-songs-page-jump" className="sr-only">
            {labels.goToPage}
          </label>
          <input
            key={page}
            id="admin-songs-page-jump"
            name="page"
            type="number"
            min={1}
            max={pages}
            defaultValue={page}
            className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-white focus:border-violet-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
          >
            {labels.go}
          </button>
        </form>
      </div>
      {page < pages ? (
        <Link
          href={songListHref(filters, page + 1)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800"
        >
          {labels.next}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
