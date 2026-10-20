-- =====================================================================
-- Duo — схема Supabase. Выполнить один раз: Supabase → SQL Editor → Run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Пары и профили ----------
create table public.couples (
  id           uuid primary key default gen_random_uuid(),
  invite_code  text unique not null default upper(substr(md5(random()::text), 1, 6)),
  together_since date,
  created_at   timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'Я',
  avatar_url  text,
  couple_id   uuid references public.couples(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- couple_id текущего пользователя (security definer — чтобы не зациклить RLS)
create or replace function public.my_couple_id()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

-- Автосоздание профиля при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Создать пару → вернуть код приглашения
create or replace function public.create_couple()
returns text language plpgsql security definer set search_path = public as $$
declare c public.couples;
begin
  if (select couple_id from profiles where id = auth.uid()) is not null then
    return (select invite_code from couples where id = my_couple_id());
  end if;
  insert into couples default values returning * into c;
  update profiles set couple_id = c.id where id = auth.uid();
  return c.invite_code;
end $$;

-- Присоединиться к паре по коду (максимум 2 человека)
create or replace function public.join_couple(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from couples where invite_code = upper(trim(code));
  if cid is null then raise exception 'Код не найден'; end if;
  if (select count(*) from profiles where couple_id = cid) >= 2 then
    raise exception 'В этой паре уже двое';
  end if;
  update profiles set couple_id = cid where id = auth.uid();
  return cid;
end $$;

-- ---------- Дом: дела, напоминания, покупки, рецепты ----------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  title         text not null,
  place         text,
  assignee      uuid references public.profiles(id) on delete set null,   -- null = общее
  kind          text not null default 'once' check (kind in ('once','weekly','monthly')),
  due_date      date,              -- для once и monthly (день месяца берётся отсюда)
  weekday       int  check (weekday between 1 and 7),  -- 1 = Пн … 7 = Вс (для weekly)
  every_n_months int not null default 1,
  remind_days_before int,
  done          boolean not null default false,   -- для разовых
  last_done     date,                              -- для повторяющихся: когда выполнили в последний раз
  reactions     jsonb not null default '{}'::jsonb,   -- { "<user_id>": "❤️" }
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);

create table public.reminders (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  title      text not null,
  assignee   uuid references public.profiles(id) on delete set null,
  time       text not null default '09:00',        -- HH:MM
  days       int[] not null default '{1,2,3,4,5,6,7}',  -- 1 = Пн … 7 = Вс
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  title      text not null,
  qty        text,
  checked    boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.recipes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  title      text not null,
  url        text,
  notes      text,
  created_at timestamptz not null default now()
);

-- ---------- Вишлист ----------
create table public.wishes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  owner      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category   text not null default 'gift' check (category in ('gift','see','dream')),
  title      text not null,
  price      numeric,
  currency   text default '₸',
  url        text,
  image_url  text,
  note       text,
  created_at timestamptz not null default now()
);

-- Бронь подарка: видна ТОЛЬКО дарителю (владелец желания её не видит)
create table public.gift_reservations (
  wish_id    uuid primary key references public.wishes(id) on delete cascade,
  giver      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status     text not null default 'planned' check (status in ('planned','bought')),
  created_at timestamptz not null default now()
);

-- ---------- Места ----------
create table public.places (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  title      text not null,
  category   text,           -- Ресторан, Кафе, Природа…
  address    text,
  visited    boolean not null default false,
  note       text,
  position   integer not null default 0, -- ручной порядок внутри вкладки (меньше — выше)
  created_at timestamptz not null default now()
);

-- ---------- Мы: записки ----------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  author     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

-- ---------- Фильмотека ----------
create table public.movies (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  tmdb_id     int,
  media_type  text not null default 'movie' check (media_type in ('movie','tv')),
  title       text not null,
  original_title text,
  poster_path text,
  year        int,
  genres      text[] not null default '{}',
  overview    text,
  runtime     int,
  status      text not null default 'want' check (status in ('want','watched')),
  added_by    uuid default auth.uid() references public.profiles(id) on delete set null,
  watched_at  date,
  created_at  timestamptz not null default now(),
  unique (couple_id, tmdb_id, media_type)
);

create table public.movie_ratings (
  movie_id   uuid not null references public.movies(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating     int not null check (rating between 1 and 10),
  comment    text,
  rewatch    boolean,        -- посмотрел(а) бы ещё раз; null — не ответил(а)
  updated_at timestamptz not null default now(),
  primary key (movie_id, user_id)
);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.couples           enable row level security;
alter table public.profiles          enable row level security;
alter table public.tasks             enable row level security;
alter table public.reminders         enable row level security;
alter table public.shopping_items    enable row level security;
alter table public.recipes           enable row level security;
alter table public.wishes            enable row level security;
alter table public.gift_reservations enable row level security;
alter table public.places            enable row level security;
alter table public.notes             enable row level security;
alter table public.movies            enable row level security;
alter table public.movie_ratings     enable row level security;

create policy "couple: read own"   on public.couples for select using (id = public.my_couple_id());
create policy "couple: update own" on public.couples for update using (id = public.my_couple_id());

create policy "profiles: me and partner" on public.profiles for select
  using (id = auth.uid() or couple_id = public.my_couple_id());
create policy "profiles: update me" on public.profiles for update using (id = auth.uid());

-- Общие таблицы пары
do $$
declare t text;
begin
  foreach t in array array['tasks','reminders','shopping_items','recipes','wishes','places','notes','movies']
  loop
    execute format('create policy "%1$s: couple" on public.%1$I for all
                    using (couple_id = public.my_couple_id())
                    with check (couple_id = public.my_couple_id())', t);
  end loop;
end $$;

-- Бронь видит и меняет только даритель, и только на желания партнёра
create policy "reservations: giver only" on public.gift_reservations for all
  using (giver = auth.uid())
  with check (
    giver = auth.uid() and exists (
      select 1 from public.wishes w
      where w.id = wish_id and w.couple_id = public.my_couple_id() and w.owner <> auth.uid()
    )
  );

-- Оценки: читают оба, пишет каждый свою
create policy "ratings: read couple" on public.movie_ratings for select
  using (exists (select 1 from public.movies m where m.id = movie_id and m.couple_id = public.my_couple_id()));
create policy "ratings: write own" on public.movie_ratings for insert
  with check (user_id = auth.uid() and exists (select 1 from public.movies m where m.id = movie_id and m.couple_id = public.my_couple_id()));
create policy "ratings: update own" on public.movie_ratings for update using (user_id = auth.uid());
create policy "ratings: delete own" on public.movie_ratings for delete using (user_id = auth.uid());

-- =====================================================================
-- Realtime: синхронизация между телефонами
-- =====================================================================
-- ---------- Storage: загруженные фото (аватары, картинки желаний) ----------
-- Публичный бакет: читать по ссылке может кто угодно, загружать — только в папку своей пары.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos: upload to own couple" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);

-- remove() в Storage требует и select, и delete
create policy "photos: select own couple" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);

create policy "photos: delete own couple" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);

alter publication supabase_realtime add table
  public.tasks, public.reminders, public.shopping_items, public.recipes,
  public.wishes, public.gift_reservations, public.places, public.notes,
  public.movies, public.movie_ratings, public.profiles, public.couples;
