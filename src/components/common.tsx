import * as Haptics from 'expo-haptics';
import { Check, Ellipsis, SmilePlus } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, makeStyles, useColors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { Chip, ChipRow, ICON_STROKE, PersonMark, Txt } from './ui';

export const haptic = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** Круглая отметка: пустой контур → залитый акцентом с галочкой */
export function CheckCircle({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      hitSlop={12}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: checked ? c.accent : c.textFaint,
        backgroundColor: checked ? c.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <Check size={14} color={c.onAccent} strokeWidth={2.5} />}
    </Pressable>
  );
}

/** Кнопка «…» с нижним меню «Редактировать / Удалить» (удаление — с подтверждением) */
export function ItemMenu({ onEdit, onDelete, title = 'Действия' }: { onEdit?: () => void; onDelete: () => void; title?: string }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const m = useMenuStyles();
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
        accessibilityLabel="Действия"
      >
        <Ellipsis size={20} color={c.textMuted} strokeWidth={ICON_STROKE} />
      </Pressable>
      <Modal visible={open} animationType="fade" transparent onRequestClose={close} statusBarTranslucent>
        <Pressable style={m.backdrop} onPress={close} />
        <View style={[m.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <Txt variant="caption" numberOfLines={1} style={{ marginBottom: 4 }}>
            {confirming ? 'Удалить без возможности вернуть?' : title}
          </Txt>
          {confirming ? (
            <>
              <MenuRow label="Удалить" danger onPress={() => run(onDelete)} />
              <MenuRow label="Отмена" onPress={() => setConfirming(false)} last />
            </>
          ) : (
            <>
              {onEdit && <MenuRow label="Редактировать" onPress={() => run(onEdit)} />}
              <MenuRow label="Удалить…" danger onPress={() => setConfirming(true)} last />
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

function MenuRow({ label, danger, onPress, last }: { label: string; danger?: boolean; onPress: () => void; last?: boolean }) {
  const c = useColors();
  const m = useMenuStyles();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [m.row, last && { borderBottomWidth: 0 }, pressed && { opacity: 0.5 }]}>
      <Txt style={{ fontSize: 17, color: danger ? c.danger : c.text }}>{label}</Txt>
    </Pressable>
  );
}

const useMenuStyles = makeStyles((c) => ({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  row: { height: 56, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: c.border },
}));

/** Чьё дело: ● я, ○ партнёр, ●○ общее */
export function AssigneeAvatars({ assignee }: { assignee: string | null }) {
  const { me } = useAuth();
  const marks = assignee === null ? [true, false] : [assignee === me?.id];
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {marks.map((mine, i) => (
        <PersonMark key={i} mine={mine} />
      ))}
    </View>
  );
}

const EMOJI = ['❤️', '🔥', '👍', '😂', '🙏', '😍'];

/** Реакции партнёров на карточку */
export function Reactions({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const { me } = useAuth();
  const c = useColors();
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      {entries.map(([uid, e]) => (
        <View key={uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <PersonMark mine={uid === me?.id} size={6} />
          <Text style={{ fontSize: 15 }}>{e}</Text>
        </View>
      ))}
      <Pressable onPress={() => setOpen(!open)} hitSlop={8} accessibilityLabel="Реакция">
        <SmilePlus size={18} color={c.textFaint} strokeWidth={ICON_STROKE} />
      </Pressable>
      {open &&
        EMOJI.map((e) => (
          <Pressable key={e} onPress={() => pick(e)} style={{ padding: 4 }}>
            <Text style={{ fontSize: 20, fontFamily: fonts.regular }}>{e}</Text>
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
    ...(includeShared ? [{ id: null, label: 'Вместе' }] : []),
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
