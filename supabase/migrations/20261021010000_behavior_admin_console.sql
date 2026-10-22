-- Admin controls and privacy-preserving aggregate analytics for behavior signals.
-- Individual event rows remain visible only to their owner.

create table if not exists public.recommendation_admin_settings (
  id boolean primary key default true check (id),
  collection_enabled boolean not null default true,
  retention_days smallint not null default 90 check (retention_days in (30, 60, 90)),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.recommendation_admin_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.recommendation_admin_settings enable row level security;
drop policy if exists recommendation_admin_settings_admin_select on public.recommendation_admin_settings;
create policy recommendation_admin_settings_admin_select
  on public.recommendation_admin_settings for select to authenticated
  using (public.is_admin());
drop policy if exists recommendation_admin_settings_admin_update on public.recommendation_admin_settings;
create policy recommendation_admin_settings_admin_update
  on public.recommendation_admin_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.recommendation_admin_settings from public, anon;
grant select, update on public.recommendation_admin_settings to authenticated;

create table if not exists public.recommendation_admin_settings_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles (id) on delete set null,
  previous_collection_enabled boolean not null,
  collection_enabled boolean not null,
  previous_retention_days smallint not null,
  retention_days smallint not null,
  changed_at timestamptz not null default now()
);

create index if not exists recommendation_admin_settings_audit_changed_idx
  on public.recommendation_admin_settings_audit (changed_at desc);

alter table public.recommendation_admin_settings_audit enable row level security;
drop policy if exists recommendation_admin_settings_audit_admin_select on public.recommendation_admin_settings_audit;
create policy recommendation_admin_settings_audit_admin_select
  on public.recommendation_admin_settings_audit for select to authenticated
  using (public.is_admin());
revoke all on public.recommendation_admin_settings_audit from public, anon;
grant select on public.recommendation_admin_settings_audit to authenticated;

create or replace function public.audit_recommendation_admin_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $audit$
begin
  if old.collection_enabled is distinct from new.collection_enabled
    or old.retention_days is distinct from new.retention_days then
    insert into public.recommendation_admin_settings_audit (
      actor_user_id,
      previous_collection_enabled,
      collection_enabled,
      previous_retention_days,
      retention_days
    ) values (
      auth.uid(),
      old.collection_enabled,
      new.collection_enabled,
      old.retention_days,
      new.retention_days
    );
  end if;
  return new;
end;
$audit$;
revoke all on function public.audit_recommendation_admin_settings() from public, anon, authenticated;

drop trigger if exists recommendation_admin_settings_audit_update on public.recommendation_admin_settings;
create trigger recommendation_admin_settings_audit_update
  after update on public.recommendation_admin_settings
  for each row execute function public.audit_recommendation_admin_settings();

create or replace function public.get_recommendation_collection_policy()
returns table (collection_enabled boolean, retention_days smallint)
language sql
stable
security definer
set search_path = ''
as $policy$
  select
    coalesce((select s.collection_enabled from public.recommendation_admin_settings s where s.id), false),
    coalesce((select s.retention_days from public.recommendation_admin_settings s where s.id), 90::smallint)
$policy$;
revoke all on function public.get_recommendation_collection_policy() from public, anon;
grant execute on function public.get_recommendation_collection_policy() to authenticated;

create or replace function public.admin_behavior_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $analytics$
declare
  v_days integer := greatest(7, least(coalesce(p_days, 30), 90));
  v_start date;
  v_active_users bigint := 0;
  v_opted_in_users bigint := 0;
  v_event_count bigint := 0;
  v_plays bigint := 0;
  v_collection_enabled boolean := false;
  v_retention_days smallint := 90;
