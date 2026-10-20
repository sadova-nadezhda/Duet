import { useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME } from '@/components/AppHeader';
import { Button, Divider, FieldLabel, Input, PersonMark, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

/** Экран связки: создать пару и поделиться кодом, или ввести код партнёра */
export default function Pair() {
  const { refresh, signOut, me } = useAuth();
  const c = useColors();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('create_couple');
    setBusy(false);
    if (error) return Alert.alert('Ошибка', error.message);
    await Share.share({ message: `Присоединяйся ко мне в ${APP_NAME}. Код пары: ${data}` });
    refresh();
  };

  const join = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('join_couple', { code });
    setBusy(false);
    if (error) return Alert.alert('Ошибка', error.message);
    refresh();
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: c.bg }}>
      <Txt variant="h1">Привет, {me?.name}</Txt>
      <Txt variant="muted" style={{ marginTop: 8, fontSize: 16 }}>
        Свяжите аккаунты, чтобы видеть общие дела, желания и фильмы.
      </Txt>

      <View style={{ marginTop: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PersonMark mine />
          <Txt variant="title">Создать пару</Txt>
        </View>
        <Txt variant="muted" style={{ marginTop: 4, marginBottom: 14 }}>
          Получите код и отправьте его партнёру.
        </Txt>
        <Button label="Создать пару" onPress={create} disabled={busy} />
      </View>

      <Divider />

      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PersonMark mine={false} />
          <Txt variant="title">Ввести код партнёра</Txt>
        </View>
        <FieldLabel>Код пары</FieldLabel>
        <Input value={code} onChangeText={setCode} placeholder="A1B2C3" autoCapitalize="characters" maxLength={6} />
        <Button label="Присоединиться" variant="ghost" onPress={join} disabled={busy || code.length < 6} style={{ marginTop: 12 }} />
      </View>

      <Pressable onPress={signOut} style={{ marginTop: 32, alignSelf: 'flex-start' }} hitSlop={8}>
        <Txt variant="muted" style={{ textDecorationLine: 'underline' }}>
          Выйти из аккаунта
        </Txt>
      </Pressable>
    </SafeAreaView>
  );
}
