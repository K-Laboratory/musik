import Link from "next/link";

import { ClassifyRunner } from "@/components/admin/ClassifyRunner";
import { AdminText } from "@/lib/admin-i18n";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin - Emotion Classification" };

async function count(table: "catalog_songs" | "emotions" | "generations" | "song_analysis") {
  const supabase = await createClient();
  const { count: value } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return value ?? 0;
}

export default async function AdminOverviewPage() {
  const [songs, emotions, generations, analyzed] = await Promise.all([
    count("catalog_songs"),
    count("emotions"),
    count("generations"),
    count("song_analysis"),
  ]);

  const pending = Math.max(0, songs - analyzed);

  const cards = [
    { key: "catalogSongs" as const, value: songs, href: "/admin/songs" },
    { key: "emotionCategories" as const, value: emotions, href: "/admin/taxonomy" },
    { key: "generations" as const, value: generations, href: "/admin/generations" },
    { key: "analyzed" as const, value: analyzed, href: "/admin/songs" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          <AdminText k="overviewTitle" />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          <AdminText k="overviewSubtitle" />
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-slate-700"
          >
            <p className="text-3xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-sm text-slate-400">
              <AdminText k={card.key} />
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          <AdminText k="pipelineStatus" />
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {pending === 0 ? (
            <AdminText k="everyAnalyzed" />
          ) : (
            <AdminText
              k="songsNotAnalyzed"
              values={{ pending, total: songs }}
            />
          )}
        </p>
      </div>

      <ClassifyRunner />
    </div>
  );
}
