import { createClient } from "@/lib/supabase/server";
import { AdminText } from "@/lib/admin-i18n";

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
          <AdminText k="generationsTitle" />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          <AdminText k="generationsDescription" />
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
                <AdminText
                  k="songsCount"
                  values={{ count: counts.get(generation.id) ?? 0 }}
                />
              </span>
            </div>
            <p className="mt-0.5 text-sm text-violet-300">
              {generation.label_vi}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {generation.birth_start && generation.birth_end
                ? (
                    <AdminText
                      k="born"
                      values={{
                        start: generation.birth_start,
                        end: generation.birth_end,
                      }}
                    />
                  )
                : <AdminText k="birthOverlap" />}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {generation.formative_era}
            </p>
          </div>
        ))}
        {(generations ?? []).length === 0 && (
          <p className="text-sm text-slate-500">
            <AdminText k="noGenerations" />
          </p>
        )}
      </div>
    </div>
  );
}
