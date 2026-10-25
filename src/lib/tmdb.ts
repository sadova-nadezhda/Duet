// TMDB API (https://developer.themoviedb.org). Токен: Settings → API → "API Read Access Token".
import { toISODate } from '@/lib/dates';

const TOKEN = process.env.EXPO_PUBLIC_TMDB_TOKEN ?? '';
const BASE = 'https://api.themoviedb.org/3';
const LANG = 'ru-RU';

export const isTmdbConfigured = Boolean(TOKEN);

export const posterUrl = (path: string | null | undefined, size: 'w185' | 'w342' | 'w500' = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

export type TmdbSearchItem = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  original_title: string;
  year: number | null;
  poster_path: string | null;
  overview: string;
  genre_ids: number[];
  /** YYYY-MM-DD, если известна */
  release_date: string | null;
};

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ language: LANG, ...params }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

let genreCache: Record<number, string> | null = null;
export async function genreMap(): Promise<Record<number, string>> {
  if (genreCache) return genreCache;
  const [m, t] = await Promise.all([
    get<{ genres: { id: number; name: string }[] }>('/genre/movie/list'),
    get<{ genres: { id: number; name: string }[] }>('/genre/tv/list'),
  ]);
  genreCache = {};
  for (const g of [...m.genres, ...t.genres]) genreCache[g.id] = capitalize(g.name);
  return genreCache;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function searchTitles(query: string): Promise<TmdbSearchItem[]> {
  if (!query.trim()) return [];
  const data = await get<{ results: any[] }>('/search/multi', { query, include_adult: 'false' });
  return data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 20)
    .map((r) => toItem(r, r.media_type));
}

const toItem = (r: any, media_type: 'movie' | 'tv'): TmdbSearchItem => {
  const date: string | undefined = r.release_date || r.first_air_date;
  return {
    tmdb_id: r.id,
    media_type,
    title: r.title || r.name,
    original_title: r.original_title || r.original_name,
    year: date ? Number(date.slice(0, 4)) : null,
    poster_path: r.poster_path,
    overview: r.overview,
    genre_ids: r.genre_ids ?? [],
    release_date: date || null,
  };
};

/** Жанры одного формата — для фильтра в мэтче (у фильмов и сериалов списки разные) */
export async function genreList(type: 'movie' | 'tv'): Promise<{ id: number; name: string }[]> {
  const d = await get<{ genres: { id: number; name: string }[] }>(`/genre/${type}/list`);
  return d.genres.map((g) => ({ id: g.id, name: capitalize(g.name) }));
}

/**
 * Колода для мэтча: популярное и уже вышедшее, с приличной оценкой и русским названием.
 * Как и upcomingMovies, добирает страницы, пока не наберёт minItems.
 */
export async function discoverForMatch(
  type: 'movie' | 'tv',
  genreId: number | null,
  page = 1,
  minItems = 10,
): Promise<{ items: TmdbSearchItem[]; nextPage: number | null }> {
  const today = toISODate(new Date());
  const items: TmdbSearchItem[] = [];
  let next: number | null = page;
  while (next != null && items.length < minItems) {
    const data: { results: any[]; page: number; total_pages: number } = await get(`/discover/${type}`, {
      sort_by: 'popularity.desc',
      include_adult: 'false',
      'vote_count.gte': '300',
      'vote_average.gte': '6',
      [type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte']: today,
      ...(genreId ? { with_genres: String(genreId) } : {}),
      page: String(next),
    });
    items.push(...data.results.filter(hasRussianTitle).map((r) => toItem(r, type)));
    // TMDB отдаёт не больше 500 страниц
    next = data.page < Math.min(data.total_pages, 500) ? data.page + 1 : null;
  }
  return { items, nextPage: next };
}

/** Премьера ещё впереди (у сериала — первая серия). Без даты считаем вышедшим */
export const isUnreleased = (r: TmdbSearchItem) => !!r.release_date && r.release_date > toISODate(new Date());

/** Ниже этого фильм почти никто не ждёт — в основном малоизвестные зарубежные релизы */
const UPCOMING_MIN_POPULARITY = 5;
/** Без перевода TMDB отдаёт оригинальное название — такие фильмы в России вряд ли покажут */
const hasRussianTitle = (r: any) => /[а-яё]/i.test(r.title ?? '');

/**
 * Фильмы, которые ещё не вышли (премьера с завтрашнего дня), — самые ожидаемые сверху.
 * Отсеянное добираем следующими страницами, чтобы за раз пришло хотя бы minItems фильмов.
 */
export async function upcomingMovies(page = 1, minItems = 12): Promise<{ items: TmdbSearchItem[]; nextPage: number | null }> {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const items: TmdbSearchItem[] = [];
  let next: number | null = page;
  while (next != null && items.length < minItems) {
    const data: { results: any[]; page: number; total_pages: number } = await get('/discover/movie', {
      'primary_release_date.gte': tomorrow,
      sort_by: 'popularity.desc',
      include_adult: 'false',
      page: String(next),
    });
    items.push(...data.results.filter((r) => hasRussianTitle(r) && r.popularity >= UPCOMING_MIN_POPULARITY).map((r) => toItem(r, 'movie')));
    // Сортировка по популярности: если страница кончилась фильмами ниже порога, дальше только хуже
    const last = data.results[data.results.length - 1];
    next = data.page < data.total_pages && last?.popularity >= UPCOMING_MIN_POPULARITY ? data.page + 1 : null;
  }
  return { items, nextPage: next };
}

/** IMDb id (tt…) — у фильмов и сериалов он лежит в external_ids */
export async function imdbId(id: number, type: 'movie' | 'tv'): Promise<string | null> {
  const d = await get<{ imdb_id?: string | null }>(`/${type}/${id}/external_ids`);
  return d.imdb_id || null;
}

/** Дата премьеры (у сериала — первой серии), YYYY-MM-DD */
export async function releaseDate(id: number, type: 'movie' | 'tv'): Promise<string | null> {
  const d = await get<{ release_date?: string; first_air_date?: string }>(`/${type}/${id}`);
  return (type === 'movie' ? d.release_date : d.first_air_date) || null;
}

export async function titleDetails(id: number, type: 'movie' | 'tv') {
  const d = await get<any>(`/${type}/${id}`);
  return {
    runtime: (type === 'movie' ? d.runtime : d.episode_run_time?.[0]) ?? null,
    genres: (d.genres ?? []).map((g: { name: string }) => capitalize(g.name)) as string[],
    overview: (d.overview as string) || null,
  };
}
