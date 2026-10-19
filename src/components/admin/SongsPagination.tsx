"use client";

import Link from "next/link";

import { useAdminLabels } from "@/lib/admin-i18n";

function hrefFor(
  page: number,
  query: string,
  gen: string,
): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (gen) params.set("gen", gen);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/songs${qs ? `?${qs}` : ""}`;
}

export function SongsPagination({
  page,
  pages,
  query,
  gen,
}: {
  page: number;
  pages: number;
  query: string;
  gen: string;
}) {
  const labels = useAdminLabels();
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1, query, gen)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800"
        >
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-slate-400">
        {labels.pageOf
          .replace("{page}", String(page))
          .replace("{pages}", String(pages))}
      </span>
      {page < pages ? (
        <Link
          href={hrefFor(page + 1, query, gen)}
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
