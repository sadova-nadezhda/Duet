import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Navigation } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, ItemMenu } from '@/components/common';
import { AddButton, Button, Card, Chip, ChipRow, Empty, FieldLabel, IconButton, Input, Segmented, Sheet, Txt } from '@/components/ui';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { colors } from '@/lib/theme';
import type { Place } from '@/lib/types';

const CATEGORIES = ['Ресторан', 'Кафе', 'Бар', 'Природа', 'Музей', 'Путешествие', 'Активности'];

const openMap = (q: string) => {
  const query = encodeURIComponent(q);
  Linking.openURL(Platform.OS === 'ios' ? `maps://?q=${query}` : `geo:0,0?q=${query}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`),
  );
};

export default function Places() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const places = useCoupleTable<Place>('places', { ascending: false });
  const [tab, setTab] = useState<'want' | 'visited'>('want');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const list = places.rows.filter((p) => p.visited === (tab === 'visited'));

  const save = () =>
    places
      .insert({ title: title.trim(), category, address: address.trim() || null, note: note.trim() || null })
      .then(() => {
        setOpen(false);
        setTitle('');
        setCategory(null);
        setAddress('');
        setNote('');
      })
      .catch((e) => Alert.alert('Ошибка', e.message));

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton icon={ChevronLeft} onPress={() => router.back()} color={colors.text} />
            <Txt variant="h2">Места</Txt>
          </View>
          <AddButton onPress={() => setOpen(true)} />
        </View>
        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { key: 'want', label: 'Хотим сходить' },
            { key: 'visited', label: 'Были' },
          ]}
        />
        <View style={{ height: 16 }} />
        {!list.length && (
          <Empty icon={MapPin} title={tab === 'want' ? 'Список пуст' : 'Пока нигде не были'} hint="Сохраняйте кафе, парки и поездки" />
        )}
        {list.map((p) => (
          <Card key={p.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <CheckCircle checked={p.visited} onPress={() => places.update(p.id, { visited: !p.visited })} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Txt variant="title" style={{ flex: 1 }}>
                    {p.title}
                  </Txt>
                  <ItemMenu onDelete={() => places.remove(p.id)} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {p.category && <Chip label={p.category} size="sm" tone="accent" />}
                  {p.address && <Chip label={p.address} size="sm" icon={Navigation} onPress={() => openMap(p.address!)} />}
                </View>
                {!!p.note && (
                  <Txt variant="muted" style={{ marginTop: 8 }}>
                    {p.note}
                  </Txt>
                )}
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Новое место"
        footer={<Button label="Добавить" disabled={!title.trim()} onPress={save} />}
      >
        <FieldLabel required>Название</FieldLabel>
        <Input value={title} onChangeText={setTitle} placeholder="Например, кофейня на набережной" />
        <FieldLabel optional>Тип</FieldLabel>
        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} size="sm" selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
          ))}
        </ChipRow>
        <FieldLabel optional>Адрес</FieldLabel>
        <Input value={address} onChangeText={setAddress} placeholder="Улица, город" />
        <FieldLabel optional>Заметка</FieldLabel>
        <Input value={note} onChangeText={setNote} placeholder="Что заказать, когда лучше идти…" multiline />
      </Sheet>
    </View>
  );
}
