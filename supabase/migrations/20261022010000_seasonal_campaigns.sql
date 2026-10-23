create table if not exists public.seasonal_campaigns (
  id text primary key,
  name_en text not null,
  name_vi text not null,
  headline_en text not null,
  headline_vi text not null,
  message_en text not null default '',
  message_vi text not null default '',
  emoji text not null default '✨',
  accent_color text not null default '#8b5cf6' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  start_month smallint,
  start_day smallint,
  end_month smallint,
  end_day smallint,
  enabled boolean not null default true,
  priority smallint not null default 100,
  updated_at timestamptz not null default now(),
  check ((start_month is null) = (start_day is null)),
  check ((end_month is null) = (end_day is null)),
  check (start_month is null or start_month between 1 and 12),
  check (end_month is null or end_month between 1 and 12),
  check (start_day is null or start_day between 1 and 31),
  check (end_day is null or end_day between 1 and 31)
);

create table if not exists public.seasonal_display_settings (
  id boolean primary key default true check (id),
  display_enabled boolean not null default true,
  display_mode text not null default 'automatic' check (display_mode in ('automatic', 'manual')),
  selected_campaign_id text references public.seasonal_campaigns (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.seasonal_campaigns
  (id, name_en, name_vi, headline_en, headline_vi, message_en, message_vi, emoji, accent_color, start_month, start_day, end_month, end_day, priority)
values
  ('spring', 'Spring', 'Mùa xuân', 'A fresh start to the season', 'Khởi đầu mùa mới', 'Find something bright and new to listen to.', 'Tìm một giai điệu tươi mới cho ngày hôm nay.', '🌸', '#ec4899', 2, 15, 4, 30, 30),
  ('summer', 'Summer', 'Mùa hè', 'Make room for a summer soundtrack', 'Bật nhạc cho mùa hè', 'Bring a little sunshine to your next playlist.', 'Thêm chút nắng vào danh sách nhạc tiếp theo.', '☀️', '#f59e0b', 5, 1, 8, 31, 40),
  ('autumn', 'Autumn', 'Mùa thu', 'Settle into autumn sounds', 'Lắng nghe mùa thu', 'A softer soundtrack for changing days.', 'Giai điệu dịu dàng cho những ngày giao mùa.', '🍂', '#c2410c', 9, 1, 11, 15, 50),
  ('winter', 'Winter', 'Mùa đông', 'Stay in with a winter mix', 'Ấm áp cùng nhạc mùa đông', 'Choose songs for slower, cozier evenings.', 'Chọn nhạc cho những buổi tối chậm rãi, ấm áp.', '❄️', '#38bdf8', 11, 16, 2, 14, 60),
  ('christmas', 'Christmas', 'Giáng Sinh', 'A little Christmas music', 'Giai điệu Giáng Sinh', 'Bring a festive favorite into your day.', 'Thêm một giai điệu lễ hội vào ngày của bạn.', '🎄', '#16a34a', 12, 15, 12, 26, 10),
  ('new-year', 'New Year', 'Năm mới', 'Start the year with a song', 'Năm mới, giai điệu mới', 'Pick a soundtrack for what comes next.', 'Chọn nhạc cho những điều sắp đến.', '🎆', '#6366f1', 12, 27, 1, 5, 20),
  ('lunar-new-year', 'Lunar New Year', 'Tết Nguyên Đán', 'Celebrate Tết with music', 'Đón Tết cùng âm nhạc', 'Find songs to share with family and friends.', 'Tìm bài hát để cùng chia sẻ với gia đình và bạn bè.', '🧧', '#dc2626', null, null, null, null, 5),
  ('valentines', 'Valentine’s Day', 'Ngày Valentine', 'A mix for someone special', 'Giai điệu dành cho người thương', 'Make room for a little more love in your playlist.', 'Thêm chút yêu thương vào danh sách nhạc.', '💗', '#e11d48', 2, 7, 2, 15, 15),
  ('halloween', 'Halloween', 'Halloween', 'Give your playlist a spooky twist', 'Thêm chút bí ẩn cho playlist', 'Find something unexpected to play tonight.', 'Tìm một giai điệu bất ngờ cho tối nay.', '🎃', '#f97316', 10, 20, 10, 31, 15)
on conflict (id) do nothing;

insert into public.seasonal_display_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.seasonal_campaigns enable row level security;
alter table public.seasonal_display_settings enable row level security;

drop policy if exists seasonal_campaigns_read_enabled on public.seasonal_campaigns;
create policy seasonal_campaigns_read_enabled
  on public.seasonal_campaigns for select to authenticated
  using (enabled or public.is_admin());
drop policy if exists seasonal_campaigns_admin_update on public.seasonal_campaigns;
create policy seasonal_campaigns_admin_update
  on public.seasonal_campaigns for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists seasonal_display_settings_authenticated_read on public.seasonal_display_settings;
create policy seasonal_display_settings_authenticated_read
  on public.seasonal_display_settings for select to authenticated
  using (true);
drop policy if exists seasonal_display_settings_admin_update on public.seasonal_display_settings;
create policy seasonal_display_settings_admin_update
  on public.seasonal_display_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.seasonal_campaigns, public.seasonal_display_settings from public, anon;
grant select on public.seasonal_campaigns, public.seasonal_display_settings to authenticated;
grant update on public.seasonal_campaigns, public.seasonal_display_settings to authenticated;
