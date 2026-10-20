import * as Haptics from 'expo-haptics';
import { Check, Ellipsis, SmilePlus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { colors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, Chip, ChipRow } from './ui';

export const haptic = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** Круглый чекбокс как в референсе */
export function CheckCircle({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      hitSlop={10}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: checked ? colors.accent : colors.accentBorder,
        backgroundColor: checked ? colors.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <Check size={18} color="#fff" strokeWidth={3} />}
    </Pressable>
  );
}

/** Кнопка «…» с меню «Редактировать / Удалить» */
export function ItemMenu({ onEdit, onDelete, title = 'Действия' }: { onEdit?: () => void; onDelete: () => void; title?: string }) {
  const open = () => {
    const confirmDelete = () =>
      Alert.alert('Удалить?', 'Это действие нельзя отменить', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: onDelete },
      ]);
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (confirm('Удалить?')) onDelete();
      return;
    }
    Alert.alert(title, undefined, [
      ...(onEdit ? [{ text: 'Редактировать', onPress: onEdit }] : []),
      { text: 'Удалить', style: 'destructive' as const, onPress: confirmDelete },
      { text: 'Отмена', style: 'cancel' as const },
    ]);
  };
  return (
    <Pressable onPress={open} hitSlop={12} style={{ paddingHorizontal: 4 }}>
      <Ellipsis size={20} color={colors.textMuted} />
    </Pressable>
  );
}

/** Аватары исполнителя: null (общее) → оба */
export function AssigneeAvatars({ assignee }: { assignee: string | null }) {
  const { me, partner } = useAuth();
  const people = assignee === null ? [me, partner].filter(Boolean) : [assignee === me?.id ? me : partner].filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {people.map((p) => (
        <Avatar key={p!.id} name={p!.name} url={null} size={30} />
      ))}
    </View>
  );
}

const EMOJI = ['❤️', '🔥', '👍', '😂', '🙏', '😍'];

/** Реакции партнёров на карточку */
export function Reactions({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const { me } = useAuth();
  const [open, setOpen] = useState(false);
  const entries = Object.entries(value ?? {});
  const pick = (e: string) => {
    if (!me) return;
    const next = { ...value };
    if (next[me.id] === e) delete next[me.id];
    else next[me.id] = e;
    onChange(next);
    setOpen(false);
    haptic();
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
      {entries.map(([uid, e]) => (
        <View
          key={uid}
          style={{ paddingHorizontal: 8, height: 28, borderRadius: 14, backgroundColor: colors.surfaceSoft, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 14 }}>{e}</Text>
        </View>
      ))}
      <Pressable onPress={() => setOpen(!open)} hitSlop={8}>
        <SmilePlus size={20} color={colors.textFaint} />
      </Pressable>
      {open &&
        EMOJI.map((e) => (
          <Pressable key={e} onPress={() => pick(e)} style={{ padding: 4 }}>
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </Pressable>
        ))}
    </View>
  );
}

export function PersonChips({
  value,
  onChange,
  includeShared = true,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  includeShared?: boolean;
}) {
  const { me, partner } = useAuth();
  const opts: { id: string | null; label: string }[] = [
    ...(includeShared ? [{ id: null, label: 'Общее' }] : []),
    { id: me?.id ?? '', label: 'Я' },
    ...(partner ? [{ id: partner.id, label: partner.name }] : []),
  ];
  return (
    <ChipRow>
      {opts.map((o) => (
        <Chip key={String(o.id)} label={o.label} size="sm" selected={value === o.id} onPress={() => onChange(o.id)} />
      ))}
    </ChipRow>
  );
}
