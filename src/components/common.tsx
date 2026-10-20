import * as Haptics from 'expo-haptics';
import { Check, Ellipsis, Pencil, SmilePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, Chip, ChipRow, Txt } from './ui';

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

/** Кнопка «…» с нижним меню «Редактировать / Удалить» (удаление — с подтверждением) */
export function ItemMenu({ onEdit, onDelete, title = 'Действия' }: { onEdit?: () => void; onDelete: () => void; title?: string }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    setOpen(false);
    setConfirming(false);
  };
  const run = (fn: () => void) => {
    close();
    fn();
  };

  return (
    <>
      <Pressable
        onPress={() => {
          haptic();
          setOpen(true);
        }}
        hitSlop={12}
        style={{ paddingHorizontal: 4 }}
      >
        <Ellipsis size={20} color={colors.textMuted} />
      </Pressable>
      <Modal visible={open} animationType="fade" transparent onRequestClose={close} statusBarTranslucent>
        <Pressable style={m.backdrop} onPress={close} />
        <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Txt variant="label" style={{ marginBottom: 8, paddingHorizontal: 4 }}>
            {confirming ? 'Удалить? Это нельзя отменить' : title}
          </Txt>
          {confirming ? (
            <>
              <MenuRow icon={Trash2} label="Да, удалить" danger onPress={() => run(onDelete)} />
              <MenuRow label="Отмена" onPress={() => setConfirming(false)} />
            </>
          ) : (
            <>
              {onEdit && <MenuRow icon={Pencil} label="Редактировать" onPress={() => run(onEdit)} />}
              <MenuRow icon={Trash2} label="Удалить" danger onPress={() => setConfirming(true)} />
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

function MenuRow({ icon: Icon, label, danger, onPress }: { icon?: typeof Pencil; label: string; danger?: boolean; onPress: () => void }) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [m.row, pressed && { backgroundColor: colors.surfaceSoft }]}>
      {Icon && <Icon size={20} color={color} />}
      <Txt style={{ fontSize: 16, color }}>{label}</Txt>
    </Pressable>
  );
}

const m = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,2,10,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#17111F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 56, paddingHorizontal: 12, borderRadius: 16 },
});

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
