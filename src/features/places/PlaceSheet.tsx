import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Chip, ChipRow, FieldLabel, Input, Sheet } from '@/components/ui';
import type { Place } from '@/lib/types';

export const PLACE_CATEGORIES = ['Ресторан', 'Кафе', 'Бар', 'Природа', 'Музей', 'Путешествие', 'Активности'];

export type PlaceDraft = Pick<Place, 'title' | 'category' | 'address' | 'note'>;

/** position, при котором новое место окажется первым в истории */
export const topPlacePosition = (rows: Place[]) => Math.min(0, ...rows.filter((p) => p.visited).map((p) => p.position)) - 1;

/** Форма места в истории. initial — чем заполнить поля при открытии (редактирование или выполненная поездка). */
export function PlaceSheet({
  visible,
  onClose,
  initial,
  title: sheetTitle,
  submitLabel,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initial: Partial<PlaceDraft> | null;
  title: string;
  submitLabel: string;
  onSave: (v: PlaceDraft) => Promise<unknown>;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? '');
    setCategory(initial?.category ?? null);
    setAddress(initial?.address ?? '');
    setNote(initial?.note ?? '');
  }, [visible, initial]);

  const save = () =>
    onSave({ title: title.trim(), category, address: address.trim() || null, note: note.trim() || null })
      .then(onClose)
      .catch((e) => Alert.alert('Ошибка', e.message));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={sheetTitle}
      footer={<Button label={submitLabel} disabled={!title.trim()} onPress={save} />}
    >
      <FieldLabel required>Название</FieldLabel>
      <Input value={title} onChangeText={setTitle} placeholder="Например, концерт или поездка 2024" />
      <FieldLabel optional>Тип</FieldLabel>
      <ChipRow>
        {PLACE_CATEGORIES.map((cat) => (
          <Chip key={cat} label={cat} size="sm" selected={category === cat} onPress={() => setCategory(category === cat ? null : cat)} />
        ))}
      </ChipRow>
      <FieldLabel optional>Адрес или город</FieldLabel>
      <Input value={address} onChangeText={setAddress} placeholder="Улица, город" />
      <FieldLabel optional>Заметка</FieldLabel>
      <Input value={note} onChangeText={setNote} placeholder="С кем были, что запомнилось…" multiline />
    </Sheet>
  );
}
