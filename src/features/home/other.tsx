import { Bell, ChefHat, ExternalLink, ShoppingCart, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { AssigneeAvatars, CheckCircle, ItemMenu, PersonChips } from '@/components/common';
import { Button, Card, Chip, ChipRow, Empty, FieldLabel, Input, Sheet, Toggle, Txt } from '@/components/ui';
import { WEEKDAYS_SHORT } from '@/lib/dates';
import { colors } from '@/lib/theme';
import type { Recipe, Reminder, ShoppingItem } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const alertErr = (e: any) => Alert.alert('Ошибка', e?.message ?? String(e));

// =================== Напоминания ===================
export const daysLabel = (days: number[]) =>
  days.length === 7
    ? 'Каждый день'
    : days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))
      ? 'По будням'
      : [...days]
          .sort()
          .map((d) => WEEKDAYS_SHORT[d - 1])
          .join(', ');

export function RemindersList({
  rows,
  update,
  remove,
  onEdit,
}: {
  rows: Reminder[];
  update: (id: string, v: Partial<Reminder>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  onEdit: (r: Reminder) => void;
}) {
  return (
    <View>
      <Txt variant="muted" style={{ marginBottom: 16, lineHeight: 21 }}>
        Ежедневные напоминания или по конкретным дням недели — придёт уведомление в выбранное время.
      </Txt>
      {!rows.length && <Empty icon={Bell} title="Нет напоминаний" hint="Например: «Выпить витаминки» каждый день в 09:00" />}
      {rows.map((r) => (
        <Card key={r.id} style={{ marginBottom: 12, paddingVertical: 14 }} onPress={() => onEdit(r)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} color={colors.accentLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="title" style={{ fontSize: 17 }}>
                {r.title}
              </Txt>
              <Txt variant="caption" style={{ marginTop: 2, fontSize: 13 }}>
                {daysLabel(r.days)} · {r.time}
              </Txt>
            </View>
            <AssigneeAvatars assignee={r.assignee} />
            <Toggle value={r.enabled} onChange={(enabled) => update(r.id, { enabled }).catch(alertErr)} />
            <ItemMenu onDelete={() => remove(r.id).catch(alertErr)} />
          </View>
        </Card>
      ))}
    </View>
  );
}

export function ReminderSheet({
  visible,
  onClose,
  editing,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  editing: Reminder | null;
  onSave: (v: Partial<Reminder>) => Promise<unknown>;
}) {
  const { me } = useAuth();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [time, setTime] = useState('09:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

  useEffect(() => {
    if (!visible) return;
    setTitle(editing?.title ?? '');
    setAssignee(editing ? editing.assignee : (me?.id ?? null));
    setTime(editing?.time ?? '09:00');
    setDays(editing?.days ?? [1, 2, 3, 4, 5, 6, 7]);
  }, [visible, editing, me?.id]);

  const toggleDay = (d: number) => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]));
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  // Маска ввода времени HH:MM
  const onTime = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    setTime(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Напоминание' : 'Новое напоминание'}
      footer={
        <Button
          label="Сохранить"
          disabled={!title.trim() || !validTime || !days.length}
          onPress={() =>
            onSave({ title: title.trim(), assignee, time, days: [...days].sort() })
              .then(onClose)
              .catch(alertErr)
          }
        />
      }
    >
      <FieldLabel required>О чём напомнить</FieldLabel>
      <Input value={title} onChangeText={setTitle} placeholder="Выпить витаминки" />
      <FieldLabel>Кому</FieldLabel>
      <PersonChips value={assignee} onChange={setAssignee} />
      <FieldLabel>Время</FieldLabel>
      <ChipRow>
        {['08:00', '09:00', '13:00', '20:00', '22:00'].map((t) => (
          <Chip key={t} label={t} size="sm" selected={time === t} onPress={() => setTime(t)} />
        ))}
      </ChipRow>
      <Input value={time} onChangeText={onTime} keyboardType="number-pad" placeholder="ЧЧ:ММ" style={{ marginTop: 12 }} />
      <FieldLabel>Дни</FieldLabel>
      <ChipRow>
        <Chip label="Каждый день" size="sm" selected={days.length === 7} onPress={() => setDays([1, 2, 3, 4, 5, 6, 7])} />
        {WEEKDAYS_SHORT.map((w, i) => (
          <Chip
            key={w}
            label={w}
            size="sm"
            selected={days.length < 7 && days.includes(i + 1)}
            onPress={() => (days.length === 7 ? setDays([i + 1]) : toggleDay(i + 1))}
          />
        ))}
      </ChipRow>
    </Sheet>
  );
}

