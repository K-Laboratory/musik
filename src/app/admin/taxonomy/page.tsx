import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Taxonomy - Admin" };

/** Maps a −2..2 value to a 0..100% position within the plot. */
function pct(value: number): number {
  return ((Math.max(-2, Math.min(2, value)) + 2) / 4) * 100;
}

export default async function AdminTaxonomyPage() {
  const supabase = await createClient();
  const { data: emotions } = await supabase
    .from("emotions")
    .select("*")
    .order("valence", { ascending: false })
    .order("arousal", { ascending: false });

  const list = emotions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Emotion taxonomy
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {list.length} categories on the valence–arousal plane. Every song is
          tagged with one or more of these, plus V-A coordinates.
        </p>
      </div>

      {/* Valence-arousal scatter: x = valence, y = arousal (up = energetic). */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="relative mx-auto aspect-square w-full max-w-lg">
          <div className="absolute inset-0 rounded-lg border border-slate-700 bg-slate-950/40" />
          {/* Axes */}
          <div className="absolute left-1/2 top-0 h-full w-px bg-slate-700/70" />
          <div className="absolute top-1/2 left-0 h-px w-full bg-slate-700/70" />
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-500">
            valence →
          </span>
          <span className="absolute top-1/2 -left-6 -translate-y-1/2 -rotate-90 text-xs text-slate-500">
            arousal →
          </span>
          {list.map((emotion) => (
            <span
              key={emotion.id}
              title={`${emotion.name} (v=${emotion.valence}, a=${emotion.arousal})`}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-400 ring-2 ring-violet-400/20"
              style={{
                left: `${pct(emotion.valence)}%`,
                bottom: `${pct(emotion.arousal)}%`,
              }}
            />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">
          Bottom-left = sad & calm · Top-right = happy & energetic
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Sounds like</th>
              <th className="px-4 py-2.5 font-medium">Quadrant</th>
              <th className="px-4 py-2.5 text-right font-medium">V</th>
              <th className="px-4 py-2.5 text-right font-medium">A</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {list.map((emotion) => (
              <tr key={emotion.id} className="hover:bg-slate-900/40">
                <td className="px-4 py-2 font-mono text-xs text-slate-400">
                  {emotion.id}
                </td>
                <td className="px-4 py-2 font-medium text-white">
                  {emotion.name}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {emotion.sounds_like}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {emotion.quadrant}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-300">
                  {emotion.valence.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-300">
                  {emotion.arousal.toFixed(1)}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No emotions loaded. Run the schema migration to seed the
                  taxonomy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
