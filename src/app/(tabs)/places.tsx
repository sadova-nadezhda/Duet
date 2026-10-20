import { MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, View } from 'react-native';
import { CheckCircle, ItemMenu } from '@/components/common';
import { SortableList } from '@/components/SortableList';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Button, Card, Chip, ChipRow, Empty, FieldLabel, Input, Screen, ScreenTitle, Segmented, Sheet, Txt } from '@/components/ui';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Place } from '@/lib/types';

const CATEGORIES = ['Ресторан', 'Кафе', 'Бар', 'Природа', 'Музей', 'Путешествие', 'Активности'];

type Tab = 'want' | 'visited';
const TABS: { key: Tab; label: string }[] = [
  { key: 'want', label: 'Хотим сходить' },
  { key: 'visited', label: 'Были' },
];

const openMap = (q: string) => {
  const query = encodeURIComponent(q);
  Linking.openURL(Platform.OS === 'ios' ? `maps://?q=${query}` : `geo:0,0?q=${query}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`),
  );
};

const alertErr = (e: Error) => Alert.alert('Ошибка', e.message);

/** Ручной порядок, а при равных position — новые сверху */
const byPosition = (a: Place, b: Place) => a.position - b.position || b.created_at.localeCompare(a.created_at);

export default function Places() {
  const c = useColors();
  const places = useCoupleTable<Place>('places', { ascending: false });
  const [tab, setTab] = useState<Tab>('want');
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Tab>('want');

  const listOf = (visited: boolean) => places.rows.filter((p) => p.visited === visited).sort(byPosition);
  const list = listOf(tab === 'visited');
  /** position, при котором место окажется первым в своей вкладке */
  const topPosition = (visited: boolean) => Math.min(0, ...listOf(visited).map((p) => p.position)) - 1;

  const openForm = (p: Place | null) => {
    setEditing(p);
    setTitle(p?.title ?? '');
    setCategory(p?.category ?? null);
    setAddress(p?.address ?? '');
    setNote(p?.note ?? '');
    setStatus(p ? (p.visited ? 'visited' : 'want') : tab);
    setOpen(true);
  };

  const save = () => {
    const visited = status === 'visited';
    const values = { title: title.trim(), category, address: address.trim() || null, note: note.trim() || null, visited };
    const req = editing
      ? places.update(editing.id, editing.visited === visited ? values : { ...values, position: topPosition(visited) })
      : places.insert({ ...values, position: topPosition(visited) });
    req
      .then(() => {
        setOpen(false);
        setTab(status);
      })
      .catch(alertErr);
  };

  const toggleVisited = (p: Place) => places.update(p.id, { visited: !p.visited, position: topPosition(!p.visited) }).catch(alertErr);

  const reorder = (next: Place[]) => {
    const pos = new Map(next.map((p, i) => [p.id, i]));
    places.setRows((rows) => rows.map((r) => (pos.has(r.id) ? { ...r, position: pos.get(r.id)! } : r)));
    Promise.all(
      next
        .filter((p, i) => p.position !== i)
        .map((p) =>
          supabase
            .from('places')
            .update({ position: pos.get(p.id)! })
            .eq('id', p.id)
            .then(({ error }) => {
              if (error) throw error;
            }),
        ),
    ).catch((e) => {
      places.reload();
      alertErr(e);
    });
  };

  return (
    <Screen>
      <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE }}>
        <ScreenTitle title="Места" onAdd={() => openForm(null)} />
        <Segmented value={tab} onChange={setTab} items={TABS} />
        {!list.length && <Empty title={tab === 'want' ? 'Список пуст' : 'Пока нигде не были'} hint="Сохраняйте кафе, парки и поездки" />}
        {list.length > 1 && (
          <Txt variant="caption" style={{ color: c.textFaint, marginTop: 12, marginBottom: 10 }}>
            Чтобы поменять порядок, зажмите карточку и перетащите
          </Txt>
        )}
        {list.length === 1 && <View style={{ height: 16 }} />}
        <SortableList
          data={list}
          keyOf={(p) => p.id}
          onReorder={reorder}
          onDragChange={setDragging}
          gap={10}
          renderItem={(p, isDragging) => (
            <Card style={isDragging && { borderWidth: 1, borderColor: c.accent, padding: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <View style={{ paddingTop: 1 }}>
                  <CheckCircle checked={p.visited} onPress={() => toggleVisited(p)} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Txt variant="title" style={{ flex: 1 }}>
                      {p.title}
                    </Txt>
                    <ItemMenu title={p.title} onEdit={() => openForm(p)} onDelete={() => places.remove(p.id).catch(alertErr)} />
                  </View>
                  {(!!p.category || !!p.address) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {!!p.category && <Chip label={p.category} size="sm" tone="accent" />}
                      {!!p.address && <Chip label={p.address} size="sm" icon={MapPin} onPress={() => openMap(p.address!)} />}
                    </View>
                  )}
                  {!!p.note && (
                    <Txt variant="muted" style={{ marginTop: 8 }}>
                      {p.note}
                    </Txt>
                  )}
                </View>
              </View>
            </Card>
          )}
        />
      </ScrollView>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Редактировать' : 'Новое место'}
        footer={<Button label={editing ? 'Сохранить' : 'Добавить'} disabled={!title.trim()} onPress={save} />}
      >
        <FieldLabel required>Название</FieldLabel>
        <Input value={title} onChangeText={setTitle} placeholder="Например, кофейня на набережной" />
        <FieldLabel>Статус</FieldLabel>
        <Segmented value={status} onChange={setStatus} items={TABS} />
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
    </Screen>
  );
}
