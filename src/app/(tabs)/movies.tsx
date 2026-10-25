import { useRouter } from 'expo-router';
import { Dices, Heart, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Chip, ChipRow, Empty, ICON_STROKE, Input, ScreenTitle, Segmented, Txt, Screen } from '@/components/ui';
import { AddMovieSheet, avgRating, matchesTitle, MovieDetailsSheet, Poster, RandomPickSheet, useImdbRating, useImdbRatings, useUpcomingRelease } from '@/features/movies/MovieSheets';
import { UpcomingList } from '@/features/movies/Upcoming';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { humanDateWithYear } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { fonts, makeStyles, radius, useColors } from '@/lib/theme';
import type { Movie, MovieRating } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type SortKey = 'new' | 'rating' | 'imdb' | 'year';

export default function Movies() {
  const { me } = useAuth();
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const movies = useCoupleTable<Movie>('movies', { ascending: false });
  const ratings = useCoupleTable<MovieRating>('movie_ratings', { noCoupleFilter: true, orderBy: 'updated_at' });

  const [tab, setTab] = useState<'want' | 'watched' | 'upcoming'>('want');
  const [genre, setGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('new');
  const [addOpen, setAddOpen] = useState(false);
  const [randomOpen, setRandomOpen] = useState(false);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const ratingsBy = useMemo(() => {
    const m: Record<string, MovieRating[]> = {};
    for (const r of ratings.rows) (m[r.movie_id] ??= []).push(r);
    return m;
  }, [ratings.rows]);

  const inTab = movies.rows.filter((m) => m.status === tab);
  const genres = useMemo(() => [...new Set(inTab.flatMap((m) => m.genres))].sort(), [inTab]);
  // Оценка пары есть только у просмотренного
  const sortBy: SortKey = sort === 'rating' && tab !== 'watched' ? 'new' : sort;
  const imdb = useImdbRatings(inTab, sortBy === 'imdb');
  const list = inTab
    .filter((m) => (!genre || m.genres.includes(genre)) && matchesTitle(query, m.title, m.original_title))
    .sort((a, b) => {
      if (sortBy === 'rating') return (avgRating(ratingsBy[b.id] ?? []) ?? 0) - (avgRating(ratingsBy[a.id] ?? []) ?? 0);
      // Без рейтинга IMDb — в конец
      if (sortBy === 'imdb') return (imdb[b.id] ?? 0) - (imdb[a.id] ?? 0);
      if (sortBy === 'year') return (b.year ?? 0) - (a.year ?? 0);
      return (b.watched_at ?? b.created_at).localeCompare(a.watched_at ?? a.created_at);
    });

  const want = movies.rows.filter((m) => m.status === 'want');
  const opened = movies.rows.find((m) => m.id === openedId) ?? null;

  const rate = async (movieId: string, rating: number, comment: string | null, rewatch: boolean | null) => {
    const { error } = await supabase
      .from('movie_ratings')
      .upsert({ movie_id: movieId, user_id: me!.id, rating, comment, rewatch, updated_at: new Date().toISOString() });
    if (error) throw error;
    ratings.reload();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE }}>
        <ScreenTitle title="Кино" onAdd={() => setAddOpen(true)} />
        <Segmented
          value={tab}
          onChange={(t) => (setTab(t), setGenre(null))}
          items={[
            { key: 'want', label: `Хотим ${want.length}` },
            { key: 'watched', label: `Смотрели ${movies.rows.length - want.length}` },
            { key: 'upcoming', label: 'Скоро' },
          ]}
        />

        {(inTab.length > 0 || tab === 'upcoming') && (
          <View style={{ marginTop: 16 }}>
            <Input value={query} onChangeText={setQuery} placeholder="Поиск по названию" style={{ paddingLeft: 46, paddingRight: 46 }} />
            <View style={styles.searchIcon} pointerEvents="none">
              <Search size={20} color={c.textFaint} strokeWidth={ICON_STROKE} />
            </View>
            {!!query && (
              <Pressable onPress={() => setQuery('')} hitSlop={10} style={styles.searchClear}>
                <X size={18} color={c.textMuted} strokeWidth={ICON_STROKE} />
              </Pressable>
            )}
          </View>
        )}

        {tab === 'want' && !query && (
          <Pressable onPress={() => router.push('/movie-match')} style={({ pressed }) => [styles.random, pressed && { opacity: 0.6 }]}>
            <View style={{ flex: 1 }}>
              <Txt variant="title">Мэтч</Txt>
              <Txt variant="muted">Свайпайте фильмы вдвоём — совпадения попадут сюда</Txt>
            </View>
            <Heart size={24} color={c.accentLight} strokeWidth={ICON_STROKE} />
          </Pressable>
        )}

        {tab === 'want' && want.length > 0 && !query && (
          <Pressable onPress={() => setRandomOpen(true)} style={({ pressed }) => [styles.random, pressed && { opacity: 0.6 }]}>
            <View style={{ flex: 1 }}>
              <Txt variant="title">Что смотрим сегодня?</Txt>
              <Txt variant="muted">Случайный выбор из {want.length}</Txt>
            </View>
            <Dices size={24} color={c.accentLight} strokeWidth={ICON_STROKE} />
          </Pressable>
        )}

        {genres.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <ChipRow scroll>
              <Chip label="Все" size="sm" selected={!genre} onPress={() => setGenre(null)} />
              {genres.map((g) => (
                <Chip key={g} label={g} size="sm" selected={genre === g} onPress={() => setGenre(genre === g ? null : g)} />
              ))}
            </ChipRow>
          </View>
        )}
        {tab !== 'upcoming' && inTab.length > 1 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 6, marginTop: 14 }}>
            <Txt variant="caption" style={{ color: c.textFaint }}>
              Сортировка
            </Txt>
            {(
              [
                ['new', 'недавние'],
                ...(tab === 'watched' ? ([['rating', 'по оценке']] as const) : []),
                ['imdb', 'по IMDb'],
                ['year', 'по году'],
              ] as const
            ).map(([k, l]) => (
              <Pressable key={k} onPress={() => setSort(k)} hitSlop={8}>
                <Txt variant="caption" style={sortBy === k && { color: c.text, fontFamily: fonts.medium }}>
                  {l}
                </Txt>
              </Pressable>
            ))}
          </View>
        )}

        {tab === 'upcoming' ? (
          <UpcomingList existing={movies.rows} onOpen={setOpenedId} query={query} />
        ) : !list.length && inTab.length > 0 ? (
          <Empty title="Ничего не нашлось" hint={query ? `В этом списке нет «${query.trim()}». Новый фильм можно найти через «+»` : undefined} />
        ) : !list.length ? (
          <Empty
            title={tab === 'want' ? 'Список пуст' : 'Ещё ничего не посмотрели'}
            hint={
              tab === 'want'
                ? 'Найдите фильм или сериал через «+» — постер и жанры подтянутся сами'
                : 'Отмечайте просмотренное и ставьте оценки вдвоём'
            }
          />
        ) : (
          <View style={styles.grid}>
            {list.map((m) => {
              const rs = ratingsBy[m.id] ?? [];
              const avg = avgRating(rs);
              const myRated = rs.some((r) => r.user_id === me?.id);
              return (
                <Pressable key={m.id} style={styles.cell} onPress={() => setOpenedId(m.id)}>
                  <View>
                    <Poster path={m.poster_path} title={m.title} />
                    <ImdbBadge movie={m} />
                    {m.status === 'watched' && avg != null && (
                      <View style={styles.rating}>
                        <Text style={styles.ratingText}>{avg}</Text>
                      </View>
                    )}
                    {/* Синяя точка — вы ещё не поставили оценку */}
                    {m.status === 'watched' && !myRated && <View style={styles.dot} />}
                  </View>
                  <Txt style={{ fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, marginTop: 8 }} numberOfLines={2}>
                    {m.title}
                  </Txt>
                  <MovieSubtitle movie={m} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <AddMovieSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        existing={movies.rows}
        defaultStatus={tab === 'upcoming' ? 'want' : tab}
        onAdd={(v) => movies.insert(v).then((m) => (setTab(m.status), m))}
      />
      <RandomPickSheet visible={randomOpen} onClose={() => setRandomOpen(false)} movies={want} onOpen={(m) => setOpenedId(m.id)} />
      {opened && (
        <MovieDetailsSheet
          movie={opened}
          ratings={ratingsBy[opened.id] ?? []}
          onClose={() => setOpenedId(null)}
          onUpdate={(v) => movies.update(opened.id, v)}
          onRate={(r, comment, rewatch) => rate(opened.id, r, comment, rewatch)}
          onDelete={() =>
            Alert.alert('Удалить фильм?', opened.title, [
              { text: 'Отмена', style: 'cancel' },
              {
                text: 'Удалить',
                style: 'destructive',
                onPress: () => {
                  movies.remove(opened.id);
                  setOpenedId(null);
                },
              },
            ])
          }
        />
      )}
    </Screen>
  );
}

/** Год и жанр, а у ещё не вышедшего — дата премьеры */
function MovieSubtitle({ movie }: { movie: Movie }) {
  const styles = useStyles();
  const release = useUpcomingRelease(movie);
  if (release) {
    return (
      <Text style={styles.release} numberOfLines={1}>
        Выйдет {humanDateWithYear(release)}
      </Text>
    );
  }
  return (
    <Txt variant="caption" numberOfLines={1}>
      {[movie.year, movie.genres[0]?.toLowerCase()].filter(Boolean).join(', ')}
    </Txt>
  );
}

/** Рейтинг IMDb в левом нижнем углу постера (справа — оценка пары) */
function ImdbBadge({ movie }: { movie: Movie }) {
  const styles = useStyles();
  const imdb = useImdbRating(movie);
  if (!imdb) return null;
  return (
    <View style={styles.imdb}>
      <Text style={styles.imdbLabel}>IMDb</Text>
      <Text style={styles.ratingText}>{imdb.rating}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  random: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  searchIcon: { position: 'absolute', left: 16, top: 16 },
  searchClear: { position: 'absolute', right: 16, top: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 16 },
  cell: { width: '33.333%', padding: 5, marginBottom: 10 },
  rating: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderTopLeftRadius: radius.sm,
    backgroundColor: c.bg,
  },
  ratingText: { color: c.text, fontFamily: fonts.medium, fontSize: 13 },
  imdb: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderTopRightRadius: radius.sm,
    backgroundColor: c.bg,
  },
  imdbLabel: { color: c.textMuted, fontFamily: fonts.medium, fontSize: 10 },
  release: { color: c.accentLight, fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  dot: { position: 'absolute', top: 8, left: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
}));
