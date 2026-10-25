// OMDb API (https://www.omdbapi.com/apikey.aspx) — бесплатный ключ, 1000 запросов в день. Отсюда берём рейтинг IMDb.
const KEY = process.env.EXPO_PUBLIC_OMDB_KEY ?? '';

export const isOmdbConfigured = Boolean(KEY);

export type ImdbRating = { rating: string; votes: string | null; imdbId: string };

const cache = new Map<string, ImdbRating | null>();

export async function imdbRating(imdbId: string): Promise<ImdbRating | null> {
  if (cache.has(imdbId)) return cache.get(imdbId)!;
  const res = await fetch(`https://www.omdbapi.com/?apikey=${KEY}&i=${encodeURIComponent(imdbId)}`);
  if (!res.ok) throw new Error(`OMDb ${res.status}`);
  const d = await res.json();
  // Ошибки ключа/лимита не кешируем — иначе рейтинг не появится до перезапуска
  if (d.Response === 'False' && !/not found|incorrect imdb id/i.test(d.Error ?? '')) throw new Error(`OMDb: ${d.Error}`);
  const value =
    d.Response === 'True' && d.imdbRating && d.imdbRating !== 'N/A'
      ? { rating: d.imdbRating as string, votes: d.imdbVotes && d.imdbVotes !== 'N/A' ? (d.imdbVotes as string) : null, imdbId }
      : null;
  cache.set(imdbId, value);
  return value;
}
