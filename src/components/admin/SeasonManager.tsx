"use client";

import { useCallback, useEffect, useState } from "react";

import type { Database } from "@/lib/database.types";
import { useLanguage } from "@/lib/disguise";

type Campaign = Database["public"]["Tables"]["seasonal_campaigns"]["Row"];
type Settings = Database["public"]["Tables"]["seasonal_display_settings"]["Row"];
type EditableCampaign = Omit<Campaign, "updated_at">;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function editCampaign(campaign: Campaign): EditableCampaign {
  const editable = { ...campaign } as Partial<Campaign>;
  delete editable.updated_at;
  return editable as EditableCampaign;
}

export function SeasonManager() {
  const { language } = useLanguage();
  const en = language === "en";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditableCampaign>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [displayEnabled, setDisplayEnabled] = useState(true);
  const [displayMode, setDisplayMode] = useState<"automatic" | "manual">("automatic");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/seasons", { cache: "no-store" });
      const payload = await response.json() as { campaigns?: Campaign[]; settings?: Settings; error?: string };
      if (!response.ok || !payload.settings) throw new Error(payload.error ?? (en ? "Could not load seasonal settings." : "Không tải được cài đặt mùa lễ hội."));
      const rows = payload.campaigns ?? [];
      setCampaigns(rows);
      setDrafts(Object.fromEntries(rows.map((row) => [row.id, editCampaign(row)])));
      setSettings(payload.settings);
      setDisplayEnabled(payload.settings.display_enabled);
      setDisplayMode(payload.settings.display_mode === "manual" ? "manual" : "automatic");
      setSelectedCampaignId(payload.settings.selected_campaign_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? "Could not load seasonal settings." : "Không tải được cài đặt mùa lễ hội."));
    } finally {
      setLoading(false);
    }
  }, [en]);

  useEffect(() => { void load(); }, [load]);

  async function send(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/seasons", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? (en ? "Could not save changes." : "Không lưu được thay đổi."));
  }

  async function saveCampaign(id: string) {
    const campaign = drafts[id];
    if (!campaign || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await send({ kind: "campaign", ...campaign });
      await load();
      setNotice(en ? "Season saved." : "Đã lưu mùa lễ hội.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? "Could not save season." : "Không lưu được mùa lễ hội."));
    } finally { setSaving(false); }
  }

  async function saveSettings() {
    if (!settings || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await send({ kind: "settings", displayEnabled, displayMode, selectedCampaignId });
      await load();
      setNotice(en ? "Display settings saved." : "Đã lưu cài đặt hiển thị.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? "Could not save display settings." : "Không lưu được cài đặt hiển thị."));
    } finally { setSaving(false); }
  }

  const update = <K extends keyof EditableCampaign>(id: string, key: K, value: EditableCampaign[K]) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id]!, [key]: value } }));
  };
  const dirtyCampaign = (id: string) => JSON.stringify(drafts[id]) !== JSON.stringify(campaigns.find((campaign) => campaign.id === id) && editCampaign(campaigns.find((campaign) => campaign.id === id)!));
  const panel = "rounded-xl border border-slate-800 bg-slate-900/50 p-4";
  const label = "mb-1 block text-[10px] font-medium text-slate-400";
  const field = "w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-violet-400";

  return <div className="space-y-4">
    <header>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">{en ? "Seasonal experience" : "Trải nghiệm theo mùa"}</p>
      <h1 className="mt-1 text-xl font-semibold text-white">{en ? "Seasons & celebrations" : "Mùa trong năm & lễ hội"}</h1>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">{en ? "Schedule seasonal messages and accent colors for the app. Automatic mode follows each date window in Vietnam time; choose a campaign manually to feature it outside its scheduled dates." : "Lên lịch lời chào và màu sắc cho ứng dụng theo mùa. Chế độ tự động dùng múi giờ Việt Nam; có thể chọn thủ công để hiển thị ngoài lịch đã đặt."}</p>
    </header>

    {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{notice}</p>}

    <section className={panel}>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end">
        <label className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={displayEnabled} disabled={loading || saving} onChange={(event) => setDisplayEnabled(event.target.checked)} className="accent-violet-500" />{en ? "Show seasonal experience" : "Hiển thị giao diện theo mùa"}</label>
        <label><span className={label}>{en ? "Schedule mode" : "Chế độ lịch"}</span><select className={field} value={displayMode} disabled={loading || saving} onChange={(event) => setDisplayMode(event.target.value as "automatic" | "manual")}><option value="automatic">{en ? "Automatic by date" : "Tự động theo ngày"}</option><option value="manual">{en ? "Choose a campaign" : "Chọn chiến dịch"}</option></select></label>
        <label><span className={label}>{en ? "Featured campaign" : "Chiến dịch nổi bật"}</span><select className={field} value={selectedCampaignId ?? ""} disabled={loading || saving || displayMode !== "manual"} onChange={(event) => setSelectedCampaignId(event.target.value || null)}><option value="">{en ? "Select a campaign" : "Chọn chiến dịch"}</option>{campaigns.filter((campaign) => drafts[campaign.id]?.enabled).map((campaign) => <option key={campaign.id} value={campaign.id}>{en ? campaign.name_en : campaign.name_vi}</option>)}</select></label>
        <button type="button" onClick={() => void saveSettings()} disabled={loading || saving || !settings} className="rounded-md bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50">{saving ? (en ? "Saving…" : "Đang lưu…") : (en ? "Save display" : "Lưu hiển thị")}</button>
      </div>
      <p className="mt-3 text-[10px] text-slate-500">{en ? "Manual selection is useful for Lunar New Year, whose date changes each year. Disabled campaigns never appear." : "Nên chọn thủ công cho Tết Nguyên Đán vì ngày thay đổi mỗi năm. Chiến dịch đã tắt sẽ không xuất hiện."}</p>
    </section>

    <div className="grid gap-3 xl:grid-cols-2">
      {campaigns.map((campaign) => {
        const draft = drafts[campaign.id];
        if (!draft) return null;
        const editText = (key: "name_en" | "name_vi" | "headline_en" | "headline_vi" | "message_en" | "message_vi", value: string) => update(campaign.id, key, value);
        const datePicker = (which: "start" | "end", month: number | null, day: number | null) => <div className="grid grid-cols-2 gap-2">
          <select aria-label={`${which} month ${campaign.id}`} className={field} value={month ?? ""} onChange={(event) => update(campaign.id, `${which}_month`, event.target.value ? Number(event.target.value) : null)}><option value="">{en ? "No date" : "Không đặt"}</option>{MONTHS.map((monthName, index) => <option key={monthName} value={index + 1}>{en ? monthName : `Tháng ${index + 1}`}</option>)}</select>
          <select aria-label={`${which} day ${campaign.id}`} className={field} value={day ?? ""} disabled={month === null} onChange={(event) => update(campaign.id, `${which}_day`, event.target.value ? Number(event.target.value) : null)}><option value="">—</option>{Array.from({ length: month ? new Date(Date.UTC(2024, month, 0)).getUTCDate() : 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select>
        </div>;
        return <section key={campaign.id} className={panel} style={{ borderTopColor: draft.accent_color, borderTopWidth: 2 }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2"><span className="text-xl" aria-hidden="true">{draft.emoji}</span><div><h2 className="text-sm font-semibold text-white">{en ? campaign.name_en : campaign.name_vi}</h2><p className="text-[10px] text-slate-500">{campaign.id}</p></div></div>
            <label className="flex shrink-0 items-center gap-2 text-[10px] text-slate-300"><input type="checkbox" checked={draft.enabled} onChange={(event) => update(campaign.id, "enabled", event.target.checked)} className="accent-violet-500" />{en ? "Enabled" : "Bật"}</label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label><span className={label}>Name · English</span><input className={field} value={draft.name_en} onChange={(event) => editText("name_en", event.target.value)} /></label>
            <label><span className={label}>Tên · Tiếng Việt</span><input className={field} value={draft.name_vi} onChange={(event) => editText("name_vi", event.target.value)} /></label>
            <label><span className={label}>{en ? "Headline · English" : "Tiêu đề · English"}</span><input className={field} value={draft.headline_en} onChange={(event) => editText("headline_en", event.target.value)} /></label>
            <label><span className={label}>Tiêu đề · Tiếng Việt</span><input className={field} value={draft.headline_vi} onChange={(event) => editText("headline_vi", event.target.value)} /></label>
            <label><span className={label}>{en ? "Message · English" : "Thông điệp · English"}</span><textarea rows={2} className={field} value={draft.message_en} onChange={(event) => editText("message_en", event.target.value)} /></label>
            <label><span className={label}>Thông điệp · Tiếng Việt</span><textarea rows={2} className={field} value={draft.message_vi} onChange={(event) => editText("message_vi", event.target.value)} /></label>
            <label><span className={label}>{en ? "Start · month and day" : "Bắt đầu · tháng và ngày"}</span>{datePicker("start", draft.start_month, draft.start_day)}</label>
            <label><span className={label}>{en ? "End · month and day" : "Kết thúc · tháng và ngày"}</span>{datePicker("end", draft.end_month, draft.end_day)}</label>
            <label><span className={label}>{en ? "Accent color" : "Màu nhấn"}</span><div className="flex gap-2"><input type="color" value={draft.accent_color} onChange={(event) => update(campaign.id, "accent_color", event.target.value)} className="h-9 w-12 rounded border border-slate-700 bg-slate-950 p-1" /><input className={field} value={draft.accent_color} onChange={(event) => update(campaign.id, "accent_color", event.target.value)} /></div></label>
            <label><span className={label}>{en ? "Emoji" : "Biểu tượng"}</span><input className={field} value={draft.emoji} onChange={(event) => update(campaign.id, "emoji", event.target.value)} maxLength={8} /></label>
            <label><span className={label}>{en ? "Overlap priority (lower wins)" : "Ưu tiên khi trùng lịch (số nhỏ hơn được chọn)"}</span><input type="number" min={1} max={999} className={field} value={draft.priority} onChange={(event) => update(campaign.id, "priority", Number(event.target.value))} /></label>
          </div>
          <div className="mt-3 flex justify-end"><button type="button" disabled={saving || loading || !dirtyCampaign(campaign.id)} onClick={() => void saveCampaign(campaign.id)} className="rounded-md border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40">{en ? "Save campaign" : "Lưu chiến dịch"}</button></div>
        </section>;
      })}
    </div>
  </div>;
}
