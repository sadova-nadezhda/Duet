import { Heart, Link2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME } from '@/components/AppHeader';
import { Button, Card, Divider, FieldLabel, Input, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

/** Экран связки: создать пару и поделиться кодом, или ввести код партнёра */
export default function Pair() {
  const { refresh, signOut, me } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('create_couple');
    setBusy(false);
    if (error) return Alert.alert('Ошибка', error.message);
    await Share.share({ message: `Присоединяйся ко мне в ${APP_NAME} 💜 Код пары: ${data}` });
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
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Txt variant="h1">Привет, {me?.name} 👋</Txt>
      <Txt variant="muted" style={{ marginTop: 8, fontSize: 16 }}>
        Свяжите аккаунты, чтобы видеть общие дела, вишлист и фильмы.
      </Txt>

      <Card style={{ marginTop: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Heart size={20} color={colors.accentLight} />
          <Txt variant="title">Я первый</Txt>
        </View>
        <Txt variant="muted" style={{ marginTop: 6, marginBottom: 16 }}>
          Создайте пару и отправьте код партнёру.
        </Txt>
        <Button label="Создать пару" onPress={create} disabled={busy} />
      </Card>

      <Divider />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Link2 size={20} color={colors.accentLight} />
          <Txt variant="title">У меня есть код</Txt>
        </View>
        <FieldLabel>Код пары</FieldLabel>
        <Input value={code} onChangeText={setCode} placeholder="A1B2C3" autoCapitalize="characters" maxLength={6} />
        <Button label="Присоединиться" variant="ghost" onPress={join} disabled={busy || code.length < 6} style={{ marginTop: 16 }} />
      </Card>

      <Button label="Выйти" variant="ghost" onPress={signOut} style={{ marginTop: 24 }} />
    </SafeAreaView>
  );
}
