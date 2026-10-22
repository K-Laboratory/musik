"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/lib/disguise";

type Days = 7 | 30 | 90;
interface DailyRow { date: string; activeUsers: number; events: number; plays: number }
interface AreaRow {
  areaKey: string;
  activeUsers: number;
  events: number;
  views: number;
  clicks: number;
  plays: number;
  dwellMs: number;
  pointerPauses: number;
}
interface EventTypeRow { eventType: string; activeUsers: number; events: number }
interface Analytics {
  windowDays: Days;
  retentionDays: number;
  collectionEnabled: boolean;
  privacyThreshold: number;
  privacySuppressed: boolean;
  activeUsers: number | null;
  optedInUsers: number | null;
  eventCount: number | null;
  plays: number | null;
  daily: DailyRow[];
  areas: AreaRow[];
  eventTypes: EventTypeRow[];
}

const AREA_NAMES: Record<string, { en: string; vi: string }> = {
  app_navigation: { en: "App navigation", vi: "Điều hướng ứng dụng" },
  dashboard_discover: { en: "Mood discovery", vi: "Khám phá tâm trạng" },
  dashboard_search: { en: "Song search", vi: "Tìm bài hát" },
  dashboard_mix: { en: "Personal mix", vi: "Danh sách cá nhân" },
  library: { en: "Music library", vi: "Thư viện nhạc" },
  playlists: { en: "Playlists", vi: "Danh sách phát" },
  browse_generations: { en: "Generations", vi: "Thế hệ nhạc" },
  browse_emotions: { en: "Feelings", vi: "Cảm xúc" },
  collection_builder: { en: "Collection builder", vi: "Tạo bộ sưu tập" },
  playlist_detail: { en: "Playlist listening", vi: "Nghe danh sách phát" },
  saved_collection: { en: "Saved collections", vi: "Bộ sưu tập đã lưu" },
  player_controls: { en: "Player", vi: "Trình phát" },
  recommendation_settings: { en: "Recommendation settings", vi: "Cài đặt đề xuất" },
};

const EVENT_NAMES: Record<string, { en: string; vi: string }> = {
  area_view: { en: "Section views", vi: "Lượt xem khu vực" },
  item_view: { en: "Song card views", vi: "Lượt xem thẻ bài hát" },
  click: { en: "Clicks", vi: "Lượt nhấp" },
  play: { en: "Plays", vi: "Lượt nghe" },
  pause: { en: "Pauses", vi: "Lượt tạm dừng" },
  skip: { en: "Skips", vi: "Lượt bỏ qua" },
  complete: { en: "Completions", vi: "Lượt nghe hết" },
  save: { en: "Saves", vi: "Lượt lưu" },
  filter_select: { en: "Filter actions", vi: "Thao tác lọc" },
  pointer_pause: { en: "Brief pauses", vi: "Lần dừng ngắn" },
};

