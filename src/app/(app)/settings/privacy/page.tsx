"use client";

import Link from "next/link";

import { PersonalizationPanel } from "@/components/PersonalizationPanel";
import { useLanguage } from "@/lib/disguise";

export default function PrivacySettingsPage() {
  const { language } = useLanguage();
  const en = language === "en";

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-violet-300">
            {en ? "Your account" : "Tài khoản của bạn"}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
            {en ? "Privacy & personalization" : "Quyền riêng tư & cá nhân hóa"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            {en
              ? "Choose whether your listening activity can shape your mixes. You can change this choice or erase your activity at any time."
              : "Chọn có cho phép hoạt động nghe định hình danh sách nhạc hay không. Bạn có thể đổi lựa chọn hoặc xóa hoạt động bất cứ lúc nào."}
          </p>
        </div>
        <Link href="/privacy" className="text-xs font-medium text-violet-300 underline underline-offset-4 hover:text-white">
          {en ? "Read the privacy policy" : "Đọc chính sách quyền riêng tư"}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
        <PersonalizationPanel />
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-white">
            {en ? "What this setting controls" : "Cài đặt này kiểm soát điều gì"}
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
            <li>{en ? "Only visible music-app sections, song cards, and listening actions are counted." : "Chỉ ghi nhận khu vực nhạc hiển thị, thẻ bài hát và thao tác nghe."}</li>
            <li>{en ? "Search text, keystrokes, pointer coordinates, and pointer paths are not stored." : "Không lưu nội dung tìm kiếm, phím gõ, tọa độ hay đường đi của chuột."}</li>
            <li>{en ? "When enabled, activity shapes your mixes and may contribute to aggregate service insights. Admin reports hide groups with fewer than five contributors and never show individual listening trails." : "Khi bật, hoạt động định hình danh sách nhạc và có thể đóng góp vào phân tích tổng hợp. Báo cáo quản trị ẩn nhóm dưới năm người và không hiển thị lịch sử nghe cá nhân."}</li>
            <li>{en ? "Activity is kept for the configured retention period, up to 90 days. You can erase it at any time." : "Hoạt động được lưu theo thời hạn đã đặt, tối đa 90 ngày. Bạn có thể xóa bất cứ lúc nào."}</li>
            <li>{en ? "Your activity history is separate from your saved songs and playlists." : "Lịch sử hoạt động được tách biệt với bài hát và danh sách phát đã lưu."}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