// =================== Покупки ===================
export function ShoppingList({
  rows,
  insert,
  update,
  remove,
}: {
  rows: ShoppingItem[];
  insert: (v: Partial<ShoppingItem>) => Promise<unknown>;
  update: (id: string, v: Partial<ShoppingItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const active = rows.filter((r) => !r.checked);
  const bought = rows.filter((r) => r.checked);

  const add = () => {
    const v = title.trim();
    if (!v) return;
    setTitle('');
    insert({ title: v }).catch(alertErr);
  };

  const row = (r: ShoppingItem, i: number, all: ShoppingItem[]) => (
    <View
      key={r.id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        borderBottomWidth: i < all.length - 1 ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <CheckCircle checked={r.checked} onPress={() => update(r.id, { checked: !r.checked }).catch(alertErr)} />
      <Txt style={[{ flex: 1, fontSize: 16 }, r.checked && { color: colors.textFaint, textDecorationLine: 'line-through' }]}>{r.title}</Txt>
      <ItemMenu onDelete={() => remove(r.id).catch(alertErr)} />
    </View>
  );

  return (
    <View>
      <Input
        value={title}
        onChangeText={setTitle}
        placeholder="Добавить продукт и нажать Enter"
        onSubmitEditing={add}
        returnKeyType="done"
        submitBehavior="submit"
      />
      {!rows.length && <Empty icon={ShoppingCart} title="Список пуст" hint="Добавляйте продукты — партнёр увидит их сразу" />}
      <Card style={{ marginTop: 16, paddingVertical: 4, display: rows.length ? 'flex' : 'none' }}>
        {[...active, ...bought].map(row)}
      </Card>
      {bought.length > 0 && (
        <Pressable
          onPress={() => Promise.all(bought.map((b) => remove(b.id))).catch(alertErr)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', marginTop: 16 }}
        >
          <Trash2 size={16} color={colors.textMuted} />
          <Txt variant="muted">Убрать купленное ({bought.length})</Txt>
        </Pressable>
      )}
    </View>
  );
}

// =================== Рецепты ===================
export function RecipesList({
  rows,
  remove,
  onEdit,
}: {
  rows: Recipe[];
  remove: (id: string) => Promise<void>;
  onEdit: (r: Recipe) => void;
}) {
  if (!rows.length) return <Empty icon={ChefHat} title="Рецептов нет" hint="Сохраняйте любимые блюда и ссылки на рецепты" />;
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ChefHat size={20} color={colors.accentLight} />
            <Txt variant="title" style={{ flex: 1 }}>
              {r.title}
            </Txt>
            <ItemMenu onEdit={() => onEdit(r)} onDelete={() => remove(r.id).catch(alertErr)} />
          </View>
          {!!r.notes && (
            <Txt variant="muted" style={{ marginTop: 10, lineHeight: 20 }}>
              {r.notes}
            </Txt>
          )}
          {!!r.url && (
            <Pressable
              onPress={() => Linking.openURL(r.url!)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}
            >
              <ExternalLink size={14} color={colors.accentLight} />
              <Txt style={{ color: colors.accentLight }} numberOfLines={1}>
                Открыть рецепт
              </Txt>
            </Pressable>
          )}
        </Card>
      ))}
    </View>
  );
}

export function RecipeSheet({
  visible,
  onClose,
  editing,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  editing: Recipe | null;
  onSave: (v: Partial<Recipe>) => Promise<unknown>;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (!visible) return;
    setTitle(editing?.title ?? '');
    setUrl(editing?.url ?? '');
    setNotes(editing?.notes ?? '');
  }, [visible, editing]);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Рецепт' : 'Новый рецепт'}
      footer={
        <Button
          label="Сохранить"
          disabled={!title.trim()}
          onPress={() =>
            onSave({ title: title.trim(), url: url.trim() || null, notes: notes.trim() || null })
              .then(onClose)
              .catch(alertErr)
          }
        />
      }
    >
      <FieldLabel required>Название</FieldLabel>
      <Input value={title} onChangeText={setTitle} placeholder="Паста с грибами" />
      <FieldLabel optional>Ссылка</FieldLabel>
      <Input value={url} onChangeText={setUrl} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
      <FieldLabel optional>Ингредиенты и заметки</FieldLabel>
      <Input value={notes} onChangeText={setNotes} placeholder="Что купить, как готовить…" multiline />
    </Sheet>
  );
}
