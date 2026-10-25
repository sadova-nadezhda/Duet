import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Heart, X } from 'lucide-react-native';
import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, PanResponder, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, ChipRow, Empty, ICON_STROKE, IconButton, Segmented, Txt } from '@/components/ui';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { supabase } from '@/lib/supabase';
import { fonts, makeStyles, radius, useColors } from '@/lib/theme';
import { discoverForMatch, genreList, genreMap, isTmdbConfigured, type TmdbSearchItem } from '@/lib/tmdb';
import type { Movie, MovieSwipe } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { movieFromTmdb, Poster, useImdbRating } from './MovieSheets';

const alertErr = (e: any) => Alert.alert('Ошибка', e?.message ?? String(e));
const keyOf = (r: { media_type: string; tmdb_id: number | null }) => `${r.media_type}:${r.tmdb_id}`;
const haptic = (kind: 'swipe' | 'match') => {
  if (Platform.OS === 'web') return;
  if (kind === 'swipe') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// ======================= Экран мэтча =======================
/**
 * Колода фильмов: вправо — хочу посмотреть, влево — не привлекает.
 * Если вправо свайпнули оба — фильм попадает в «Хотим посмотреть».
 * Фильмы, которые партнёр уже лайкнул, показываем первыми — так мэтчи случаются быстрее.
 */
export function MovieMatch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { me, partner } = useAuth();
  const swipes = useCoupleTable<MovieSwipe>('movie_swipes');
  const movies = useCoupleTable<Movie>('movies');

  const [type, setType] = useState<'movie' | 'tv'>('movie');
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [genreNames, setGenreNames] = useState<Record<number, string>>({});

  const [deck, setDeck] = useState<TmdbSearchItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  // Отсвайпанное в этой сессии — чтобы карточка не вернулась, пока Realtime не подтянул запись
  const swipedNow = useRef(new Set<string>());
  const [match, setMatch] = useState<TmdbSearchItem | null>(null);
  const top = useRef<SwipeHandle>(null);

  const library = useMemo(() => new Set(movies.rows.map(keyOf)), [movies.rows]);
  const mySwiped = useMemo(() => new Set(swipes.rows.filter((s) => s.user_id === me?.id).map(keyOf)), [swipes.rows, me?.id]);
  const isFresh = (r: TmdbSearchItem) => !library.has(keyOf(r)) && !mySwiped.has(keyOf(r)) && !swipedNow.current.has(keyOf(r));
  const fitsFilter = (r: TmdbSearchItem) => r.media_type === type && (!genreId || r.genre_ids.includes(genreId));

  useEffect(() => {
    genreMap().then(setGenreNames).catch(() => {});
  }, []);

  useEffect(() => {
    setGenreId(null);
    genreList(type).then(setGenres).catch(() => setGenres([]));
  }, [type]);

  // Смена фильтра — колода заново; ответ на запрос по старому фильтру отбросим по номеру поколения
  const generation = useRef(0);
  const fetching = useRef(false);
  useEffect(() => {
    generation.current++;
    fetching.current = false;
    setLoading(false);
    setDeck([]);
    setNextPage(1);
  }, [type, genreId]);

  // Лайки партнёра, которые я ещё не видел(а): в пустую колоду — сверху, иначе сразу за текущей карточкой
  useEffect(() => {
    if (swipes.loading || movies.loading) return;
    const partnerLiked = swipes.rows
      .filter((s) => s.user_id === partner?.id && s.liked)
      .map((s) => s.item)
      .filter((r) => fitsFilter(r) && isFresh(r));
    setDeck((d) => {
      const add = partnerLiked.filter((r) => !d.some((x) => keyOf(x) === keyOf(r)));
      if (!add.length) return d;
      return d.length ? [d[0], ...add, ...d.slice(1)] : add;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swipes.rows, swipes.loading, movies.loading, partner?.id, type, genreId]);

  // Подгрузка из TMDB, когда карточки заканчиваются
  useEffect(() => {
    if (!isTmdbConfigured || swipes.loading || movies.loading || fetching.current || nextPage == null || deck.length >= 4) return;
    const gen = generation.current;
    fetching.current = true;
    setLoading(true);
    discoverForMatch(type, genreId, nextPage)
      .then((res) => {
        if (gen !== generation.current) return;
        setDeck((d) => [...d, ...res.items.filter((r) => isFresh(r) && !d.some((x) => keyOf(x) === keyOf(r)))]);
        setNextPage(res.nextPage);
      })
      .catch((e) => gen === generation.current && (alertErr(e), setNextPage(null)))
      .finally(() => {
        if (gen !== generation.current) return;
        fetching.current = false;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.length, nextPage, type, genreId, swipes.loading, movies.loading, loading]);

  // Мэтч мог случиться на телефоне партнёра: я лайкнул(а) раньше, он(а) — сейчас, и фильм появился в фильмотеке
  const knownMovies = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (movies.loading) return;
    const now = new Set(movies.rows.map((m) => m.id));
    if (knownMovies.current) {
      const fresh = movies.rows.find((m) => !knownMovies.current!.has(m.id) && m.added_by === partner?.id);
      const mine = fresh && swipes.rows.find((s) => s.user_id === me?.id && s.liked && keyOf(s) === keyOf(fresh));
      if (mine) {
        haptic('match');
        setMatch(mine.item);
      }
    }
    knownMovies.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies.rows, movies.loading]);

  const swipe = async (item: TmdbSearchItem, liked: boolean) => {
    haptic('swipe');
    swipedNow.current.add(keyOf(item));
    setDeck((d) => d.filter((x) => keyOf(x) !== keyOf(item)));
    try {
      const { error } = await supabase.from('movie_swipes').upsert({
        couple_id: me!.couple_id,
        user_id: me!.id,
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        liked,
        item,
      });
      if (error) throw error;
      if (!liked || !partner) return;

      // Свежий ответ из базы, а не из Realtime: партнёр мог свайпнуть секунду назад
      const { data } = await supabase
        .from('movie_swipes')
        .select('liked')
        .eq('user_id', partner.id)
        .eq('tmdb_id', item.tmdb_id)
        .eq('media_type', item.media_type)
        .maybeSingle();
      if (!data?.liked) return;

      const { error: insErr } = await supabase.from('movies').insert(await movieFromTmdb(item, 'want'));
      // 23505 — фильм уже добавлен (например, партнёр поймал мэтч одновременно)
      if (insErr && insErr.code !== '23505') throw insErr;
      haptic('match');
      setMatch(item);
    } catch (e) {
      alertErr(e);
    }
  };

  const [current, next] = deck;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top || 16, paddingBottom: insets.bottom + 16 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16, marginBottom: 16 }}>
          <Txt variant="h1">Мэтч</Txt>
          <IconButton icon={X} onPress={() => router.back()} />
        </View>
        <Segmented
          value={type}
          onChange={setType}
          items={[
            { key: 'movie', label: 'Фильмы' },
            { key: 'tv', label: 'Сериалы' },
          ]}
        />
        {genres.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <ChipRow scroll>
              <Chip label="Любой" size="sm" selected={!genreId} onPress={() => setGenreId(null)} />
              {genres.map((g) => (
                <Chip key={g.id} label={g.name} size="sm" selected={genreId === g.id} onPress={() => setGenreId(genreId === g.id ? null : g.id)} />
              ))}
            </ChipRow>
          </View>
        )}
      </View>

      <View style={styles.stage}>
        {!isTmdbConfigured ? (
          <Empty title="Нужен TMDB" hint="Добавьте EXPO_PUBLIC_TMDB_TOKEN в .env — отсюда берутся фильмы для мэтча" />
        ) : !current ? (
          loading || nextPage != null ? (
            <ActivityIndicator color={c.textMuted} style={{ flex: 1 }} />
          ) : (
            <Empty title="Карточки закончились" hint="Вы посмотрели всё по этому фильтру — попробуйте другой жанр или формат" />
          )
        ) : (
          <>
            {next && <MatchCard key={keyOf(next)} item={next} genreNames={genreNames} behind />}
            <MatchCard key={keyOf(current)} ref={top} item={current} genreNames={genreNames} onSwipe={(liked) => swipe(current, liked)} />
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable disabled={!current} onPress={() => top.current?.swipe(false)} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
          <X size={30} color={c.danger} strokeWidth={ICON_STROKE} />
        </Pressable>
        <Pressable
          disabled={!current}
          onPress={() => top.current?.swipe(true)}
          style={({ pressed }) => [styles.action, styles.actionLike, pressed && { opacity: 0.6 }]}
        >
          <Heart size={30} color={c.onAccent} strokeWidth={ICON_STROKE} />
        </Pressable>
      </View>
      {!partner && (
        <Txt variant="caption" style={{ textAlign: 'center', marginTop: 10 }}>
          Мэтчи появятся, когда партнёр присоединится и тоже начнёт свайпать
        </Txt>
      )}

      <Modal visible={!!match} transparent animationType="fade" onRequestClose={() => setMatch(null)}>
        <View style={styles.matchBackdrop}>
          {match && (
            <View style={styles.matchBox}>
              <Txt variant="h1" style={{ color: c.accentLight, textAlign: 'center' }}>
                Это мэтч!
              </Txt>
              <Poster path={match.poster_path} title={match.title} style={{ width: 160, alignSelf: 'center', marginTop: 20 }} />
              <Txt variant="muted" style={{ textAlign: 'center', marginTop: 16 }}>
                Вы оба хотите посмотреть «{match.title}». Фильм уже в «Хотим посмотреть».
              </Txt>
              <Button label="Свайпать дальше" onPress={() => setMatch(null)} style={{ marginTop: 20 }} />
              <Button
                label="К фильмотеке"
                variant="ghost"
                onPress={() => (setMatch(null), router.back())}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ======================= Карточка со свайпом =======================
type SwipeHandle = { swipe: (liked: boolean) => void };

/** Карточка тянется пальцем; дальше порога или резким движением — улетает, иначе пружинит обратно */
function MatchCard({
  item,
  genreNames,
  onSwipe,
  behind,
  ref,
}: {
  item: TmdbSearchItem;
  genreNames: Record<number, string>;
  onSwipe?: (liked: boolean) => void;
  /** Следующая карточка под текущей: чуть меньше и без жестов */
  behind?: boolean;
  ref?: Ref<SwipeHandle>;
}) {
  const c = useColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  // Объекты анимации и жеста живут всё время жизни карточки — useState с ленивой инициализацией, а не ref
  const [pan] = useState(() => new Animated.ValueXY());
  const [showOverview, setShowOverview] = useState(false);
  const imdb = useImdbRating(item);
  const onSwipeRef = useRef(onSwipe);
  useLayoutEffect(() => {
    onSwipeRef.current = onSwipe;
  });
  const gone = useRef(false);

  const flyOut = (liked: boolean) => {
    if (gone.current) return;
    gone.current = true;
    // Везде JS-драйвер: значение тянется жестом через Animated.event, смешивать с нативным нельзя
    Animated.timing(pan, {
      toValue: { x: (liked ? 1 : -1) * width * 1.5, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => onSwipeRef.current?.(liked));
  };
  const springBack = () => Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();

  useImperativeHandle(ref, () => ({ swipe: flyOut }));

  const threshold = width * 0.28;
  // Обработчики вызываются только во время жеста, не при рендере — ref'ы внутри них читать можно
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      // Короткое касание — тап по карточке (описание); заметный сдвиг вбок забираем у Pressable себе
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > threshold || g.vx > 0.8) flyOut(true);
        else if (g.dx < -threshold || g.vx < -0.8) flyOut(false);
        else springBack();
      },
      onPanResponderTerminate: springBack,
    }),
  );

  const rotate = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-12deg', '0deg', '12deg'] });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pan.x.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const genres = item.genre_ids.map((id) => genreNames[id]).filter(Boolean).slice(0, 3);

  return (
    <Animated.View
      {...(behind ? {} : responder.panHandlers)}
      style={[
        styles.card,
        behind
          ? { transform: [{ scale: 0.95 }, { translateY: 10 }], opacity: 0.6 }
          : { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
      ]}
    >
      <Pressable style={{ flex: 1 }} disabled={behind} onPress={() => setShowOverview((v) => !v)}>
        <View style={{ flex: 1 }}>
          <Poster path={item.poster_path} title={item.title} style={styles.cardPoster} />
          {showOverview && (
            <View style={styles.overview}>
              <Txt style={{ lineHeight: 22 }} numberOfLines={14}>
                {item.overview || 'Описания нет.'}
              </Txt>
            </View>
          )}
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={[styles.stampText, { color: c.success }]}>ХОЧУ</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
            <Text style={[styles.stampText, { color: c.danger }]}>НЕТ</Text>
          </Animated.View>
        </View>
        <View style={{ padding: 14, gap: 2 }}>
          <Txt variant="title" numberOfLines={2}>
            {item.title}
          </Txt>
          <Txt variant="caption" numberOfLines={1}>
            {[item.year, genres.join(', ').toLowerCase(), imdb && `IMDb ${imdb.rating}`].filter(Boolean).join(' · ')}
          </Txt>
          <Txt variant="caption" style={{ color: c.textFaint }}>
            {showOverview ? 'Нажмите, чтобы вернуть постер' : 'Нажмите, чтобы прочитать описание'}
          </Txt>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  stage: { flex: 1, marginHorizontal: 20, marginTop: 16 },
  card: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    overflow: 'hidden',
  },
  cardPoster: { flex: 1, aspectRatio: undefined, borderRadius: 0 },
  overview: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, padding: 18, backgroundColor: c.surface },
  stamp: { position: 'absolute', top: 24, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 3, borderRadius: radius.sm },
  stampLike: { left: 20, borderColor: c.success, transform: [{ rotate: '-12deg' }] },
  stampNope: { right: 20, borderColor: c.danger, transform: [{ rotate: '12deg' }] },
  stampText: { fontFamily: fonts.semibold, fontSize: 26, letterSpacing: 1 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginTop: 20 },
  action: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.bg,
  },
  actionLike: { backgroundColor: c.accent, borderColor: c.accent },
  matchBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  matchBox: { backgroundColor: c.bg, borderRadius: radius.xl, padding: 24 },
}));
