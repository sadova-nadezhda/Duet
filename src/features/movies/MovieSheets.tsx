import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Clapperboard, Dices, Film, Search, Star, Tv } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Chip, ChipRow, FieldLabel, Input, Segmented, Sheet, Txt } from '@/components/ui';
import { toISODate } from '@/lib/dates';
import { colors, fonts, gradients, radius } from '@/lib/theme';
import { genreMap, isTmdbConfigured, posterUrl, searchTitles, titleDetails, type TmdbSearchItem } from '@/lib/tmdb';
import type { Movie, MovieRating } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const alertErr = (e: any) => Alert.alert('Ошибка', e?.message ?? String(e));

export function Poster({ path, style, title }: { path: string | null; style?: any; title?: string }) {
  const uri = posterUrl(path);
  return (
    <View style={[styles.poster, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <View style={{ alignItems: 'center', gap: 6, padding: 8 }}>
          <Clapperboard size={28} color={colors.accentBorder} />
          {title && (
            <Text style={{ color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 12, textAlign: 'center' }} numberOfLines={3}>
              {title}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ======================= Добавление (поиск TMDB) =======================
export function AddMovieSheet({
  visible,
  onClose,
  existing,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  existing: Movie[];
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
    if (!visible) {
      setQuery('');
      setResults([]);
      setManualYear('');
    }
  }, [visible]);

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
        <Input value={query} onChangeText={setQuery} placeholder="Например, Интерстеллар" autoFocus style={{ paddingLeft: 48 }} />
        <View style={{ position: 'absolute', left: 16, top: 18 }}>
          <Search size={20} color={colors.textFaint} />
        </View>
      </View>

      {loading && <ActivityIndicator color={colors.accentLight} style={{ marginTop: 20 }} />}

      {results.map((r) => {
        const has = already.has(`${r.media_type}:${r.tmdb_id}`);
        return (
          <Pressable
            key={`${r.media_type}${r.tmdb_id}`}
            disabled={has || adding !== null}
            onPress={() => add(r)}
            style={({ pressed }) => [styles.result, pressed && { opacity: 0.7 }]}
          >
            <Poster path={r.poster_path} style={{ width: 54, height: 80, borderRadius: 10 }} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }} numberOfLines={2}>
                {r.title}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {r.media_type === 'tv' ? <Tv size={13} color={colors.textMuted} /> : <Film size={13} color={colors.textMuted} />}
                <Txt variant="caption">
                  {r.media_type === 'tv' ? 'Сериал' : 'Фильм'}
                  {r.year ? ` · ${r.year}` : ''}
                </Txt>
              </View>
              {r.original_title !== r.title && (
                <Txt variant="caption" numberOfLines={1} style={{ color: colors.textFaint, marginTop: 2 }}>
                  {r.original_title}
                </Txt>
              )}
            </View>
            {adding === r.tmdb_id ? (
              <ActivityIndicator color={colors.accentLight} />
            ) : has ? (
              <Check size={20} color={colors.success} />
            ) : (
              <Txt style={{ color: colors.accentLight, fontFamily: fonts.bold, fontSize: 22 }}>+</Txt>
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
function RatingPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value != null && n <= value;
        return (
          <Pressable key={n} onPress={() => onChange(n)} style={[styles.rate, active && styles.rateActive]}>
            <Text style={{ color: active ? '#fff' : colors.textMuted, fontFamily: fonts.bold, fontSize: 15 }}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const avgRating = (ratings: MovieRating[]) =>
  ratings.length ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10 : null;

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
  onRate: (rating: number, comment: string | null) => Promise<void>;
}) {
  const { me, partner, nameOf } = useAuth();
  const mine = ratings.find((r) => r.user_id === me?.id);
  const theirs = ratings.find((r) => r.user_id === partner?.id);
  const [rating, setRating] = useState<number | null>(mine?.rating ?? null);
  const [comment, setComment] = useState(mine?.comment ?? '');

  useEffect(() => {
    setRating(mine?.rating ?? null);
    setComment(mine?.comment ?? '');
  }, [mine?.rating, mine?.comment]);

  const meta = [movie.media_type === 'tv' ? 'Сериал' : 'Фильм', movie.year, movie.runtime ? `${movie.runtime} мин` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Sheet visible onClose={onClose} title={movie.title}>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
        <Poster path={movie.poster_path} title={movie.title} style={{ width: 120, height: 180 }} />
        <View style={{ flex: 1, gap: 8 }}>
          {movie.original_title && <Txt variant="caption">{movie.original_title}</Txt>}
          <Txt variant="muted">{meta}</Txt>
          <ChipRow>
            {movie.genres.slice(0, 4).map((g) => (
              <Chip key={g} label={g} size="sm" tone="accent" />
            ))}
          </ChipRow>
          <Txt variant="caption">Добавил(а): {nameOf(movie.added_by)}</Txt>
          {avgRating(ratings) != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Star size={18} color={colors.star} fill={colors.star} />
              <Txt style={{ fontFamily: fonts.extrabold, fontSize: 20 }}>{avgRating(ratings)}</Txt>
              <Txt variant="caption">средняя пары</Txt>
            </View>
          )}
        </View>
      </View>

      {!!movie.overview && (
        <Txt variant="muted" style={{ marginTop: 16, lineHeight: 21 }}>
          {movie.overview}
        </Txt>
      )}

      {movie.status === 'want' ? (
        <Button
          label="Посмотрели ✓"
          style={{ marginTop: 20 }}
          onPress={() => onUpdate({ status: 'watched', watched_at: toISODate(new Date()) }).catch(alertErr)}
        />
      ) : (
        <>
          <FieldLabel>Ваша оценка</FieldLabel>
          <RatingPicker value={rating} onChange={setRating} />
          <Input value={comment} onChangeText={setComment} placeholder="Пара слов о фильме…" multiline style={{ marginTop: 12 }} />
          <Button
            label={mine ? 'Обновить оценку' : 'Сохранить оценку'}
            disabled={rating == null}
            style={{ marginTop: 12 }}
            onPress={() => onRate(rating!, comment.trim() || null).catch(alertErr)}
          />

          {partner && (
            <View style={styles.partnerBox}>
              <Avatar name={partner.name} size={36} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.bold }}>{partner.name}</Txt>
                {!theirs ? (
                  <Txt variant="caption">Ещё не оценил(а)</Txt>
                ) : !mine ? (
                  <Txt variant="caption">🔒 Оценка откроется после вашей</Txt>
                ) : (
                  <>
                    <Txt variant="caption">{theirs.comment ?? 'Без комментария'}</Txt>
                  </>
                )}
              </View>
              {theirs && mine && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star size={16} color={colors.star} fill={colors.star} />
                  <Txt style={{ fontFamily: fonts.extrabold, fontSize: 18 }}>{theirs.rating}</Txt>
                </View>
              )}
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
          <Chip label="⏱ До 2 часов" size="sm" selected={short} onPress={() => setShort(!short)} />
        </ChipRow>
      </View>

      {pick && (
        <Pressable onPress={() => (onClose(), onOpen(pick))} style={styles.pick}>
          <Poster path={pick.poster_path} title={pick.title} style={{ width: 150, height: 225 }} />
          <Txt variant="h2" style={{ marginTop: 14, textAlign: 'center' }}>
            {pick.title}
          </Txt>
          <Txt variant="muted">{[pick.year, pick.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</Txt>
        </Pressable>
      )}

      <Pressable onPress={spin} disabled={!pool.length} style={{ marginTop: 20, opacity: pool.length ? 1 : 0.5 }}>
        <LinearGradient colors={gradients.fab} style={styles.spin}>
          <Dices size={22} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 17 }}>{pick ? 'Другой вариант' : 'Выбрать случайно'}</Text>
        </LinearGradient>
      </Pressable>
      <Txt variant="caption" style={{ textAlign: 'center', marginTop: 10 }}>
        {pool.length ? `В пуле: ${pool.length}` : 'Под фильтр ничего не подходит'}
      </Txt>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rate: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rateActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  partnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  pick: { alignItems: 'center', marginTop: 24 },
  spin: { height: 58, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
