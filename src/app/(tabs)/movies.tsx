import { LinearGradient } from 'expo-linear-gradient';
import { Clapperboard, Dices, Eye, Popcorn, Star } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Chip, ChipRow, Empty, ScreenTitle, Segmented, Txt, Screen } from '@/components/ui';
import { AddMovieSheet, avgRating, MovieDetailsSheet, Poster, RandomPickSheet } from '@/features/movies/MovieSheets';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { supabase } from '@/lib/supabase';
import { colors, fonts, gradients, radius } from '@/lib/theme';
import type { Movie, MovieRating } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type SortKey = 'new' | 'rating' | 'year';

export default function Movies() {
  const { me } = useAuth();
  const movies = useCoupleTable<Movie>('movies', { ascending: false });
  const ratings = useCoupleTable<MovieRating>('movie_ratings', { noCoupleFilter: true, orderBy: 'updated_at' });

  const [tab, setTab] = useState<'want' | 'watched'>('want');
  const [genre, setGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('new');
  const [addOpen, setAddOpen] = useState(false);
  const [randomOpen, setRandomOpen] = useState(false);
  const [openedId, setOpenedId] = useState<string | null>(null);

  const ratingsBy = useMemo(() => {
    const m: Record<string, MovieRating[]> = {};
    for (const r of ratings.rows) (m[r.movie_id] ??= []).push(r);
    return m;
  }, [ratings.rows]);

  const inTab = movies.rows.filter((m) => m.status === tab);
  const genres = useMemo(() => [...new Set(inTab.flatMap((m) => m.genres))].sort(), [inTab]);
  const list = inTab
    .filter((m) => !genre || m.genres.includes(genre))
    .sort((a, b) => {
      if (sort === 'rating') return (avgRating(ratingsBy[b.id] ?? []) ?? 0) - (avgRating(ratingsBy[a.id] ?? []) ?? 0);
      if (sort === 'year') return (b.year ?? 0) - (a.year ?? 0);
      return (b.watched_at ?? b.created_at).localeCompare(a.watched_at ?? a.created_at);
    });

  const want = movies.rows.filter((m) => m.status === 'want');
  const opened = movies.rows.find((m) => m.id === openedId) ?? null;

  const rate = async (movieId: string, rating: number, comment: string | null) => {
    const { error } = await supabase
      .from('movie_ratings')
      .upsert({ movie_id: movieId, user_id: me!.id, rating, comment, updated_at: new Date().toISOString() });
    if (error) throw error;
    ratings.reload();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE }}>
        <ScreenTitle title="Фильмотека" onAdd={() => setAddOpen(true)} />
        <Segmented
          value={tab}
          onChange={(t) => (setTab(t), setGenre(null))}
          items={[
            { key: 'want', label: `Хотим · ${want.length}`, icon: Popcorn },
            { key: 'watched', label: `Смотрели · ${movies.rows.length - want.length}`, icon: Eye },
          ]}
        />

        {tab === 'want' && want.length > 0 && (
          <Pressable
            onPress={() => setRandomOpen(true)}
            style={({ pressed }) => [{ marginTop: 16 }, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient colors={gradients.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.random}>
              <View style={styles.dice}>
                <Dices size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontFamily: fonts.extrabold, fontSize: 18 }}>Что смотрим сегодня?</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: fonts.medium, fontSize: 13, marginTop: 2 }}>
                  Случайный выбор из вашего списка
                </Text>
              </View>
            </LinearGradient>
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
        {tab === 'watched' && inTab.length > 1 && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            {(
              [
                ['new', 'Недавние'],
                ['rating', 'По оценке'],
                ['year', 'По году'],
              ] as const
            ).map(([k, l]) => (
              <Pressable key={k} onPress={() => setSort(k)}>
                <Txt
                  variant="caption"
                  style={[
                    { paddingVertical: 4, paddingHorizontal: 8 },
                    sort === k && { color: colors.accentLight, fontFamily: fonts.bold },
                  ]}
                >
                  {l}
                </Txt>
              </Pressable>
            ))}
          </View>
        )}

        {!list.length ? (
          <Empty
            icon={Clapperboard}
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
                    {m.status === 'watched' && (
                      <View style={styles.rating}>
                        <Star size={12} color={colors.star} fill={colors.star} />
                        <Text style={styles.ratingText}>{avg ?? '—'}</Text>
                      </View>
                    )}
                    {m.status === 'watched' && !myRated && <View style={styles.dot} />}
                  </View>
                  <Txt style={{ fontFamily: fonts.bold, fontSize: 13, marginTop: 8 }} numberOfLines={2}>
                    {m.title}
                  </Txt>
                  <Txt variant="caption" numberOfLines={1}>
                    {[m.year, m.genres[0]].filter(Boolean).join(' · ')}
                  </Txt>
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
        onAdd={(v) => movies.insert(v).then((m) => (setTab(m.status), m))}
      />
      <RandomPickSheet visible={randomOpen} onClose={() => setRandomOpen(false)} movies={want} onOpen={(m) => setOpenedId(m.id)} />
      {opened && (
        <MovieDetailsSheet
          movie={opened}
          ratings={ratingsBy[opened.id] ?? []}
          onClose={() => setOpenedId(null)}
          onUpdate={(v) => movies.update(opened.id, v)}
          onRate={(r, c) => rate(opened.id, r, c)}
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

const styles = StyleSheet.create({
  random: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg },
  dice: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: 16 },
  cell: { width: '33.333%', padding: 6, marginBottom: 6 },
  rating: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(17,12,24,0.85)',
  },
  ratingText: { color: '#fff', fontFamily: fonts.bold, fontSize: 12 },
  dot: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
