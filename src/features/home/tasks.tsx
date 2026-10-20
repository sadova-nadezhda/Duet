import { CheckCheck, ChevronDown, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { AssigneeAvatars, CheckCircle, ItemMenu, PersonChips, Reactions } from '@/components/common';
import { MonthCalendar } from '@/components/MonthCalendar';
import { Button, Card, Chip, ChipRow, Divider, Empty, FieldLabel, Input, Segmented, Sheet, Txt } from '@/components/ui';
import { addDays, humanDate, nextWeekend, parseISODate, relativeDay, toISODate, WEEKDAYS_SHORT } from '@/lib/dates';
import { colors } from '@/lib/theme';
import type { Task, TaskKind } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const ROOMS = ['Кухня', 'Ванная', 'Спальня', 'Гостиная', 'Прихожая', 'Балкон'];
const WEEKDAY_FULL_ACC = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ---------- Логика повторов ----------
const todayISO = () => toISODate(new Date());

/** Дата последнего наступления дня недели (сегодня или раньше) */
const lastWeekdayOccurrence = (weekday: number) => {
  const d = new Date();
  const js = weekday % 7;
  const back = (d.getDay() - js + 7) % 7;
  return toISODate(addDays(d, -back));
};

export function isTaskChecked(t: Task) {
  if (t.kind === 'once') return t.done;
  if (t.kind === 'weekly') return Boolean(t.weekday && t.last_done && t.last_done >= lastWeekdayOccurrence(t.weekday));
  return false; // monthly: при выполнении дата сдвигается вперёд
}

export function scheduleLabel(t: Task) {
  const parts: string[] = [];
  if (t.kind === 'once' && t.due_date) parts.push(relativeDay(t.due_date));
  if (t.kind === 'weekly' && t.weekday) parts.push(`Каждый ${WEEKDAY_FULL_ACC[t.weekday - 1]}`);
  if (t.kind === 'monthly') {
    parts.push(t.every_n_months > 1 ? `Раз в ${t.every_n_months} мес.` : 'Каждый месяц');
    if (t.due_date) parts.push(humanDate(t.due_date));
  }
  if (t.remind_days_before != null)
    parts.push(t.remind_days_before === 0 ? 'напомнить в день' : `напомнить за ${t.remind_days_before} дн.`);
  return parts.join(' · ');
}

export function completeTask(t: Task): Partial<Task> {
  if (t.kind === 'once') return { done: !t.done };
  if (t.kind === 'weekly') return { last_done: isTaskChecked(t) ? null : todayISO() };
  // monthly — переносим на следующий период
  const base = t.due_date ? parseISODate(t.due_date) : new Date();
  const next = new Date(base.getFullYear(), base.getMonth() + (t.every_n_months || 1), base.getDate());
  return { due_date: toISODate(next), last_done: todayISO() };
}

// ---------- Карточка дела ----------
function TaskCard({
  task,
  onUpdate,
  onDelete,
  onEdit,
}: {
  task: Task;
  onUpdate: (v: Partial<Task>) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const checked = isTaskChecked(task);
  const schedule = scheduleLabel(task);
  return (
    <Card style={{ marginBottom: 14, opacity: checked ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <CheckCircle checked={checked} onPress={() => onUpdate(completeTask(task))} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt variant="title" style={[{ flex: 1, fontSize: 19 }, checked && { textDecorationLine: 'line-through' }]}>
              {task.title}
            </Txt>
            <AssigneeAvatars assignee={task.assignee} />
            <ItemMenu onEdit={onEdit} onDelete={onDelete} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {task.kind !== 'once' && <Chip label="повтор" size="sm" tone="accent" />}
            {task.place && <Chip label={task.place} size="sm" icon={MapPin} />}
            {!!schedule && <Chip label={schedule} size="sm" />}
          </View>
          <Reactions value={task.reactions} onChange={(reactions) => onUpdate({ reactions })} />
        </View>
      </View>
    </Card>
  );
}

// ---------- Список ----------
export function TasksList({
  tasks,
  update,
  remove,
  onEdit,
}: {
  tasks: Task[];
  update: (id: string, v: Partial<Task>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  onEdit: (t: Task) => void;
}) {
  const [showDone, setShowDone] = useState(false);
  const once = tasks.filter((t) => t.kind === 'once' && !t.done).sort(byDue);
  const recurring = tasks.filter((t) => t.kind !== 'once');
  const done = tasks.filter((t) => t.kind === 'once' && t.done);
  const safe = (p: Promise<unknown>) => p.catch((e) => Alert.alert('Ошибка', e.message));

  if (!tasks.length) return <Empty icon={CheckCheck} title="Дел пока нет" hint="Нажмите «+», чтобы добавить первое общее дело" />;

  const render = (t: Task) => (
    <TaskCard key={t.id} task={t} onEdit={() => onEdit(t)} onUpdate={(v) => safe(update(t.id, v))} onDelete={() => safe(remove(t.id))} />
  );

  return (
    <View>
      {once.length > 0 && (
        <>
          <Txt variant="label" style={{ marginBottom: 12 }}>
            Разовые
          </Txt>
          {once.map(render)}
        </>
      )}
      {recurring.length > 0 && (
        <>
          {once.length > 0 && <Divider />}
          <Txt variant="label" style={{ marginBottom: 12 }}>
            Повторяющиеся
          </Txt>
          {recurring.map(render)}
        </>
      )}
      {done.length > 0 && (
        <>
          <Pressable
            onPress={() => setShowDone(!showDone)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12 }}
          >
            <Txt variant="label">Выполнено · {done.length}</Txt>
            <ChevronDown size={16} color={colors.textMuted} style={{ transform: [{ rotate: showDone ? '180deg' : '0deg' }] }} />
          </Pressable>
          {showDone && done.map(render)}
        </>
      )}
    </View>
  );
}

const byDue = (a: Task, b: Task) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');

// ---------- Форма «Добавить дело» ----------
type Draft = {
  title: string;
  place: string | null;
  assignee: string | null;
  kind: TaskKind;
  due_date: string | null;
  weekday: number | null;
  every_n_months: number;
  remind: string;
};

const emptyDraft = (me: string | null): Draft => ({
  title: '',
  place: null,
  assignee: me,
  kind: 'once',
  due_date: null,
  weekday: null,
  every_n_months: 1,
  remind: '',
});

export function TaskSheet({
  visible,
  onClose,
  editing,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  editing: Task | null;
  onSave: (v: Partial<Task>) => Promise<unknown>;
}) {
  const { me } = useAuth();
  const [d, setD] = useState<Draft>(emptyDraft(me?.id ?? null));
  const [customPlace, setCustomPlace] = useState('');
  const [showCal, setShowCal] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setD({
        title: editing.title,
        place: editing.place,
        assignee: editing.assignee,
        kind: editing.kind,
        due_date: editing.due_date,
        weekday: editing.weekday,
        every_n_months: editing.every_n_months,
        remind: editing.remind_days_before == null ? '' : String(editing.remind_days_before),
      });
      setCustomPlace(editing.place && !ROOMS.includes(editing.place) ? editing.place : '');
    } else {
      setD(emptyDraft(me?.id ?? null));
      setCustomPlace('');
    }
    setShowCal(false);
  }, [visible, editing, me?.id]);

  const quickDates = [
    { label: 'Без срока', value: null },
    { label: 'Сегодня', value: toISODate(new Date()) },
    { label: 'Завтра', value: toISODate(addDays(new Date(), 1)) },
    { label: 'На выходных', value: toISODate(nextWeekend()) },
  ];
  const isQuick = quickDates.some((q) => q.value === d.due_date);

  const valid = d.title.trim() && (d.kind !== 'weekly' || d.weekday) && (d.kind !== 'monthly' || d.due_date);

  const save = async () => {
    const remind = d.remind.trim() === '' ? null : Math.max(0, parseInt(d.remind, 10) || 0);
    try {
      await onSave({
        title: d.title.trim(),
        place: customPlace.trim() || d.place,
        assignee: d.assignee,
        kind: d.kind,
        due_date: d.kind === 'weekly' ? null : d.due_date,
        weekday: d.kind === 'weekly' ? d.weekday : null,
        every_n_months: d.kind === 'monthly' ? d.every_n_months : 1,
        remind_days_before: remind,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Изменить дело' : 'Добавить дело'}
      footer={<Button label={editing ? 'Сохранить' : 'Добавить'} onPress={save} disabled={!valid} />}
    >
      <FieldLabel required>Что сделать</FieldLabel>
      <Input value={d.title} onChangeText={(v) => set('title', v)} placeholder="Например, почистить вытяжку" autoFocus={!editing} />

      <FieldLabel optional>Где</FieldLabel>
      <ChipRow scroll>
        {ROOMS.map((r) => (
          <Chip
            key={r}
            label={r}
            size="lg"
            selected={d.place === r && !customPlace}
            onPress={() => {
              set('place', d.place === r ? null : r);
              setCustomPlace('');
            }}
          />
        ))}
      </ChipRow>
      <Input value={customPlace} onChangeText={setCustomPlace} placeholder="…или свой вариант" style={{ marginTop: 12 }} />

      <FieldLabel optional>Кто сделает</FieldLabel>
      <PersonChips value={d.assignee} onChange={(v) => set('assignee', v)} />

      <FieldLabel>Тип задачи</FieldLabel>
      <Segmented
        value={d.kind}
        onChange={(k) => set('kind', k)}
        items={[
          { key: 'once', label: 'Разовое' },
          { key: 'weekly', label: 'Неделя' },
          { key: 'monthly', label: 'Раз в N мес.' },
        ]}
      />

      {d.kind === 'once' && (
        <>
          <FieldLabel optional>Когда</FieldLabel>
          <ChipRow>
            {quickDates.map((q) => (
              <Chip
                key={q.label}
                label={q.label}
                size="sm"
                selected={d.due_date === q.value && !showCal}
                onPress={() => (set('due_date', q.value), setShowCal(false))}
              />
            ))}
            <Chip
              label={d.due_date && !isQuick ? humanDate(d.due_date) : '+ Выбрать дату'}
              size="sm"
              selected={showCal || (!!d.due_date && !isQuick)}
              onPress={() => setShowCal(!showCal)}
            />
          </ChipRow>
          {showCal && <MonthCalendar value={d.due_date} onChange={(v) => set('due_date', v)} />}
        </>
      )}

      {d.kind === 'weekly' && (
        <>
          <FieldLabel>День недели</FieldLabel>
          <ChipRow>
            {WEEKDAYS_SHORT.map((w, i) => (
              <Chip key={w} label={w} selected={d.weekday === i + 1} onPress={() => set('weekday', i + 1)} />
            ))}
          </ChipRow>
        </>
      )}

      {d.kind === 'monthly' && (
        <>
          <FieldLabel>Как часто</FieldLabel>
          <ChipRow>
            {[1, 2, 3, 6, 12].map((n) => (
              <Chip
                key={n}
                label={n === 1 ? 'Каждый месяц' : `${n} мес.`}
                size="sm"
                selected={d.every_n_months === n}
                onPress={() => set('every_n_months', n)}
              />
            ))}
          </ChipRow>
          <FieldLabel>Ближайшая дата</FieldLabel>
          <MonthCalendar value={d.due_date} onChange={(v) => set('due_date', v)} />
        </>
      )}

      <FieldLabel optional>Напомнить за сколько дней</FieldLabel>
      <Input
        value={d.remind}
        onChangeText={(v) => set('remind', v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        placeholder="0 — напомнить в день дедлайна"
      />
    </Sheet>
  );
}
