import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME } from '@/components/AppHeader';
import { MonthCalendar } from '@/components/MonthCalendar';
import { PhotoField } from '@/components/PhotoField';
import { Button, Card, FieldLabel, IconButton, Input, Txt } from '@/components/ui';
import { humanDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { deletePhoto } from '@/lib/upload';
import { colors, fonts } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { me, couple, partner, refresh, signOut } = useAuth();
  const [name, setName] = useState(me?.name ?? '');
  const [avatar, setAvatar] = useState(me?.avatar_url ?? '');
  const [since, setSince] = useState<string | null>(couple?.together_since ?? null);

  useEffect(() => {
    setName(me?.name ?? '');
    setAvatar(me?.avatar_url ?? '');
  }, [me]);

  const save = async () => {
    const [a, b] = await Promise.all([
      supabase
        .from('profiles')
        .update({ name: name.trim() || 'Я', avatar_url: avatar.trim() || null })
        .eq('id', me!.id),
      supabase.from('couples').update({ together_since: since }).eq('id', couple!.id),
    ]);
    const err = a.error ?? b.error;
    if (err) return Alert.alert('Ошибка', err.message);
    if ((me?.avatar_url ?? '') !== avatar.trim()) deletePhoto(me?.avatar_url);
    await refresh();
    router.back();
  };

  /** Закрыли без сохранения — только что загруженное фото больше не нужно */
  const close = () => {
    if ((me?.avatar_url ?? '') !== avatar.trim()) deletePhoto(avatar.trim());
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top || 16 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt variant="h2">Настройки</Txt>
          <IconButton icon={X} onPress={close} color={colors.text} />
        </View>

        <FieldLabel>Ваше имя</FieldLabel>
        <Input value={name} onChangeText={setName} />
        <FieldLabel optional>Фото</FieldLabel>
        <PhotoField value={avatar} onChange={setAvatar} square />

        <FieldLabel>Вместе с</FieldLabel>
        <Txt variant="muted">{since ? humanDate(since) + ' ' + since.slice(0, 4) : 'Не указано'}</Txt>
        <MonthCalendar value={since} onChange={setSince} />

        <Card style={{ marginTop: 24 }}>
          <Txt variant="label">Код пары</Txt>
          <Txt style={{ fontFamily: fonts.extrabold, fontSize: 28, letterSpacing: 4, marginTop: 6 }}>{couple?.invite_code}</Txt>
          <Txt variant="muted" style={{ marginTop: 4 }}>
            {partner ? `Вы связаны с ${partner.name} 💜` : 'Отправьте код партнёру, чтобы он присоединился'}
          </Txt>
          {!partner && (
            <Button
              label="Поделиться кодом"
              variant="ghost"
              style={{ marginTop: 12 }}
              onPress={() => Share.share({ message: `Присоединяйся ко мне в ${APP_NAME} 💜 Код пары: ${couple?.invite_code}` })}
            />
          )}
        </Card>

        <Button label="Сохранить" onPress={save} style={{ marginTop: 24 }} />
        <Button label="Выйти из аккаунта" variant="danger" onPress={signOut} style={{ marginTop: 12 }} />
      </ScrollView>
    </View>
  );
}
