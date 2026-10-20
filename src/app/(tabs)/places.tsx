import { MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, View } from 'react-native';
import { ItemMenu } from '@/components/common';
import { SortableList } from '@/components/SortableList';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Card, Chip, Empty, Screen, ScreenTitle, Txt } from '@/components/ui';
import { PlaceSheet, topPlacePosition, type PlaceDraft } from '@/features/places/PlaceSheet';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Place } from '@/lib/types';

const openMap = (q: string) => {
  const query = encodeURIComponent(q);
  Linking.openURL(Platform.OS === 'ios' ? `maps://?q=${query}` : `geo:0,0?q=${query}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`),
  );
};

const alertErr = (e: Error) => Alert.alert('Ошибка', e.message);

/** Ручной порядок, а при равных position — новые сверху */
const byPosition = (a: Place, b: Place) => a.position - b.position || b.created_at.localeCompare(a.created_at);

/**
 * История: где пара уже была. Планы «куда поехать» живут в «Желаниях → Поездки».
 * Старые записи с visited = false здесь не показываются.
 */
export default function Places() {
  const c = useColors();
  const places = useCoupleTable<Place>('places', { ascending: false });
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);

  const list = places.rows.filter((p) => p.visited).sort(byPosition);

  const openForm = (p: Place | null) => {
    setEditing(p);
    setOpen(true);
  };

  const save = (v: PlaceDraft) =>
    editing ? places.update(editing.id, v) : places.insert({ ...v, visited: true, position: topPlacePosition(places.rows) });

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
        <ScreenTitle title="Места" count={list.length || undefined} onAdd={() => openForm(null)} />
        <Txt variant="muted" style={{ marginTop: -8 }}>
          Где мы уже были вместе
        </Txt>
        {!list.length && (
          <Empty title="Пока пусто" hint="Добавляйте кафе, концерты и поездки, где побывали. Планы — в «Желаниях → Поездки»" />
        )}
        {list.length > 1 && (
          <Txt variant="caption" style={{ color: c.textFaint, marginTop: 4 }}>
            Чтобы поменять порядок, зажмите карточку и перетащите
          </Txt>
        )}
        <View style={{ height: 16 }} />
        <SortableList
          data={list}
          keyOf={(p) => p.id}
          onReorder={reorder}
          onDragChange={setDragging}
          gap={10}
          renderItem={(p, isDragging) => (
            <Card style={isDragging && { borderWidth: 1, borderColor: c.accent, padding: 15 }}>
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
            </Card>
          )}
        />
      </ScrollView>

      <PlaceSheet
        visible={open}
        onClose={() => setOpen(false)}
        initial={editing}
        title={editing ? 'Редактировать' : 'Где мы были'}
        submitLabel={editing ? 'Сохранить' : 'Добавить'}
        onSave={save}
      />
    </Screen>
  );
}
