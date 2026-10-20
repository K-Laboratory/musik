-- Link saved albums to the Dashboard playlist system and backfill albums
-- created before this synchronization existed.

alter table public.albums
  add column if not exists playlist_id uuid
  references public.playlists (id) on delete set null;

create unique index if not exists albums_playlist_id_key
  on public.albums (playlist_id)
  where playlist_id is not null;

do $$
declare
  album_row record;
  playlist_uuid uuid;
begin
  for album_row in
    select a.id, a.user_id, a.title
    from public.albums a
    where a.playlist_id is null
      and exists (
        select 1
        from public.album_songs s
        where s.album_id = a.id
      )
    order by a.created_at
  loop
    playlist_uuid := null;
    begin
      insert into public.playlists (user_id, name)
      values (album_row.user_id, album_row.title)
      returning id into playlist_uuid;

      insert into public.songs (
        user_id,
        youtube_video_id,
        title,
        channel_title,
        thumbnail_url
      )
      select distinct on (c.youtube_video_id)
        album_row.user_id,
        c.youtube_video_id,
        c.title,
        coalesce(c.youtube_channel, c.artist),
        'https://i.ytimg.com/vi/' || c.youtube_video_id || '/hqdefault.jpg'
      from public.album_songs album_track
      join public.catalog_songs c on c.id = album_track.song_id
      where album_track.album_id = album_row.id
        and c.youtube_video_id is not null
      order by c.youtube_video_id, album_track.position
      on conflict (user_id, youtube_video_id) do update
      set
        title = excluded.title,
        channel_title = excluded.channel_title,
        thumbnail_url = excluded.thumbnail_url;

      insert into public.playlist_songs (playlist_id, song_id, position)
      select playlist_uuid, library_song.id, album_track.position
      from public.album_songs album_track
      join public.catalog_songs c on c.id = album_track.song_id
      join public.songs library_song
        on library_song.user_id = album_row.user_id
       and library_song.youtube_video_id = c.youtube_video_id
      where album_track.album_id = album_row.id
      on conflict (playlist_id, song_id) do nothing;

      update public.albums
      set playlist_id = playlist_uuid
      where id = album_row.id;
    exception when others then
      if playlist_uuid is not null then
        delete from public.playlists where id = playlist_uuid;
      end if;
      raise warning
        'Could not create a playlist for album %: %',
        album_row.id,
        sqlerrm;
    end;
  end loop;
end;
$$;
