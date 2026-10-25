import { Image } from 'expo-image';
import { Dices, Plus, Search } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, ChipRow, FieldLabel, ICON_STROKE, Input, PersonMark, Segmented, Sheet, Txt } from '@/components/ui';
import { toISODate } from '@/lib/dates';
import { imdbRating, isOmdbConfigured, type ImdbRating } from '@/lib/omdb';
import { fonts, makeStyles, radius, useColors } from '@/lib/theme';
import { genreMap, imdbId, isTmdbConfigured, posterUrl, searchTitles, titleDetails, type TmdbSearchItem } from '@/lib/tmdb';
import type { Movie, MovieRating } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const alertErr = (e: any) => Alert.alert('Ошибка', e?.message ?? String(e));

export function Poster({ path, style, title }: { path: string | null; style?: any; title?: string }) {
  const c = useColors();
  const styles = useStyles();
  const uri = posterUrl(path);
  return (
    <View style={[styles.poster, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        // Без постера — просто название, как на корешке
        !!title && (
          <Text style={{ color: c.textMuted, fontFamily: fonts.medium, fontSize: 12, padding: 10 }} numberOfLines={4}>
            {title}
          </Text>
        )
      )}
    </View>
  );
}

// ======================= Добавление (поиск TMDB) =======================
export function AddMovieSheet({
  visible,
  onClose,
  existing,
  defaultStatus = 'want',
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  existing: Movie[];
  /** Список, открытый на экране, — его и предлагаем по умолчанию */
  defaultStatus?: 'want' | 'watched';
  onAdd: (v: Partial<Movie>) => Promise<unknown>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'want' | 'watched'>('want');
  const [adding, setAdding] = useState<number | null>(null);
  const [manualYear, setManualYear] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) setStatus(defaultStatus);
    else {
      setQuery('');
      setResults([]);
      setManualYear('');
    }
  }, [visible, defaultStatus]);

  useEffect(() => {
    if (!isTmdbConfigured) return;
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) return setResults([]);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchTitles(query));
      } catch (e) {
        alertErr(e);
      }
      setLoading(false);
    }, 400);
  }, [query]);

  const c = useColors();
  const styles = useStyles();
  const already = new Set(existing.map((m) => `${m.media_type}:${m.tmdb_id}`));

  const add = async (r: TmdbSearchItem) => {
    setAdding(r.tmdb_id);
    try {
      const [details, genres] = await Promise.all([
        titleDetails(r.tmdb_id, r.media_type).catch(() => null),
        genreMap().catch(() => ({}) as Record<number, string>),
      ]);
      await onAdd({
        tmdb_id: r.tmdb_id,
        media_type: r.media_type,
        title: r.title,
        original_title: r.original_title !== r.title ? r.original_title : null,
        poster_path: r.poster_path,
        year: r.year,
        genres: details?.genres ?? r.genre_ids.map((id) => genres[id]).filter(Boolean),
        overview: details?.overview ?? r.overview ?? null,
        runtime: details?.runtime ?? null,
        status,
        watched_at: status === 'watched' ? toISODate(new Date()) : null,
      });
      onClose();
    } catch (e) {
      alertErr(e);
    }
    setAdding(null);
  };

  const addManual = () =>
    onAdd({
      title: query.trim(),
      year: manualYear ? Number(manualYear) : null,
      status,
      watched_at: status === 'watched' ? toISODate(new Date()) : null,
    })
      .then(onClose)
      .catch(alertErr);

  return (
    <Sheet visible={visible} onClose={onClose} title="Добавить в фильмотеку">
      <FieldLabel>Список</FieldLabel>
      <Segmented
        value={status}
        onChange={setStatus}
        items={[
          { key: 'want', label: 'Хотим посмотреть' },
          { key: 'watched', label: 'Уже смотрели' },
        ]}
      />
      <FieldLabel>{isTmdbConfigured ? 'Поиск фильма или сериала' : 'Название'}</FieldLabel>
      <View>
        <Input value={query} onChangeText={setQuery} placeholder="Например, Интерстеллар" autoFocus style={{ paddingLeft: 46 }} />
        <View style={{ position: 'absolute', left: 16, top: 16 }}>
          <Search size={20} color={c.textFaint} strokeWidth={ICON_STROKE} />
        </View>
      </View>

      {loading && <ActivityIndicator color={c.textMuted} style={{ marginTop: 20 }} />}

      {results.map((r) => {
        const has = already.has(`${r.media_type}:${r.tmdb_id}`);
        return (
          <Pressable
            key={`${r.media_type}${r.tmdb_id}`}
            disabled={has || adding !== null}
            onPress={() => add(r)}
            style={({ pressed }) => [styles.result, pressed && { opacity: 0.7 }]}
          >
            <Poster path={r.poster_path} style={{ width: 48, height: 72, borderRadius: 6 }} />
            <View style={{ flex: 1 }}>
              <Txt variant="title" style={{ fontSize: 15 }} numberOfLines={2}>
                {r.title}
              </Txt>
              <Txt variant="caption" style={{ marginTop: 2 }}>
                {r.media_type === 'tv' ? 'Сериал' : 'Фильм'}
                {r.year ? `, ${r.year}` : ''}
              </Txt>
              {r.original_title !== r.title && (
                <Txt variant="caption" numberOfLines={1} style={{ color: c.textFaint }}>
                  {r.original_title}
                </Txt>
              )}
            </View>
            {adding === r.tmdb_id ? (
              <ActivityIndicator color={c.textMuted} />
            ) : has ? (
              <Txt variant="caption">уже есть</Txt>
            ) : (
              <Plus size={22} color={c.accentLight} strokeWidth={ICON_STROKE} />
            )}
          </Pressable>
        );
      })}

      {!isTmdbConfigured && (
        <>
          <FieldLabel optional>Год</FieldLabel>
          <Input
            value={manualYear}
            onChangeText={(v) => setManualYear(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="2014"
          />
          <Txt variant="caption" style={{ marginTop: 10 }}>
            Добавьте EXPO_PUBLIC_TMDB_TOKEN в .env — появится поиск с постерами и жанрами.
          </Txt>
          <Button label="Добавить" onPress={addManual} disabled={!query.trim()} style={{ marginTop: 16 }} />
        </>
      )}
      {isTmdbConfigured && query.trim().length >= 2 && !loading && !results.length && (
        <View style={{ marginTop: 20, gap: 12 }}>
          <Txt variant="muted" style={{ textAlign: 'center' }}>
            Ничего не нашлось
          </Txt>
          <Button label={`Добавить «${query.trim()}» вручную`} variant="ghost" onPress={addManual} />
        </View>
      )}
    </Sheet>
  );
}

// ======================= Оценка 1–10 =======================
/** Шкала 1–10 одной линейкой: выбранное число — залито, всё до него — подчёркнуто */
function RatingPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const picked = value === n;
        const inRange = value != null && n < value;
        return (
          <Pressable key={n} onPress={() => onChange(n)} style={[styles.rate, inRange && styles.rateRange, picked && styles.ratePicked]}>
            <Text style={{ color: picked ? c.onAccent : inRange ? c.text : c.textMuted, fontFamily: fonts.medium, fontSize: 15 }}>
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const avgRating = (ratings: MovieRating[]) =>
  ratings.length ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10 : null;

// Один запрос на фильм за сессию: сетка и карточка открытого фильма делят результат (лимит OMDb — 1000/день)
const imdbRequests = new Map<string, Promise<ImdbRating | null>>();

/** Рейтинг IMDb: TMDB → imdb_id → OMDb. В базе не храним — он меняется */
export function useImdbRating(movie: Movie) {
  const [value, setValue] = useState<ImdbRating | null>(null);
  useEffect(() => {
    setValue(null);
    if (!isTmdbConfigured || !isOmdbConfigured || movie.tmdb_id == null) return;
    const key = `${movie.media_type}:${movie.tmdb_id}`;
    let req = imdbRequests.get(key);
    if (!req) {
      req = imdbId(movie.tmdb_id, movie.media_type).then((id) => (id ? imdbRating(id) : null));
      // Ошибку не запоминаем — в следующий раз попробуем снова
      req.catch(() => imdbRequests.delete(key));
      imdbRequests.set(key, req);
    }
    let cancelled = false;
    req.then((r) => !cancelled && setValue(r)).catch(() => {}); // рейтинг — необязательная деталь, ошибки не показываем
    return () => {
      cancelled = true;
    };
  }, [movie.tmdb_id, movie.media_type]);
  return value;
}

// ======================= Карточка фильма =======================
export function MovieDetailsSheet({
  movie,
  ratings,
  onClose,
  onUpdate,
  onDelete,
  onRate,
}: {
  movie: Movie;
  ratings: MovieRating[];
  onClose: () => void;
  onUpdate: (v: Partial<Movie>) => Promise<void>;
  onDelete: () => void;
  onRate: (rating: number, comment: string | null, rewatch: boolean | null) => Promise<void>;
}) {
  const { me, partner, nameOf } = useAuth();
  const styles = useStyles();
  const mine = ratings.find((r) => r.user_id === me?.id);
  const theirs = ratings.find((r) => r.user_id === partner?.id);
  const [rating, setRating] = useState<number | null>(mine?.rating ?? null);
  const [comment, setComment] = useState(mine?.comment ?? '');
  const [rewatch, setRewatch] = useState<boolean | null>(mine?.rewatch ?? null);

  useEffect(() => {
    setRating(mine?.rating ?? null);
    setComment(mine?.comment ?? '');
    setRewatch(mine?.rewatch ?? null);
  }, [mine?.rating, mine?.comment, mine?.rewatch]);

  const meta = [movie.media_type === 'tv' ? 'Сериал' : 'Фильм', movie.year, movie.runtime ? `${movie.runtime} мин` : null]
    .filter(Boolean)
    .join(', ');
  const avg = avgRating(ratings);
  const imdb = useImdbRating(movie);

  return (
    <Sheet visible onClose={onClose} title={movie.title}>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
        <Poster path={movie.poster_path} title={movie.title} style={{ width: 112, height: 168 }} />
        <View style={{ flex: 1, gap: 6 }}>
          {avg != null && (
            <View>
              <Txt style={{ fontFamily: fonts.light, fontSize: 44, lineHeight: 48, letterSpacing: -1.5 }}>{avg}</Txt>
              <Txt variant="caption">средняя оценка пары</Txt>
            </View>
          )}
          {movie.original_title && <Txt variant="caption">{movie.original_title}</Txt>}
          <Txt variant="muted">{meta}</Txt>
          {imdb && (
            <Pressable onPress={() => Linking.openURL(`https://www.imdb.com/title/${imdb.imdbId}/`)} hitSlop={6}>
              <Txt variant="muted">
                <Text style={{ fontFamily: fonts.medium }}>IMDb {imdb.rating}</Text>
                {imdb.votes ? ` · ${imdb.votes.replace(/,/g, ' ')} оценок` : ''}
              </Txt>
            </Pressable>
          )}
          {movie.genres.length > 0 && <Txt variant="muted">{movie.genres.slice(0, 4).join(', ').toLowerCase()}</Txt>}
          <Txt variant="caption">Добавил(а) {nameOf(movie.added_by)}</Txt>
        </View>
      </View>

      {!!movie.overview && (
        <Txt style={{ marginTop: 16, lineHeight: 22 }}>
          {movie.overview}
        </Txt>
      )}

      {movie.status === 'want' ? (
        <Button
          label="Мы посмотрели"
          style={{ marginTop: 20 }}
          onPress={() => onUpdate({ status: 'watched', watched_at: toISODate(new Date()) }).catch(alertErr)}
        />
      ) : (
        <>
          <FieldLabel>Ваша оценка</FieldLabel>
          <RatingPicker value={rating} onChange={setRating} />
          <FieldLabel optional>Посмотрели бы ещё раз?</FieldLabel>
          <ChipRow>
            {/* Повторное нажатие снимает ответ */}
            <Chip label="Да" selected={rewatch === true} onPress={() => setRewatch(rewatch === true ? null : true)} />
            <Chip label="Нет" selected={rewatch === false} onPress={() => setRewatch(rewatch === false ? null : false)} />
          </ChipRow>
          <Input value={comment} onChangeText={setComment} placeholder="Пара слов о фильме…" multiline style={{ marginTop: 16 }} />
          <Button
            label={mine ? 'Обновить оценку' : 'Сохранить оценку'}
            disabled={rating == null}
            style={{ marginTop: 12 }}
            onPress={() => onRate(rating!, comment.trim() || null, rewatch).catch(alertErr)}
          />

          {partner && (
            <View style={styles.partnerBox}>
              <PersonMark mine={false} />
              <View style={{ flex: 1 }}>
                <Txt variant="title" style={{ fontSize: 15 }}>
                  {partner.name}
                </Txt>
                {!theirs ? (
                  <Txt variant="muted">Ещё не оценил(а)</Txt>
                ) : !mine ? (
                  <Txt variant="muted">Оценка откроется после вашей</Txt>
                ) : (
                  <>
                    <Txt variant="muted">{theirs.comment ?? 'Без комментария'}</Txt>
                    {theirs.rewatch != null && (
                      <Txt variant="caption" style={{ marginTop: 2 }}>
                        {theirs.rewatch ? 'Посмотрел(а) бы ещё раз' : 'Второй раз смотреть не стал(а) бы'}
                      </Txt>
                    )}
                  </>
                )}
              </View>
              {theirs && mine && <Txt style={{ fontFamily: fonts.light, fontSize: 28, letterSpacing: -0.8 }}>{theirs.rating}</Txt>}
            </View>
          )}
          <Button
            label="Вернуть в «Хотим посмотреть»"
            variant="ghost"
            style={{ marginTop: 12 }}
            onPress={() => onUpdate({ status: 'want', watched_at: null }).catch(alertErr)}
          />
        </>
      )}
      <Button label="Удалить из фильмотеки" variant="danger" style={{ marginTop: 12 }} onPress={onDelete} />
    </Sheet>
  );
}

// ======================= «Что смотрим сегодня?» =======================
export function RandomPickSheet({
  visible,
  onClose,
  movies,
  onOpen,
}: {
  visible: boolean;
  onClose: () => void;
  movies: Movie[];
  onOpen: (m: Movie) => void;
}) {
  const [genre, setGenre] = useState<string | null>(null);
  const [type, setType] = useState<'any' | 'movie' | 'tv'>('any');
  const [short, setShort] = useState(false);
  const [pick, setPick] = useState<Movie | null>(null);

  const c = useColors();
  const styles = useStyles();
  const genres = useMemo(() => [...new Set(movies.flatMap((m) => m.genres))].sort(), [movies]);
  const pool = movies.filter(
    (m) => (type === 'any' || m.media_type === type) && (!genre || m.genres.includes(genre)) && (!short || (m.runtime ?? 999) <= 110),
  );

  useEffect(() => {
    if (!visible) setPick(null);
  }, [visible]);

  const spin = () => {
    if (!pool.length) return;
    const candidates = pool.length > 1 ? pool.filter((m) => m.id !== pick?.id) : pool;
    setPick(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Что смотрим сегодня?">
      <FieldLabel>Формат</FieldLabel>
      <Segmented
        value={type}
        onChange={setType}
        items={[
          { key: 'any', label: 'Любое' },
          { key: 'movie', label: 'Фильм' },
          { key: 'tv', label: 'Сериал' },
        ]}
      />
      {genres.length > 0 && (
        <>
          <FieldLabel optional>Жанр</FieldLabel>
          <ChipRow>
            <Chip label="Любой" size="sm" selected={!genre} onPress={() => setGenre(null)} />
            {genres.map((g) => (
              <Chip key={g} label={g} size="sm" selected={genre === g} onPress={() => setGenre(g)} />
            ))}
          </ChipRow>
        </>
      )}
      <View style={{ marginTop: 14 }}>
        <ChipRow>
          <Chip label="До 2 часов" size="sm" selected={short} onPress={() => setShort(!short)} />
        </ChipRow>
      </View>

      {pick && (
        <Pressable onPress={() => (onClose(), onOpen(pick))} style={styles.pick}>
          <Poster path={pick.poster_path} title={pick.title} style={{ width: 120, height: 180 }} />
          <View style={{ flex: 1 }}>
            <Txt variant="h2">{pick.title}</Txt>
            <Txt variant="muted" style={{ marginTop: 4 }}>
              {[pick.year, pick.genres.slice(0, 2).join(', ').toLowerCase()].filter(Boolean).join(', ')}
            </Txt>
            <Txt style={{ color: c.accentLight, marginTop: 12 }}>Открыть</Txt>
          </View>
        </Pressable>
      )}

      <Button
        label={pick ? 'Другой вариант' : 'Выбрать случайно'}
        icon={Dices}
        onPress={spin}
        disabled={!pool.length}
        style={{ marginTop: 20 }}
      />
      <Txt variant="caption" style={{ marginTop: 10 }}>
        {pool.length ? `Подходит под фильтр: ${pool.length}` : 'Под фильтр ничего не подходит'}
      </Txt>
    </Sheet>
  );
}

const useStyles = makeStyles((c) => ({
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    backgroundColor: c.surface,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rate: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: c.border,
  },
  rateRange: { borderBottomColor: c.text },
  ratePicked: { backgroundColor: c.accent, borderBottomColor: c.accent, borderRadius: radius.sm },
  partnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  pick: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginTop: 24 },
}));
