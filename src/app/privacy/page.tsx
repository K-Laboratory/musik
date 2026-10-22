import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Favorite Songs",
  description:
    "Privacy policy and account data deletion instructions for Favorite Songs.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 sm:px-8">
      <Link
        href="/login"
        className="text-sm text-violet-300 underline decoration-violet-500/40 underline-offset-4 hover:text-violet-200"
      >
        Back to sign in
      </Link>

      <article className="mt-8 space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm leading-7 text-slate-300 sm:p-9">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Favorite Songs
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="mt-2 text-slate-500">Effective October 19, 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Information we collect
          </h2>
          <p>
            When you register or sign in with email, Supabase Authentication
            processes your email address and password credentials. When you
            sign in with Google, we receive the basic account information
            Google shares: your name, email address, provider identifier, and
            profile picture. We also store the songs, playlists, albums, and
            preferences you create in the app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            How we use information
          </h2>
          <p>
            We use this information only to authenticate you, maintain your
            library and playlists, personalize the interface, and operate the
            service. We do not sell personal information or publish content on
            your social accounts.
          </p>
          <p>
            Optional personalized music recommendations are off until you turn
            them on in Privacy &amp; Personalization. When enabled, we store section views,
            visible song cards, approximate section time, brief mouse pauses by section, clicks,
            selected mood and catalog filters, and song plays, skips,
            completions, and saves. This activity shapes your mixes and may
            contribute to aggregate service insights. Admin reports suppress
            groups with fewer than five contributors and do not show individual
            listening trails. Activity is kept for the configured period, up to
            90 days. We do not store pointer positions or paths,
            keystrokes, or search text. You can turn
            personalization off or clear its activity history from Privacy &amp;
            Personalization at any time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Storage and service providers
          </h2>
          <p>
            Authentication and application data are stored using Supabase.
            The application is hosted by Vercel. Google and YouTube process
            data under their own privacy policies when you use those services.
            Authentication cookies are used to keep you signed in.
          </p>
        </section>

        <section id="data-deletion" className="space-y-3 scroll-mt-8">
          <h2 className="text-lg font-semibold text-white">
            Account and data deletion
          </h2>
          <p>
            To request deletion of your Favorite Songs account and associated
            library, playlists, and albums, email{" "}
            <a
              href="mailto:klab2013@gmail.com?subject=Favorite%20Songs%20data%20deletion"
              className="text-violet-300 underline decoration-violet-500/40 underline-offset-4"
            >
              klab2013@gmail.com
            </a>{" "}
            with the subject &quot;Favorite Songs data deletion.&quot; Include
            the email address you used to sign in. We will remove the account
            and associated application data.
          </p>
          <p>
            You can also remove individual songs and playlists inside the app
            or revoke the app&apos;s access from your Google account settings
            if you used Google sign-in.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p>
            Privacy questions can be sent to{" "}
            <a
              href="mailto:klab2013@gmail.com"
              className="text-violet-300 underline decoration-violet-500/40 underline-offset-4"
            >
              klab2013@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-800 pt-8">
          <h2 className="text-lg font-semibold text-white">
            Chính sách quyền riêng tư
          </h2>
          <p>
            Khi đăng ký hoặc đăng nhập bằng email, Supabase Authentication xử
            lý địa chỉ email và thông tin xác thực mật khẩu. Khi đăng nhập bằng
            Google, chúng tôi nhận thông tin cơ bản như tên, email, mã định danh
            và ảnh đại diện. Chúng tôi lưu bài hát, danh sách phát và album bạn
            tạo để vận hành ứng dụng. Chúng tôi không bán dữ liệu cá nhân và
            không đăng nội dung thay bạn.
          </p>
          <p>
            Đề xuất nhạc cá nhân hóa được tắt cho đến khi bạn bật trong mục
            Quyền riêng tư &amp; Cá nhân hóa. Khi bật, chúng tôi lưu lượt xem khu vực, thời gian hiển
            thị gần đúng, thẻ bài hát hiển thị, lần dừng chuột ngắn theo khu vực,
            lượt nhấp, tâm trạng
            và bộ lọc đã chọn, bài hát được nghe, bỏ qua, nghe hết và lưu. Hoạt
            động này định hình danh sách nhạc và có thể đóng góp vào phân tích
            tổng hợp. Báo cáo quản trị ẩn nhóm dưới năm người đóng góp và không
            hiển thị lịch sử nghe cá nhân. Hoạt động được lưu theo thời hạn đã
            đặt, tối đa 90 ngày. Chúng tôi
            không lưu vị trí hoặc đường đi của chuột, phím gõ hay nội dung tìm
            kiếm. Bạn có thể tắt cá nhân hóa hoặc xóa lịch sử trong mục Quyền
            riêng tư &amp; Cá nhân hóa bất cứ lúc nào.
          </p>
          <p>
            Dữ liệu được lưu trên Supabase và ứng dụng được triển khai trên
            Vercel. Để xóa tài khoản và dữ liệu, hãy gửi email đến
            klab2013@gmail.com với tiêu đề &quot;Favorite Songs data
            deletion&quot; và địa chỉ email bạn dùng để đăng nhập.
          </p>
        </section>
      </article>
    </main>
  );
}
