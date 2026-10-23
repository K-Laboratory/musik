-- Ensure catalog song generation assignments reference the generation taxonomy.
do $$
declare
  generation_column smallint;
begin
  select attnum into generation_column
  from pg_attribute
  where attrelid = 'public.catalog_songs'::regclass
    and attname = 'generation_id'
    and not attisdropped;

  if generation_column is null then
    raise exception 'public.catalog_songs.generation_id does not exist';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.catalog_songs'::regclass
      and constraint_row.confrelid = 'public.generations'::regclass
      and constraint_row.contype = 'f'
      and constraint_row.conkey = array[generation_column]::smallint[]
  ) then
    alter table public.catalog_songs
      add constraint catalog_songs_generation_id_fkey
      foreign key (generation_id)
      references public.generations (id)
      on delete set null;
  end if;
end
$$;
