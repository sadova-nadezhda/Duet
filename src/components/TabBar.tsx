import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Clapperboard, Gift, Heart, House, MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, makeStyles, useColors } from '@/lib/theme';
import { ICON_STROKE } from './ui';

const ITEMS: Record<string, { label: string; icon: typeof House }> = {
  home: { label: 'Дом', icon: House },
  wishlist: { label: 'Желания', icon: Gift },
  us: { label: 'Мы', icon: Heart },
  movies: { label: 'Кино', icon: Clapperboard },
  places: { label: 'Места', icon: MapPin },
};

const ICON = 22;
const ACTIVE_SCALE = 28 / ICON;

/** Бар стоит в потоке под контентом, поэтому снизу нужен только обычный отступ */
export const TAB_BAR_SPACE = 40;

/** Плоская полоса: тонкая иконка и подпись; активная вкладка — крупнее и цветом акцента */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const reduceMotion = useReduceMotion();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, i) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === i;
        const onPress = () => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };
        return <TabItem key={route.key} {...item} focused={focused} onPress={onPress} reduceMotion={reduceMotion} />;
      })}
    </View>
  );
}

function TabItem({
  label,
  icon: Icon,
  focused,
  onPress,
  reduceMotion,
}: {
  label: string;
  icon: typeof House;
  focused: boolean;
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const s = useStyles();
  const c = useColors();
  // 0 — неактивна, 1 — активна; от него зависят и размер, и цвет
  const p = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      p.setValue(focused ? 1 : 0);
      return;
    }
    // Цвет подписи анимируется только без нативного драйвера, поэтому весь переход на JS — элементов всего пять
    Animated.spring(p, { toValue: focused ? 1 : 0, useNativeDriver: false, friction: 6, tension: 140 }).start();
  }, [focused, reduceMotion, p]);

  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, ACTIVE_SCALE] });
  // Пружина перелетает за 1 — цвет не должен уходить за пределы, поэтому clamp
  const activeOpacity = p.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const idleOpacity = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' });
  const labelColor = p.interpolate({ inputRange: [0, 1], outputRange: [c.textMuted, c.accentLight], extrapolate: 'clamp' });

  return (
    <Pressable onPress={onPress} style={s.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}>
      <View style={s.iconBox}>
        <Animated.View style={{ transform: [{ scale }] }}>
          {/* Цвет svg-иконки не анимируется, поэтому две иконки поверх друг друга меняются прозрачностью */}
          <Animated.View style={{ opacity: idleOpacity }}>
            <Icon size={ICON} color={c.textMuted} strokeWidth={ICON_STROKE} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: activeOpacity }]}>
            <Icon size={ICON} color={c.accentLight} strokeWidth={ICON_STROKE} />
          </Animated.View>
        </Animated.View>
      </View>
      <Animated.Text style={[s.label, { color: labelColor }, focused && s.labelActive]}>{label}</Animated.Text>
    </Pressable>
  );
}

/** Системная настройка «Уменьшение движения» */
function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

const useStyles = makeStyles((c) => ({
  bar: { flexDirection: 'row', backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border },
  item: { flex: 1, alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  // Высота с запасом под увеличенную иконку, чтобы подписи не прыгали
  iconBox: { height: 30, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  labelActive: { fontFamily: fonts.medium },
}));
