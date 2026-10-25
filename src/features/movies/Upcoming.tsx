import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Button, Empty, ICON_STROKE, Sheet, Txt } from '@/components/ui';
import { humanDateWithYear } from '@/lib/dates';
import { fonts, makeStyles, radius, useColors } from '@/lib/theme';
import { genreMap, isTmdbConfigured, upcomingMovies, type TmdbSearchItem } from '@/lib/tmdb';
import type { Movie } from '@/lib/types';
import { matchesTitle, Poster } from './MovieSheets';

const alertErr = (e: any) => Alert.alert('Ошибка', e?.message ?? String(e));

const premiere = (date: string | null) => (date ? humanDateWithYear(date) : 'дата неизвестна');

// ======================= Вкладка «Скоро»: ещё не вышедшие фильмы =======================
/** Только для просмотра: в «Хотим посмотреть» отсюда не добавляем — фильм ещё не вышел */
export function UpcomingList({ existing, onOpen, query }: { existing: Movie[]; onOpen: (id: string) => void; query: string }) {
  const c = useColors();
  const styles = useStyles();
  const [items, setItems] = useState<TmdbSearchItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<TmdbSearchItem | null>(null);

  const load = async () => {
    if (nextPage == null) return;
    setLoading(true);
    try {
      const next = await upcomingMovies(nextPage);
      // TMDB между страницами может повторять фильмы
      setItems((prev) => [...prev, ...next.items.filter((n) => !prev.some((p) => p.tmdb_id === n.tmdb_id))]);
      setNextPage(next.nextPage);
    } catch (e) {
      alertErr(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isTmdbConfigured) return;
    load();
    genreMap().then(setGenres).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isTmdbConfigured) {
    return <Empty title="Нужен TMDB" hint="Добавьте EXPO_PUBLIC_TMDB_TOKEN в .env — здесь появятся будущие премьеры" />;
  }

  const genreNames = (r: TmdbSearchItem) => r.genre_ids.map((id) => genres[id]).filter(Boolean);
  const shown = items.filter((r) => matchesTitle(query, r.title, r.original_title));

  return (
    <>
      {!!query.trim() && items.length > 0 && !shown.length && (
        <Empty title="Ничего не нашлось" hint={nextPage != null ? 'Среди загруженных премьер такого нет — попробуйте «Показать ещё»' : undefined} />
      )}
      <View style={styles.grid}>
        {shown.map((r) => {
          // Добавленный раньше (например, через поиск) — открываем его карточку из фильмотеки
          const saved = existing.find((m) => m.media_type === 'movie' && m.tmdb_id === r.tmdb_id);
          return (
            <Pressable
              key={r.tmdb_id}
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7 }]}
              onPress={() => (saved ? onOpen(saved.id) : setPreview(r))}
            >
              <View>
                <Poster path={r.poster_path} title={r.title} />
                {saved && (
                  <View style={styles.badge}>
                    <Check size={16} color={c.accentLight} strokeWidth={ICON_STROKE} />
                  </View>
                )}
              </View>
              <Txt style={{ fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, marginTop: 8 }} numberOfLines={2}>
                {r.title}
              </Txt>
              <Text style={styles.date} numberOfLines={1}>
                {premiere(r.release_date)}
              </Text>
              {genreNames(r).length > 0 && (
                <Txt variant="caption" numberOfLines={1}>
                  {genreNames(r)[0].toLowerCase()}
                </Txt>
              )}
            </Pressable>
          );
        })}
      </View>
      {loading ? (
        <ActivityIndicator color={c.textMuted} style={{ marginTop: 12 }} />
      ) : (
        nextPage != null && items.length > 0 && <Button label="Показать ещё" variant="ghost" onPress={load} style={{ marginTop: 4 }} />
      )}
      {!loading && !items.length && <Empty title="Не удалось загрузить" hint="Проверьте интернет и откройте вкладку ещё раз" />}

      {preview && (
        <Sheet visible onClose={() => setPreview(null)} title={preview.title}>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
            <Poster path={preview.poster_path} title={preview.title} style={{ width: 112, height: 168 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View>
                <Txt style={{ fontFamily: fonts.light, fontSize: 28, lineHeight: 34, letterSpacing: -0.8 }}>{premiere(preview.release_date)}</Txt>
                <Txt variant="caption">премьера</Txt>
              </View>
              {preview.original_title !== preview.title && <Txt variant="caption">{preview.original_title}</Txt>}
              {genreNames(preview).length > 0 && (
                <Txt variant="muted">{genreNames(preview).slice(0, 4).join(', ').toLowerCase()}</Txt>
              )}
            </View>
          </View>
          <Txt style={{ marginTop: 16, lineHeight: 22 }}>{preview.overview || 'Описания пока нет.'}</Txt>
          <Txt variant="caption" style={{ marginTop: 16 }}>
            Фильм ещё не вышел — добавить его в «Хотим посмотреть» можно будет после премьеры.
          </Txt>
        </Sheet>
      )}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 16 },
  cell: { width: '33.333%', padding: 5, marginBottom: 10 },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radius.sm,
    backgroundColor: c.bg,
  },
  date: { color: c.accentLight, fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
}));
