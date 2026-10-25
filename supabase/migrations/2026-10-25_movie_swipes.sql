-- Мэтч фильмов. Для уже созданной базы: выполнить в Supabase → SQL Editor.
-- (В schema.sql это уже есть — для новых установок ничего делать не нужно.)

create table public.movie_swipes (
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  tmdb_id    int not null,
  media_type text not null check (media_type in ('movie','tv')),
  liked      boolean not null,
  item       jsonb not null,  -- снимок карточки TMDB: лайкнутое показываем партнёру без лишних запросов
  created_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type)
);

alter table public.movie_swipes enable row level security;

create policy "swipes: read couple" on public.movie_swipes for select using (couple_id = public.my_couple_id());
create policy "swipes: write own" on public.movie_swipes for insert
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "swipes: update own" on public.movie_swipes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "swipes: delete own" on public.movie_swipes for delete using (user_id = auth.uid());

alter publication supabase_realtime add table public.movie_swipes;
