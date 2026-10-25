// TMDB API (https://developer.themoviedb.org). Токен: Settings → API → "API Read Access Token".
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
    .map((r) => {
      const date: string | undefined = r.release_date || r.first_air_date;
      return {
        tmdb_id: r.id,
        media_type: r.media_type,
        title: r.title || r.name,
        original_title: r.original_title || r.original_name,
        year: date ? Number(date.slice(0, 4)) : null,
        poster_path: r.poster_path,
        overview: r.overview,
        genre_ids: r.genre_ids ?? [],
      };
    });
}

/** IMDb id (tt…) — у фильмов и сериалов он лежит в external_ids */
export async function imdbId(id: number, type: 'movie' | 'tv'): Promise<string | null> {
  const d = await get<{ imdb_id?: string | null }>(`/${type}/${id}/external_ids`);
  return d.imdb_id || null;
}

export async function titleDetails(id: number, type: 'movie' | 'tv') {
  const d = await get<any>(`/${type}/${id}`);
  return {
    runtime: (type === 'movie' ? d.runtime : d.episode_run_time?.[0]) ?? null,
    genres: (d.genres ?? []).map((g: { name: string }) => capitalize(g.name)) as string[],
    overview: (d.overview as string) || null,
  };
}
