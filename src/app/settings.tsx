import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME } from '@/components/AppHeader';
import { MonthCalendar } from '@/components/MonthCalendar';
import { PhotoField } from '@/components/PhotoField';
import { Button, FieldLabel, IconButton, Input, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { deletePhoto } from '@/lib/upload';
import { fonts, useColors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
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
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top || 16 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16 }}>
          <Txt variant="h1">Настройки</Txt>
          <IconButton icon={X} onPress={close} />
        </View>

        <FieldLabel>Ваше имя</FieldLabel>
        <Input value={name} onChangeText={setName} />
        <FieldLabel optional>Фото</FieldLabel>
        <PhotoField value={avatar} onChange={setAvatar} square />

        <FieldLabel>Вместе с</FieldLabel>
        {/* Выбранная дата видна в календаре, отдельной строкой — только подсказка, пока её нет */}
        {!since && <Txt variant="muted">Выберите день в календаре</Txt>}
        <MonthCalendar value={since} onChange={setSince} />

        <View style={{ marginTop: 36, paddingVertical: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border }}>
          <Txt variant="label">Код пары</Txt>
          <Txt style={{ fontFamily: fonts.light, fontSize: 40, lineHeight: 48, letterSpacing: 6, marginTop: 10 }}>{couple?.invite_code}</Txt>
          <Txt variant="muted" style={{ marginTop: 10 }}>
            {partner ? `Аккаунты связаны: вы и ${partner.name}` : 'Отправьте код партнёру, чтобы связать аккаунты'}
          </Txt>
          {!partner && (
            <Button
              label="Отправить код"
              variant="ghost"
              style={{ marginTop: 16 }}
              onPress={() => Share.share({ message: `Присоединяйся ко мне в ${APP_NAME}. Код пары: ${couple?.invite_code}` })}
            />
          )}
        </View>

        <Button label="Сохранить" onPress={save} style={{ marginTop: 32 }} />
        <Button label="Выйти из аккаунта" variant="danger" onPress={signOut} style={{ marginTop: 12 }} />
      </ScrollView>
    </View>
  );
}
