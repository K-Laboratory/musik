"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/lib/disguise";

interface Settings { collection_enabled: boolean; retention_days: 30 | 60 | 90; updated_at: string }
interface AuditRow {
  id: number;
  previous_collection_enabled: boolean;
  collection_enabled: boolean;
  previous_retention_days: number;
  retention_days: number;
  changed_at: string;
}

export function BehaviorSettings() {
  const { language } = useLanguage();
  const en = language === "en";
  const [settings, setSettings] = useState<Settings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [retention, setRetention] = useState<30 | 60 | 90>(90);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/behavior/settings", { cache: "no-store" });
      if (!response.ok) throw new Error(en ? "Could not load behavior settings." : "Không tải được cài đặt hành vi.");
      const payload = await response.json() as { settings: Settings; audit: AuditRow[] };
      setSettings(payload.settings);
      setEnabled(payload.settings.collection_enabled);
      setRetention(payload.settings.retention_days);
      setAudit(payload.audit ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? "Could not load behavior settings." : "Không tải được cài đặt hành vi."));
    } finally {
      setLoading(false);
    }
  }, [en]);

  useEffect(() => { void load(); }, [load]);

  const dirty = Boolean(settings && (settings.collection_enabled !== enabled || settings.retention_days !== retention));

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/behavior/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collectionEnabled: enabled, retentionDays: retention }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? (en ? "Could not save settings." : "Không lưu được cài đặt."));
      }
      await load();
      setNotice(en ? "Settings saved and recorded in the admin audit." : "Đã lưu cài đặt và ghi lại trong nhật ký quản trị.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? "Could not save settings." : "Không lưu được cài đặt."));
    } finally {
      setSaving(false);
    }
  }

  const panelClass = "rounded-xl border border-slate-800 bg-slate-900/40 p-4";
  const dateFormat = new Intl.DateTimeFormat(en ? "en-US" : "vi-VN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">{en ? "Admin controls" : "Điều khiển quản trị"}</p>
          <h1 className="mt-1 text-xl font-semibold text-white">{en ? "Behavior collection settings" : "Cài đặt thu thập hành vi"}</h1>
          <p className="mt-1 text-xs leading-5 text-slate-400">{en ? "Service-wide controls for the opt-in personalization system." : "Điều khiển toàn dịch vụ cho hệ thống cá nhân hóa tự nguyện."}</p>
        </div>
        <Link href="/admin/behavior" className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-medium text-slate-200 hover:bg-slate-800">{en ? "← Insights" : "← Phân tích"}</Link>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{notice}</p>}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <section className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">{en ? "Collection controls" : "Điều khiển thu thập"}</h2>
              <p className="mt-1 max-w-xl text-[11px] leading-5 text-slate-400">{en ? "These controls never override a listener’s individual choice. Collection is recorded only when the person has enabled personalization and this service switch is on." : "Các điều khiển này không ghi đè lựa chọn cá nhân. Chỉ ghi nhận khi người nghe đã bật cá nhân hóa và công tắc dịch vụ đang mở."}</p>
            </div>
            {settings && <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${settings.collection_enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>
              {settings.collection_enabled ? (en ? "Active" : "Đang hoạt động") : (en ? "Paused" : "Đã tạm dừng")}
            </span>}
          </div>

          <div className="grid gap-4 pt-4 md:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <input type="checkbox" checked={enabled} disabled={loading || saving} onChange={(event) => setEnabled(event.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-500" />
              <span>
                <span className="block text-xs font-semibold text-slate-100">{en ? "Allow new activity signals" : "Cho phép tín hiệu hoạt động mới"}</span>
                <span className="mt-1 block text-[10px] leading-4 text-slate-500">{en ? "Pause immediately stops new signals for everyone. Existing user choices and stored activity remain unchanged." : "Tạm dừng sẽ ngừng tín hiệu mới trên toàn dịch vụ. Lựa chọn và hoạt động đã lưu của người dùng không đổi."}</span>
              </span>
            </label>

            <label className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <span className="block text-xs font-semibold text-slate-100">{en ? "Activity retention" : "Thời gian lưu hoạt động"}</span>
              <span className="mt-1 block text-[10px] leading-4 text-slate-500">{en ? "Older event and aggregate rows are removed by scheduled cleanup." : "Sự kiện và dữ liệu tổng hợp cũ hơn sẽ bị xóa khi dọn dẹp định kỳ."}</span>
              <select value={retention} disabled={loading || saving} onChange={(event) => setRetention(Number(event.target.value) as 30 | 60 | 90)} className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-violet-400">
                {[30, 60, 90].map((days) => <option key={days} value={days}>{days} {en ? "days" : "ngày"}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-slate-500">{settings ? (en ? `Last updated ${dateFormat.format(new Date(settings.updated_at))}` : `Cập nhật lần cuối ${dateFormat.format(new Date(settings.updated_at))}`) : (loading ? (en ? "Loading settings…" : "Đang tải cài đặt…") : "")}</p>
            <div className="flex gap-2">
              <button type="button" disabled={!dirty || saving || loading} onClick={() => { if (settings) { setEnabled(settings.collection_enabled); setRetention(settings.retention_days); } }} className="rounded-md border border-slate-700 px-3 py-2 text-[10px] font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40">{en ? "Discard" : "Hủy thay đổi"}</button>
              <button type="button" disabled={!dirty || saving || loading} onClick={() => void save()} className="rounded-md bg-violet-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">{saving ? (en ? "Saving…" : "Đang lưu…") : (en ? "Save settings" : "Lưu cài đặt")}</button>
            </div>
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="text-sm font-semibold text-white">{en ? "Data boundaries" : "Giới hạn dữ liệu"}</h2>
          <dl className="mt-3 divide-y divide-slate-800 text-[11px]">
            {[
              [en ? "User consent" : "Đồng ý của người dùng", en ? "Required per account" : "Bắt buộc theo từng tài khoản"],
              [en ? "Admin analytics" : "Phân tích quản trị", en ? "Aggregate only · minimum 5 contributors" : "Chỉ tổng hợp · tối thiểu 5 người đóng góp"],
              [en ? "Pointer data" : "Dữ liệu con trỏ", en ? "Pause duration only · no coordinates" : "Chỉ thời lượng dừng · không tọa độ"],
              [en ? "Search input" : "Nội dung tìm kiếm", en ? "Not stored" : "Không lưu"],
              [en ? "Account-level trails" : "Lịch sử theo tài khoản", en ? "Not visible to admins" : "Quản trị viên không xem được"],
            ].map(([key, value]) => <div key={key} className="flex items-start justify-between gap-3 py-2.5"><dt className="text-slate-500">{key}</dt><dd className="max-w-[58%] text-right text-slate-200">{value}</dd></div>)}
          </dl>
        </section>
      </div>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold text-white">{en ? "Admin change log" : "Nhật ký thay đổi quản trị"}</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">{en ? "Service-level changes are recorded for accountability." : "Các thay đổi toàn dịch vụ được ghi lại để kiểm tra."}</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="text-[10px] font-medium text-violet-300 hover:text-white disabled:opacity-50">{en ? "Refresh log" : "Làm mới nhật ký"}</button>
        </div>
        {audit.length ? <div className="mt-3 divide-y divide-slate-800/70">
          {audit.map((row) => <div key={row.id} className="grid gap-1 py-2 text-[10px] sm:grid-cols-[170px_1fr] sm:items-center">
            <time dateTime={row.changed_at} className="tabular-nums text-slate-500">{dateFormat.format(new Date(row.changed_at))}</time>
            <p className="text-slate-300">{en ? "Collection" : "Thu thập"}: <span className={row.collection_enabled ? "text-emerald-300" : "text-amber-200"}>{row.collection_enabled ? (en ? "active" : "đang bật") : (en ? "paused" : "tạm dừng")}</span> · {en ? "retention" : "lưu trữ"}: {row.previous_retention_days} → {row.retention_days} {en ? "days" : "ngày"}</p>
          </div>)}
        </div> : <p className="py-6 text-center text-[11px] text-slate-500">{loading ? (en ? "Loading log…" : "Đang tải nhật ký…") : (en ? "No administrative changes recorded yet." : "Chưa có thay đổi quản trị nào được ghi nhận.")}</p>}
      </section>
    </div>
  );
}
