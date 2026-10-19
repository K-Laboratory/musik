import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { AdminText } from "@/lib/admin-i18n";

export const metadata = { title: "Taxonomy - Admin" };

/** Maps a −2..2 value to a 0..100% position within the plot. */
function pct(value: number): number {
  return ((Math.max(-2, Math.min(2, value)) + 2) / 4) * 100;
}

function quadrantLabel(quadrant: string, language: "en" | "vi"): string {
  const labels: Record<string, [string, string]> = {
    Q1_happy: ["Q1 - Happy / Activated", "Q1 - Vui / Kích hoạt"],
    Q2_angry: ["Q2 - Angry / Tense", "Q2 - Giận / Căng"],
    Q3_sad: ["Q3 - Sad / Low", "Q3 - Buồn / Trầm"],
    Q4_relaxed: ["Q4 - Relaxed / Calm", "Q4 - Thư giãn / Bình yên"],
  };
  return labels[quadrant]?.[language === "vi" ? 1 : 0] ?? quadrant;
}

export default async function AdminTaxonomyPage() {
  const language =
    (await cookies()).get("musik_lang")?.value === "vi" ? "vi" : "en";
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
          <AdminText k="taxonomyTitle" />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          <AdminText k="taxonomyDescription" values={{ count: list.length }} />
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
            {language === "vi" ? "sắc thái →" : "valence →"}
          </span>
          <span className="absolute top-1/2 -left-6 -translate-y-1/2 -rotate-90 text-xs text-slate-500">
            {language === "vi" ? "năng lượng →" : "arousal →"}
          </span>
          {list.map((emotion) => (
            <span
              key={emotion.id}
              title={`${language === "vi" ? emotion.name_vi ?? emotion.name : emotion.name} (v=${emotion.valence}, a=${emotion.arousal})`}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-400 ring-2 ring-violet-400/20"
              style={{
                left: `${pct(emotion.valence)}%`,
                bottom: `${pct(emotion.arousal)}%`,
              }}
            />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">
          <AdminText k="bottomLeft" /> · <AdminText k="topRight" />
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2.5 font-medium"><AdminText k="id" /></th>
              <th className="px-4 py-2.5 font-medium"><AdminText k="name" /></th>
              <th className="px-4 py-2.5 font-medium"><AdminText k="definition" /></th>
              <th className="px-4 py-2.5 font-medium"><AdminText k="soundsLike" /></th>
              <th className="px-4 py-2.5 font-medium"><AdminText k="quadrant" /></th>
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
                  {language === "vi" ? emotion.name_vi ?? emotion.name : emotion.name}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {language === "vi"
                    ? emotion.definition_vi ?? emotion.definition
                    : emotion.definition}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {language === "vi"
                    ? emotion.sounds_like_vi ?? emotion.sounds_like
                    : emotion.sounds_like}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {quadrantLabel(emotion.quadrant, language)}
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
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  <AdminText k="noEmotions" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