function formatNumber(value: number, language: "en" | "vi") {
  return new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatDwell(value: number, language: "en" | "vi") {
  const minutes = Math.round(value / 60_000);
  return language === "vi" ? `${formatNumber(minutes, language)} phút` : `${formatNumber(minutes, language)} min`;
}

export function BehaviorAnalytics() {
  const { language } = useLanguage();
  const en = language === "en";
  const [days, setDays] = useState<Days>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/behavior?days=${days}`, { cache: "no-store" });
      if (!response.ok) throw new Error(en ? "Could not load behavior insights." : "Không tải được phân tích hành vi.");
      setData(await response.json() as Analytics);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? "Could not load behavior insights." : "Không tải được phân tích hành vi."));
    } finally {
      setLoading(false);
    }
  }, [days, en]);

  useEffect(() => { void refresh(); }, [refresh]);

  const cardClass = "min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 p-3";
  const panelClass = "min-w-0 rounded-xl border border-slate-800 bg-slate-900/40 p-3";
  const chart = data?.daily ?? [];
  const maxEvents = Math.max(1, ...chart.map((row) => row.events));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">{en ? "Product analytics · privacy protected" : "Phân tích sản phẩm · bảo vệ quyền riêng tư"}</p>
          <h1 className="mt-1 text-xl font-semibold text-white">{en ? "Behavior insights" : "Phân tích hành vi"}</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            {en
              ? "Aggregate signals from people who enabled personalization. Small groups are hidden; individual listening histories are not available here."
              : "Tín hiệu tổng hợp từ những người đã bật cá nhân hóa. Nhóm nhỏ được ẩn; trang này không hiển thị lịch sử nghe của từng người."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5" aria-label={en ? "Analytics date range" : "Khoảng thời gian phân tích"}>
            {([7, 30, 90] as const).map((option) => (
              <button key={option} type="button" onClick={() => setDays(option)} aria-pressed={days === option}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium ${days === option ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
                {option} {en ? "days" : "ngày"}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading}
            className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50">
            {loading ? (en ? "Refreshing…" : "Đang tải…") : (en ? "Refresh" : "Làm mới")}
          </button>
          <Link href="/admin/behavior/settings" className="rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-medium text-white hover:bg-violet-500">
            {en ? "Collection settings" : "Cài đặt thu thập"}
          </Link>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}

      {data && <>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px]">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium ${data.collectionEnabled ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${data.collectionEnabled ? "bg-emerald-400" : "bg-amber-300"}`} />
            {data.collectionEnabled ? (en ? "Collection active" : "Đang thu thập") : (en ? "Collection paused" : "Đã tạm dừng thu thập")}
          </span>
          <span className="text-slate-500">{en ? `Retention: ${data.retentionDays} days` : `Lưu trữ: ${data.retentionDays} ngày`}</span>
          <span className="text-slate-500">{en ? `Updated window: last ${data.windowDays} days` : `Khoảng xem: ${data.windowDays} ngày qua`}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {[
            { label: en ? "Active opted-in users" : "Người dùng bật cá nhân hóa", value: data.activeUsers },
            { label: en ? "Users opted in" : "Người đã bật", value: data.optedInUsers },
            { label: en ? "Activity signals" : "Tín hiệu hoạt động", value: data.eventCount },
            { label: en ? "Song plays" : "Lượt nghe", value: data.plays },
          ].map((item) => (
            <div key={item.label} className={cardClass}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums text-white">
                {loading && !data ? "—" : item.value === null ? "•••" : formatNumber(item.value, language)}
              </p>
            </div>
          ))}
        </div>

        {data.privacySuppressed && <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] leading-5 text-amber-100/80">
          {en
            ? `Insights are hidden until at least ${data.privacyThreshold} opted-in users contribute in this period. No user-level data is shown.`
            : `Phân tích được ẩn cho đến khi có ít nhất ${data.privacyThreshold} người bật cá nhân hóa đóng góp trong khoảng thời gian này. Không hiển thị dữ liệu từng người.`}
        </p>}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <section className={panelClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold text-white">{en ? "Daily activity" : "Hoạt động theo ngày"}</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">{en ? "Signals across opted-in accounts" : "Tín hiệu từ các tài khoản đã bật"}</p>
              </div>
              <span className="text-[10px] text-slate-500">{en ? "Events" : "Sự kiện"}</span>
            </div>
            {chart.length > 0 ? <div className="mt-3 overflow-x-auto pb-1">
              <div className="flex h-36 min-w-max items-end gap-1 border-b border-slate-800 px-1">
                {chart.map((row) => {
                  const height = Math.max(3, Math.round((row.events / maxEvents) * 105));
                  return <div key={row.date} className="group flex h-full w-5 flex-col items-center justify-end gap-1" title={`${row.date}: ${formatNumber(row.events, language)} ${en ? "events" : "sự kiện"}, ${formatNumber(row.activeUsers, language)} ${en ? "users" : "người dùng"}`}>
                    <span className="hidden text-[9px] text-slate-400 group-hover:block">{formatNumber(row.events, language)}</span>
                    <div className="w-3 rounded-t-sm bg-gradient-to-t from-violet-700 to-violet-400" style={{ height }} />
                  </div>;
                })}
              </div>
              <div className="mt-1 flex min-w-max justify-between px-1 text-[9px] text-slate-600">
                <span>{chart[0]?.date}</span><span>{chart.at(-1)?.date}</span>
              </div>
            </div> : <p className="mt-6 py-8 text-center text-xs text-slate-500">{data.privacySuppressed ? (en ? "No chart available at this privacy threshold." : "Không có biểu đồ ở ngưỡng quyền riêng tư này.") : (en ? "No activity in this period." : "Không có hoạt động trong khoảng thời gian này.")}</p>}
          </section>

          <section className={panelClass}>
            <div>
              <h2 className="text-xs font-semibold text-white">{en ? "Event mix" : "Cơ cấu sự kiện"}</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">{en ? "Only categories with enough contributors" : "Chỉ hiện nhóm đủ số người đóng góp"}</p>
            </div>
            {data.eventTypes.length > 0 ? <div className="mt-2 divide-y divide-slate-800/80">
              {data.eventTypes.map((row) => {
                const name = EVENT_NAMES[row.eventType]?.[language] ?? row.eventType.replaceAll("_", " ");
                const max = Math.max(1, ...data.eventTypes.map((item) => item.events));
                return <div key={row.eventType} className="py-2">
                  <div className="flex justify-between gap-3 text-[10px]"><span className="text-slate-300">{name}</span><span className="tabular-nums text-slate-400">{formatNumber(row.events, language)}</span></div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.max(2, row.events / max * 100)}%` }} /></div>
                </div>;
              })}
            </div> : <p className="py-8 text-center text-xs text-slate-500">{en ? "No event breakdown available." : "Không có chi tiết sự kiện."}</p>}
          </section>
        </div>

        <section className={`${panelClass} overflow-hidden`}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold text-white">{en ? "Product areas" : "Khu vực sản phẩm"}</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">{en ? "Aggregated use by interface area" : "Mức sử dụng tổng hợp theo khu vực giao diện"}</p>
            </div>
            <span className="text-[10px] text-slate-500">{en ? "People count only when ≥" : "Số người chỉ hiện khi ≥"} {data.privacyThreshold}</span>
          </div>
          {data.areas.length > 0 ? <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[10px]">
              <thead className="border-y border-slate-800 text-[9px] uppercase tracking-wide text-slate-500">
                <tr><th className="py-2 pr-3 font-medium">{en ? "Area" : "Khu vực"}</th><th className="px-2 py-2 text-right font-medium">{en ? "People" : "Người"}</th><th className="px-2 py-2 text-right font-medium">{en ? "Events" : "Sự kiện"}</th><th className="px-2 py-2 text-right font-medium">{en ? "Views" : "Lượt xem"}</th><th className="px-2 py-2 text-right font-medium">{en ? "Clicks" : "Lượt nhấp"}</th><th className="px-2 py-2 text-right font-medium">{en ? "Plays" : "Lượt nghe"}</th><th className="py-2 pl-2 text-right font-medium">{en ? "Time" : "Thời gian"}</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.areas.map((row) => <tr key={row.areaKey}>
                  <td className="py-2 pr-3 font-medium text-slate-200">{AREA_NAMES[row.areaKey]?.[language] ?? row.areaKey.replaceAll("_", " ")}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-400">{formatNumber(row.activeUsers, language)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-300">{formatNumber(row.events, language)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-400">{formatNumber(row.views, language)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-400">{formatNumber(row.clicks, language)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-400">{formatNumber(row.plays, language)}</td>
                  <td className="py-2 pl-2 text-right tabular-nums text-slate-400">{formatDwell(row.dwellMs, language)}</td>
                </tr>)}
              </tbody>
            </table>
          </div> : <p className="py-7 text-center text-xs text-slate-500">{en ? "Area data is hidden until groups meet the privacy threshold." : "Dữ liệu khu vực bị ẩn đến khi nhóm đạt ngưỡng quyền riêng tư."}</p>}
        </section>
      </>}
    </div>
  );
}
