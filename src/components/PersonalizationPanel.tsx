"use client";

import { useLanguage } from "@/lib/disguise";
import { usePersonalization } from "@/lib/personalization";

const AREA_LABELS = {
  en: {
    app_navigation: "App navigation",
    dashboard_discover: "Mood discovery",
    dashboard_search: "Song search",
    dashboard_mix: "Your mix",
    library: "Music library",
    playlists: "Playlists",
    browse_generations: "Generations",
    browse_emotions: "Feelings",
    collection_builder: "Collection builder",
    playlist_detail: "Playlist listening",
    saved_collection: "Saved collections",
    player_controls: "Player",
    recommendation_settings: "Recommendation settings",
  },
  vi: {
    app_navigation: "Điều hướng ứng dụng",
    dashboard_discover: "Khám phá tâm trạng",
    dashboard_search: "Tìm bài hát",
    dashboard_mix: "Danh sách nhạc",
    library: "Thư viện nhạc",
    playlists: "Danh sách phát",
    browse_generations: "Thế hệ nhạc",
    browse_emotions: "Cảm xúc",
    collection_builder: "Tạo bộ sưu tập",
    playlist_detail: "Nghe danh sách phát",
    saved_collection: "Bộ sưu tập đã lưu",
    player_controls: "Trình phát",
    recommendation_settings: "Cài đặt đề xuất",
  },
} as const;

function formatDwell(milliseconds: number, language: "en" | "vi") {
  const minutes = Math.round(milliseconds / 60_000);
  return language === "vi" ? `${minutes} phút` : `${minutes} min`;
}

export function PersonalizationPanel() {
  const { language } = useLanguage();
  const { enabled, available, collectionEnabled, retentionDays, loading, saving, error, summary, setEnabled, clearHistory } = usePersonalization();
  const labels = AREA_LABELS[language];
  const en = language === "en";

  async function handleClear() {
    const message = en
      ? "Delete your stored recommendation activity? This cannot be undone."
      : "Xóa hoạt động đã lưu để đề xuất? Thao tác này không thể hoàn tác.";
    if (window.confirm(message)) await clearHistory();
  }

  return (
    <section data-behavior-area="recommendation_settings" className="rounded-xl border border-slate-800 bg-slate-900/40 p-3" aria-labelledby="personalization-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="personalization-heading" className="text-xs font-semibold text-white">
            {en ? "Personalize my mixes" : "Cá nhân hóa danh sách nhạc"}
          </h2>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
            {loading ? (en ? "Loading settings…" : "Đang tải cài đặt…") : !available
              ? (en ? "Personalized suggestions aren’t set up yet · catalog mixes still work" : "Đề xuất cá nhân hóa chưa được thiết lập · danh sách nhạc vẫn hoạt động")
              : !collectionEnabled
              ? (en ? "Paused by the service · your choice is saved" : "Dịch vụ đang tạm dừng · lựa chọn của bạn vẫn được lưu")
              : enabled
              ? (en ? "Learning from your listening" : "Đang học từ thói quen nghe")
              : (en ? "Off until you choose to enable it" : "Chỉ bật khi bạn chọn")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={en ? "Personalized recommendations" : "Đề xuất cá nhân hóa"}
          disabled={loading || saving || !available}
          onClick={() => void setEnabled(!enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? "border-violet-300 bg-violet-600" : "border-slate-600 bg-slate-800"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${enabled ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {available && <p className="mt-2 text-[10px] leading-4 text-slate-400">
        {en
          ? "Uses visible song cards, section time, brief mouse pauses, clicks, filters, plays, skips and saves. No pointer positions or paths, typed searches or keystrokes."
          : "Dùng bài hát hiển thị, thời gian theo khu vực, dừng chuột ngắn, lượt nhấp, bộ lọc, bài nghe, bỏ qua và lưu. Không lưu vị trí/đường đi chuột, nội dung tìm kiếm hay phím gõ."}
      </p>}

      {available && (enabled || summary.events > 0) && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          {!enabled && summary.events > 0 && <p className="mb-1.5 text-[10px] leading-4 text-amber-200/80">{en ? "Personalization is off; saved activity is not used for suggestions." : "Đã tắt cá nhân hóa; hoạt động cũ không được dùng để đề xuất."}</p>}
          {enabled && !collectionEnabled && <p className="mb-1.5 text-[10px] leading-4 text-amber-200/80">{en ? "Collection is paused service-wide. Your setting stays on, but no new activity is recorded." : "Dịch vụ đã tạm dừng thu thập. Cài đặt của bạn vẫn bật nhưng không ghi nhận hoạt động mới."}</p>}
          <p className="text-[10px] text-slate-300">
            {summary.plays} {en ? "plays" : "lượt nghe"} · {summary.events} {en ? `signals in ${retentionDays} days` : `tín hiệu trong ${retentionDays} ngày`}
          </p>
          {summary.areas.length > 0 && (
            <ul className="mt-1.5 grid gap-1">
              {summary.areas.map((area) => (
                <li key={area.areaKey} className="grid gap-0.5 text-[10px] text-slate-400">
                  <span className="truncate text-slate-300">{labels[area.areaKey]}</span>
                  <span className="tabular-nums text-[9px]">
                    {area.views} {en ? "views" : "lượt xem"} · {area.clicks} {en ? "clicks" : "lượt nhấp"} · {formatDwell(area.dwellMs, language)} · {area.pointerPauses} {en ? "pauses" : "lần dừng"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleClear()}
            className="mt-2 text-[10px] font-medium text-violet-300 underline decoration-violet-500/40 underline-offset-2 hover:text-white disabled:opacity-50"
          >
            {en ? "Clear activity history" : "Xóa lịch sử hoạt động"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[10px] text-red-300">{error}</p>}
    </section>
  );
}
