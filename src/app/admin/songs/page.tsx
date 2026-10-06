import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Songs - Admin" };

const PAGE_SIZE = 50;

/** PostgREST likes `%` escaped in ilike patterns. */
function likeValue(value: string): string {
  return `%${value.replace(/[%_]/g, "")}%`;
}

export default async function AdminSongsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gen?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const gen = params.gen ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let request = supabase
    .from("catalog_songs")
    .select("*", { count: "exact" });

  if (query) {
    request = request.or(
      `title.ilike.${likeValue(query)},artist.ilike.${likeValue(query)}`,
    );
  }
  if (gen) request = request.eq("generation_id", gen);

  const { data: songs, count } = await request
    .order("year", { ascending: true })
    .order("title", { ascending: true })
    .range(from, to);

  const { data: gens } = await supabase
    .from("generations")
    .select("*")
    .order("position", { ascending: true });

  const genLabel = new Map((gens ?? []).map((g) => [g.id, g.label_en]));
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (gen) sp.set("gen", gen);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return `/admin/songs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Songs
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {total} song{total === 1 ? "" : "s"} in the catalog
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2" action="/admin/songs">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search title or artist..."
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
          <select
            name="gen"
            defaultValue={gen}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
          >
            <option value="">All generations</option>
            {(gens ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.label_en} ({g.label_vi})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Artist</th>
              <th className="px-4 py-2.5 font-medium">Year</th>
              <th className="px-4 py-2.5 font-medium">Generation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(songs ?? []).map((song, index) => (
              <tr key={song.id} className="hover:bg-slate-900/40">
                <td className="px-4 py-2 text-slate-500">{from + index + 1}</td>
                <td className="px-4 py-2 font-medium text-white">
                  {song.title}
                </td>
                <td className="px-4 py-2 text-slate-300">{song.artist}</td>
                <td className="px-4 py-2 text-slate-400">
                  {song.year ?? "—"}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {song.generation_id
                    ? (genLabel.get(song.generation_id) ?? song.generation_id)
                    : "—"}
                </td>
              </tr>
            ))}
            {(songs ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No songs match. Run the seed migration to load the catalog.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-400">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={buildHref(page + 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
