"use client";

import { useAdminLabels } from "@/lib/admin-i18n";

export function SongsFilter({
  query,
  gen,
  generations,
}: {
  query: string;
  gen: string;
  generations: { id: string; label_en: string; label_vi: string }[];
}) {
  const labels = useAdminLabels();

  return (
    <form className="flex flex-wrap items-center gap-2" action="/admin/songs">
      <input
        name="q"
        defaultValue={query}
        placeholder={labels.searchPlaceholder}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
      />
      <select
        name="gen"
        defaultValue={gen}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
      >
        <option value="">{labels.allGenerations}</option>
        {generations.map((generation) => (
          <option key={generation.id} value={generation.id}>
            {generation.label_en} ({generation.label_vi})
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
      >
        {labels.filter}
      </button>
    </form>
  );
}