begin
  if not public.is_admin() then
    raise exception using message = 'Forbidden', errcode = '42501';
  end if;

  v_start := current_date - (v_days - 1);

  select s.collection_enabled, s.retention_days
  into v_collection_enabled, v_retention_days
  from public.recommendation_admin_settings s
  where s.id;

  select count(*) into v_opted_in_users
  from public.recommendation_preferences p
  where p.personalization_enabled;

  select count(distinct e.user_id) into v_active_users
  from public.user_behavior_events e
  join public.recommendation_preferences p on p.user_id = e.user_id
  where p.personalization_enabled
    and e.created_at >= (v_start::timestamp at time zone 'UTC');

  select coalesce(sum(d.event_count), 0), coalesce(sum(d.play_count), 0)
  into v_event_count, v_plays
  from public.user_behavior_daily d
  join public.recommendation_preferences p on p.user_id = d.user_id
  where p.personalization_enabled
    and d.activity_date >= v_start;

  return jsonb_build_object(
    'windowDays', v_days,
    'retentionDays', coalesce(v_retention_days, 90),
    'collectionEnabled', coalesce(v_collection_enabled, false),
    'privacyThreshold', 5,
    'privacySuppressed', v_active_users < 5,
    'activeUsers', case when v_active_users >= 5 then v_active_users else null end,
    'optedInUsers', case when v_opted_in_users >= 5 then v_opted_in_users else null end,
    'eventCount', case when v_active_users >= 5 then v_event_count else null end,
    'plays', case when v_active_users >= 5 then v_plays else null end,
    'daily', case when v_active_users >= 5 then coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', d.activity_date,
        'activeUsers', d.active_users,
        'events', d.events,
        'plays', d.plays
      ) order by d.activity_date)
      from (
        select
          b.activity_date,
          count(distinct b.user_id)::integer as active_users,
          sum(b.event_count)::bigint as events,
          sum(b.play_count)::bigint as plays
        from public.user_behavior_daily b
        join public.recommendation_preferences p on p.user_id = b.user_id
        where p.personalization_enabled and b.activity_date >= v_start
        group by b.activity_date
        having count(distinct b.user_id) >= 5
      ) d
    ), '[]'::jsonb) else '[]'::jsonb end,
    'areas', case when v_active_users >= 5 then coalesce((
      select jsonb_agg(jsonb_build_object(
        'areaKey', a.area_key,
        'activeUsers', a.active_users,
        'events', a.events,
        'views', a.views,
        'clicks', a.clicks,
        'plays', a.plays,
        'dwellMs', a.dwell_ms,
        'pointerPauses', a.pointer_pauses
      ) order by a.events desc)
      from (
        select
          b.area_key,
          count(distinct b.user_id)::integer as active_users,
          sum(b.event_count)::bigint as events,
          sum(b.view_count)::bigint as views,
          sum(b.click_count)::bigint as clicks,
          sum(b.play_count)::bigint as plays,
          sum(b.dwell_ms)::bigint as dwell_ms,
          sum(b.pointer_pause_count)::bigint as pointer_pauses
        from public.user_behavior_daily b
        join public.recommendation_preferences p on p.user_id = b.user_id
        where p.personalization_enabled and b.activity_date >= v_start
        group by b.area_key
        having count(distinct b.user_id) >= 5
      ) a
    ), '[]'::jsonb) else '[]'::jsonb end,
    'eventTypes', case when v_active_users >= 5 then coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventType', e.event_type,
        'activeUsers', e.active_users,
        'events', e.events
      ) order by e.events desc)
      from (
        select
          b.event_type,
          count(distinct b.user_id)::integer as active_users,
          count(*)::bigint as events
        from public.user_behavior_events b
        join public.recommendation_preferences p on p.user_id = b.user_id
        where p.personalization_enabled
          and b.created_at >= (v_start::timestamp at time zone 'UTC')
        group by b.event_type
        having count(distinct b.user_id) >= 5
      ) e
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$analytics$;
revoke all on function public.admin_behavior_analytics(integer) from public, anon;
grant execute on function public.admin_behavior_analytics(integer) to authenticated;

create or replace function public.prune_recommendation_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $prune$
declare
  v_retention_days integer := 90;
begin
  select s.retention_days into v_retention_days
  from public.recommendation_admin_settings s
  where s.id;
  v_retention_days := coalesce(v_retention_days, 90);

  delete from public.user_behavior_events
  where created_at < now() - make_interval(days => v_retention_days);
  delete from public.user_behavior_daily
  where activity_date < current_date - v_retention_days;
end;
$prune$;
revoke all on function public.prune_recommendation_activity() from public, anon, authenticated;

-- Enforce the global pause at the database boundary as well as in the API.
-- This closes the race between an API policy check and event insertion, and
-- blocks direct authenticated inserts while collection is paused.
drop policy if exists user_behavior_events_insert_own on public.user_behavior_events;
create policy user_behavior_events_insert_own
  on public.user_behavior_events for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.recommendation_preferences p
      where p.user_id = (select auth.uid())
        and p.personalization_enabled
    )
    and exists (
      select 1 from public.get_recommendation_collection_policy() policy
      where policy.collection_enabled
    )
  );
