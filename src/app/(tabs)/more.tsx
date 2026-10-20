import { useRouter, type Href } from 'expo-router';
import { ChevronRight, LogOut, MapPin, Settings, Share2 } from 'lucide-react-native';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { APP_NAME } from '@/components/AppHeader';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Card, ScreenTitle, Txt, Screen } from '@/components/ui';
import { colors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function More() {
  const router = useRouter();
  const { couple, signOut } = useAuth();

  const rows: { icon: typeof MapPin; title: string; hint: string; onPress: () => void; danger?: boolean }[] = [
    { icon: MapPin, title: 'Места', hint: 'Куда сходить вдвоём и где уже были', onPress: () => router.push('/places' as Href) },
    {
      icon: Share2,
      title: 'Код пары',
      hint: couple?.invite_code ?? '',
      onPress: () => Share.share({ message: `Код нашей пары в ${APP_NAME}: ${couple?.invite_code}` }),
    },
    { icon: Settings, title: 'Настройки', hint: 'Имя, дата отношений', onPress: () => router.push('/settings') },
    { icon: LogOut, title: 'Выйти', hint: '', onPress: signOut, danger: true },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE }}>
        <ScreenTitle title="Ещё" />
        <Card style={{ padding: 0 }}>
          {rows.map((r, i) => (
            <Pressable
              key={r.title}
              onPress={r.onPress}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                pressed && { backgroundColor: colors.surfaceSoft },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <r.icon size={20} color={r.danger ? colors.danger : colors.accentLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 16, color: r.danger ? colors.danger : colors.text }}>{r.title}</Txt>
                {!!r.hint && <Txt variant="caption">{r.hint}</Txt>}
              </View>
              {!r.danger && <ChevronRight size={18} color={colors.textFaint} />}
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
