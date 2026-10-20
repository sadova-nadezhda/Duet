import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useColors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, ICON_STROKE } from './ui';

export const APP_NAME = 'Duo';

export function Logo({ size = 20 }: { size?: number }) {
  const c = useColors();
  return <Text style={{ color: c.text, fontFamily: fonts.medium, fontSize: size, letterSpacing: -size * 0.03 }}>{APP_NAME}</Text>;
}

/** Шапка: слово-логотип, пара аватаров (я — заливка, партнёр — контур) и шестерёнка; и то и другое ведёт в настройки */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const { me, partner } = useAuth();
  const openSettings = () => router.push('/settings');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        backgroundColor: c.bg,
      }}
    >
      <Logo size={24} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable
          onPress={openSettings}
          hitSlop={8}
          accessibilityLabel="Профиль"
          style={({ pressed }) => [{ flexDirection: 'row' }, pressed && { opacity: 0.6 }]}
        >
          <Avatar name={me?.name ?? ''} url={me?.avatar_url} size={34} />
          <View style={{ marginLeft: -10 }}>
            <Avatar name={partner?.name ?? '+'} url={partner?.avatar_url} size={34} dim />
          </View>
        </Pressable>
        {/* Без рамки-кнопки вокруг: правый край иконки совпадает с краем контента (и с «+» ниже) */}
        <Pressable
          onPress={openSettings}
          hitSlop={12}
          accessibilityLabel="Настройки"
          style={({ pressed }) => pressed && { opacity: 0.5 }}
        >
          <Settings size={26} color={c.text} strokeWidth={ICON_STROKE} />
        </Pressable>
      </View>
    </View>
  );
}
