import { useRouter } from 'expo-router';
import { Heart, Settings } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, IconButton } from './ui';

export const APP_NAME = 'Duet';

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <Text style={{ color: colors.text, fontFamily: fonts.extrabold, fontSize: size, letterSpacing: -0.5 }}>{APP_NAME}</Text>
      <Heart size={size * 0.38} color={colors.accent} fill={colors.accent} style={{ marginLeft: 2, marginTop: 2 }} />
    </View>
  );
}

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { me, partner } = useAuth();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Logo />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          <Avatar name={me?.name ?? ''} url={me?.avatar_url} size={44} />
          <View style={{ marginLeft: -12 }}>
            <Avatar name={partner?.name ?? '+'} url={partner?.avatar_url} size={44} dim={!partner} />
          </View>
        </View>
        <IconButton icon={Settings} size={48} color={colors.accentLight} onPress={() => router.push('/settings')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(17,12,24,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
