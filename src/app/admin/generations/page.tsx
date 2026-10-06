import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Generations - Admin" };

export default async function AdminGenerationsPage() {
  const supabase = await createClient();

  const [{ data: generations }, { data: songs }] = await Promise.all([
    supabase.from("generations").select("*").order("position", { ascending: true }),
    supabase.from("catalog_songs").select("generation_id"),
  ]);

  const counts = new Map<string, number>();
  for (const song of songs ?? []) {
    if (!song.generation_id) continue;
    counts.set(song.generation_id, (counts.get(song.generation_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Generations
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Vietnamese generational cohorts. Song counts show how many catalog
          songs are seeded per generation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(generations ?? []).map((generation) => (
          <div
            key={generation.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-white">
                {generation.label_en}
              </h2>
              <span className="shrink-0 rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-200">
                {counts.get(generation.id) ?? 0} songs
              </span>
            </div>
            <p className="mt-0.5 text-sm text-violet-300">
              {generation.label_vi}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {generation.birth_start && generation.birth_end
                ? `Born ${generation.birth_start}–${generation.birth_end}`
                : "Birth years overlap other cohorts"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {generation.formative_era}
            </p>
          </div>
        ))}
        {(generations ?? []).length === 0 && (
          <p className="text-sm text-slate-500">
            No generations loaded. Run the schema migration to seed them.
          </p>
        )}
      </div>
    </div>
  );
}
