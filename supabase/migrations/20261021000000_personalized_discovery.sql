-- First-party, user-controlled signals for personalized music discovery.

create table if not exists public.recommendation_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  personalization_enabled boolean not null default false,
  enabled_at timestamptz,
  last_cleanup_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_behavior_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null,
  event_type text not null check (event_type in (
    'area_view', 'item_view', 'pointer_pause', 'click', 'filter_select', 'play', 'pause', 'skip', 'complete', 'save'
  )),
  area_key text not null check (area_key in (
    'app_navigation', 'dashboard_discover', 'dashboard_search', 'dashboard_mix', 'library',
    'playlists', 'browse_generations', 'browse_emotions', 'collection_builder',
    'playlist_detail', 'saved_collection', 'player_controls', 'recommendation_settings'
  )),
  item_type text check (item_type in ('song', 'generation', 'emotion', 'mood', 'playlist')),
  item_id text check (item_id is null or char_length(item_id) between 1 and 100),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 300000),
  is_click boolean not null default false,
  created_at timestamptz not null default now()
);

-- Compact daily rollups keep the user's area summary fast as event volume grows.
create table if not exists public.user_behavior_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  area_key text not null check (area_key in (
    'app_navigation', 'dashboard_discover', 'dashboard_search', 'dashboard_mix', 'library',
    'playlists', 'browse_generations', 'browse_emotions', 'collection_builder',
    'playlist_detail', 'saved_collection', 'player_controls', 'recommendation_settings'
  )),
  event_count bigint not null default 0,
  click_count bigint not null default 0,
  play_count bigint not null default 0,
  view_count bigint not null default 0,
  dwell_ms bigint not null default 0,
  pointer_pause_count bigint not null default 0,
  primary key (user_id, activity_date, area_key)
);

create index if not exists user_behavior_events_user_created_idx
  on public.user_behavior_events (user_id, created_at desc);
create index if not exists user_behavior_events_user_signal_idx
  on public.user_behavior_events (user_id, event_type, created_at desc);
create or replace function public.rollup_behavior_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $rollup$
begin
  insert into public.user_behavior_daily (
    user_id, activity_date, area_key, event_count, click_count, play_count,
    view_count, dwell_ms, pointer_pause_count
  ) values (
    new.user_id,
    (new.created_at at time zone 'utc')::date,
    new.area_key,
    1,
    case when new.is_click then 1 else 0 end,
    case when new.event_type = 'play' then 1 else 0 end,
    case when new.event_type = 'area_view' then 1 else 0 end,
    case when new.event_type = 'area_view' then coalesce(new.duration_ms, 0) else 0 end,
    case when new.event_type = 'pointer_pause' then 1 else 0 end
  )
  on conflict (user_id, activity_date, area_key) do update set
    event_count = public.user_behavior_daily.event_count + 1,
    click_count = public.user_behavior_daily.click_count + excluded.click_count,
    play_count = public.user_behavior_daily.play_count + excluded.play_count,
    view_count = public.user_behavior_daily.view_count + excluded.view_count,
    dwell_ms = public.user_behavior_daily.dwell_ms + excluded.dwell_ms,
    pointer_pause_count = public.user_behavior_daily.pointer_pause_count + excluded.pointer_pause_count;
  return new;
end;
$rollup$;

drop trigger if exists user_behavior_events_rollup on public.user_behavior_events;
create trigger user_behavior_events_rollup
  after insert on public.user_behavior_events
  for each row execute function public.rollup_behavior_event();

create or replace function public.prune_recommendation_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $prune$
begin
  delete from public.user_behavior_events
  where created_at < now() - interval '90 days';
  delete from public.user_behavior_daily
  where activity_date < (current_date - 90);
end;
$prune$;
revoke all on function public.prune_recommendation_activity() from public, anon, authenticated;

alter table public.recommendation_preferences enable row level security;
alter table public.user_behavior_events enable row level security;
alter table public.user_behavior_daily enable row level security;

drop policy if exists recommendation_preferences_select_own on public.recommendation_preferences;
create policy recommendation_preferences_select_own
  on public.recommendation_preferences for select
  using ((select auth.uid()) = user_id);
drop policy if exists recommendation_preferences_insert_own on public.recommendation_preferences;
create policy recommendation_preferences_insert_own
  on public.recommendation_preferences for insert
  with check ((select auth.uid()) = user_id);
drop policy if exists recommendation_preferences_update_own on public.recommendation_preferences;
create policy recommendation_preferences_update_own
  on public.recommendation_preferences for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists user_behavior_events_select_own on public.user_behavior_events;
create policy user_behavior_events_select_own
  on public.user_behavior_events for select
  using ((select auth.uid()) = user_id);
drop policy if exists user_behavior_events_insert_own on public.user_behavior_events;
create policy user_behavior_events_insert_own
  on public.user_behavior_events for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.recommendation_preferences p
      where p.user_id = (select auth.uid())
        and p.personalization_enabled
    )
  );
drop policy if exists user_behavior_events_delete_own on public.user_behavior_events;
create policy user_behavior_events_delete_own
  on public.user_behavior_events for delete
  using ((select auth.uid()) = user_id);

drop policy if exists user_behavior_daily_select_own on public.user_behavior_daily;
create policy user_behavior_daily_select_own
  on public.user_behavior_daily for select
  using ((select auth.uid()) = user_id);
drop policy if exists user_behavior_daily_delete_own on public.user_behavior_daily;
create policy user_behavior_daily_delete_own
  on public.user_behavior_daily for delete
  using ((select auth.uid()) = user_id);

grant select, insert, update on public.recommendation_preferences to authenticated;
grant select, insert, delete on public.user_behavior_events to authenticated;
grant usage, select on sequence public.user_behavior_events_id_seq to authenticated;
grant select, delete on public.user_behavior_daily to authenticated;

-- If Supabase pg_cron is available, prune inactive users' event history daily.
do $retention$
declare
  existing_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for existing_job_id in
      select jobid from cron.job where jobname = 'favorite-songs-behavior-retention'
    loop
      perform cron.unschedule(existing_job_id);
    end loop;
    perform cron.schedule(
      'favorite-songs-behavior-retention',
      '17 3 * * *',
      'select public.prune_recommendation_activity()'
    );
  end if;
exception when undefined_table or undefined_function then
  raise notice 'pg_cron unavailable; retention cleanup will run when users revisit the app.';
end;
$retention$;
