import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Clapperboard, Ellipsis, Heart, House, Sparkles } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, gradients } from '@/lib/theme';

const ITEMS: Record<string, { label: string; icon: typeof House }> = {
  home: { label: 'Дом', icon: House },
  wishlist: { label: 'Вишлист', icon: Sparkles },
  us: { label: 'Мы', icon: Heart },
  movies: { label: 'Кино', icon: Clapperboard },
  more: { label: 'Ещё', icon: Ellipsis },
};

export const TAB_BAR_SPACE = 120; // отступ снизу у контента, чтобы бар его не перекрывал

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const item = ITEMS[route.name];
          if (!item) return null;
          const focused = state.index === i;
          const onPress = () => {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          const Icon = item.icon;

          if (route.name === 'us') {
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.item}>
                <View style={styles.centerShadow}>
                  <LinearGradient colors={gradients.fab} style={styles.center}>
                    <Heart size={30} color="#fff" fill={focused ? '#fff' : 'transparent'} strokeWidth={2.2} />
                  </LinearGradient>
                </View>
                <Text style={[styles.label, { marginTop: 4 }, focused && styles.labelActive]}>{item.label}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item}>
              <View style={[styles.iconWrap, focused && styles.iconActive]}>
                <Icon size={24} color={focused ? colors.accentLight : colors.textMuted} />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 82,
    paddingBottom: 10,
    borderRadius: 26,
    backgroundColor: 'rgba(30,22,38,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  iconWrap: { width: 60, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.accentSoft },
  label: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textMuted, marginTop: 4 },
  labelActive: { color: colors.accentLight, fontFamily: fonts.bold },
  centerShadow: {
    marginTop: -40,
    borderRadius: 40,
    shadowColor: colors.accent,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  center: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
  },
});
