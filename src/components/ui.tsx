import { Image } from 'expo-image';
import { Plus, X } from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, makeStyles, radius, useColors } from '@/lib/theme';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/** Толщина линий у всех иконок — тоньше стандартной, под лёгкий шрифт */
export const ICON_STROKE = 1.5;

// ---------- Текст ----------
type Variant = 'h1' | 'h2' | 'title' | 'body' | 'muted' | 'caption' | 'label';
export function Txt({ variant = 'body', style, ...p }: TextProps & { variant?: Variant }) {
  const t = useTextStyles();
  return <Text {...p} style={[t.base, t[variant], style]} />;
}
const useTextStyles = makeStyles((c) => ({
  base: { color: c.text, fontFamily: fonts.regular },
  h1: { fontSize: 40, lineHeight: 44, fontFamily: fonts.light, letterSpacing: -1.2 },
  h2: { fontSize: 26, lineHeight: 30, fontFamily: fonts.medium, letterSpacing: -0.6 },
  title: { fontSize: 17, lineHeight: 22, fontFamily: fonts.medium, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21 },
  muted: { fontSize: 14, lineHeight: 20, color: c.textMuted },
  caption: { fontSize: 12, lineHeight: 16, color: c.textMuted },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium, color: c.textMuted },
}));

/** Обёртка экрана вкладки: свой непрозрачный фон, чтобы неактивные вкладки не просвечивали */
export function Screen({ children }: { children: ReactNode }) {
  const c = useColors();
  return <View style={{ flex: 1, backgroundColor: c.bg }}>{children}</View>;
}

// ---------- Блоки ----------
/** Заливной блок без рамок и теней: карточка элемента списка или группа строк */
export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const s = useStyles();
  const body = <View style={[s.card, style]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** Строка списка: тонкий разделитель снизу, без карточек */
export function ListRow({
  children,
  onPress,
  last,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  const rowStyle = [s.row, last && { borderBottomWidth: 0 }, style];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [rowStyle, pressed && { opacity: 0.6 }]}>
      {children}
    </Pressable>
  ) : (
    <View style={rowStyle}>{children}</View>
  );
}

// ---------- Метка человека: ● я, ○ партнёр ----------
export function PersonMark({ mine, size = 10, color }: { mine: boolean; size?: number; color?: string }) {
  const c = useColors();
  const ink = color ?? c.text;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: ink,
        backgroundColor: mine ? ink : 'transparent',
      }}
    />
  );
}

// ---------- Чипы ----------
export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
  size = 'md',
  tone = 'default',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconType;
  size?: 'sm' | 'md' | 'lg';
  /** accent — тег-метка (категория, жанр): без рамки, приглушённый */
  tone?: 'default' | 'accent';
}) {
  const s = useStyles();
  const c = useColors();
  const color = selected ? c.inverse : tone === 'accent' ? c.textMuted : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.chip,
        size === 'sm' && s.chipSm,
        size === 'lg' && s.chipLg,
        tone === 'accent' && s.chipTag,
        selected && s.chipSelected,
        pressed && { opacity: 0.6 },
      ]}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 15} color={color} strokeWidth={ICON_STROKE} />}
      <Text
        numberOfLines={1}
        style={[s.chipText, { flexShrink: 1 }, size === 'sm' && { fontSize: 13 }, size === 'lg' && { fontSize: 16 }, { color }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  if (scroll)
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {children}
      </ScrollView>
    );
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

// ---------- Вкладки: текст с подчёркиванием ----------
export function Segmented<K extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: K; label: string; icon?: IconType }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const s = useStyles();
  return (
    <View style={s.segment}>
      {items.map(({ key, label }) => {
        const active = key === value;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={[s.segmentItem, active && s.segmentActive]} hitSlop={6}>
            <Text numberOfLines={1} style={[s.segmentText, active && s.segmentTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Под-вкладки: кнопки во всю ширину, выбранная — залита ----------
export function Pills<K extends string>({
  items,
  value,
  onChange,
}: {
  /** prefix получает active, чтобы подстроить цвет под заливку */
  items: { key: K; label: string; prefix?: (active: boolean) => ReactNode }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const s = useStyles();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginVertical: 16 }}>
      {items.map(({ key, label, prefix }) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={({ pressed }) => [s.pill, active && s.pillActive, pressed && { opacity: 0.7 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {prefix?.(active)}
            <Text numberOfLines={1} style={[s.pillText, active && s.pillTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Поля формы ----------
export function FieldLabel({ children, optional }: { children: string; optional?: boolean; required?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 }}>
      <Txt variant="label" style={{ color: c.text }}>
        {children}
      </Txt>
      {optional && <Txt variant="caption" style={{ color: c.textFaint }}>можно пропустить</Txt>}
    </View>
  );
}

export function Input(props: TextInputProps & { focusedStyle?: boolean }) {
  const s = useStyles();
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.textFaint}
      selectionColor={c.accent}
      {...props}
      style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 }, props.style]}
    />
  );
}

// ---------- Кнопки ----------
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  icon?: IconType;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  const c = useColors();
  const color = variant === 'primary' ? c.onAccent : variant === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, variant === 'primary' ? s.btnPrimary : s.btnGhost, { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }, style]}
    >
      {Icon && <Icon size={18} color={color} strokeWidth={ICON_STROKE} />}
      <Text style={[s.btnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  size = 40,
  color,
}: {
  icon: IconType;
  onPress?: () => void;
  size?: number;
  color?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.5 }]}
    >
      <Icon size={Math.min(24, size * 0.55)} color={color ?? c.text} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

/** «+»: чёрный (в тёмной теме — белый) круг */
export function AddButton({ onPress }: { onPress: () => void }) {
  const s = useStyles();
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.7 }]} accessibilityLabel="Добавить">
      <Plus size={22} color={c.inverse} strokeWidth={1.75} />
    </Pressable>
  );
}

/** Заголовок экрана: крупно и тонко, слева; счётчик — приглушённым рядом */
export function ScreenTitle({ title, count, onAdd }: { title: string; count?: number; onAdd?: () => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24, marginBottom: 20 }}>
      <Text style={{ flexShrink: 1 }}>
        <Txt variant="h1">{title}</Txt>
        {count != null && <Txt variant="h1" style={{ color: c.textFaint }}>{` ${count}`}</Txt>}
      </Text>
      {onAdd && <AddButton onPress={onAdd} />}
    </View>
  );
}

// ---------- Аватары: я — заливка, партнёр — контур ----------
export function Avatar({ name, url, size = 28, dim }: { name: string; url?: string | null; size?: number; dim?: boolean }) {
  const c = useColors();
  const style = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View
      style={[
        style,
        {
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: c.text,
          backgroundColor: dim ? c.bg : c.text,
        },
      ]}
    >
      {url ? (
        <Image source={{ uri: url }} style={style} />
      ) : (
        <Text style={{ color: dim ? c.text : c.inverse, fontFamily: fonts.medium, fontSize: size * 0.42 }}>
          {(name || '?').charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

// ---------- Переключатель ----------
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: c.borderStrong, true: c.accent }}
      thumbColor="#fff"
      ios_backgroundColor={c.borderStrong}
    />
  );
}

// ---------- Пусто ----------
export function Empty({ title, hint }: { icon?: IconType; title: string; hint?: string }) {
  return (
    <View style={{ paddingVertical: 48, gap: 6 }}>
      <Txt variant="title">{title}</Txt>
      {hint && (
        <Txt variant="muted" style={{ maxWidth: 300 }}>
          {hint}
        </Txt>
      )}
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: 20 }} />;
}

// ---------- Нижний лист (bottom sheet) ----------
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap} pointerEvents="box-none">
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Txt variant="h2" style={{ flex: 1 }}>
              {title}
            </Txt>
            <IconButton icon={X} onPress={onClose} size={40} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: radius.lg, padding: 16 },
  row: { borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 16 },
  chip: {
    maxWidth: '100%',
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  chipSm: { height: 30, paddingHorizontal: 10 },
  chipLg: { height: 46, paddingHorizontal: 18 },
  // Метка лежит в основном на карточке (surface), поэтому на тон темнее/светлее неё
  chipTag: { borderWidth: 0, backgroundColor: c.surfaceRaised },
  chipSelected: { borderColor: c.text, backgroundColor: c.text },
  chipText: { fontFamily: fonts.regular, fontSize: 14 },
  segment: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: c.border },
  segmentItem: { paddingVertical: 12, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent', flexShrink: 1 },
  segmentActive: { borderBottomColor: c.accent },
  segmentText: { fontFamily: fonts.regular, fontSize: 15, color: c.textMuted },
  segmentTextActive: { fontFamily: fonts.medium, color: c.text },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  pillActive: { backgroundColor: c.text, borderColor: c.text },
  pillText: { fontFamily: fonts.medium, fontSize: 15, color: c.text, flexShrink: 1 },
  pillTextActive: { color: c.inverse },
  input: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    minHeight: 52,
    color: c.text,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  btn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, flexDirection: 'row', gap: 8 },
  btnPrimary: { backgroundColor: c.accent },
  btnGhost: { borderWidth: 1, borderColor: c.borderStrong },
  btnText: { fontFamily: fonts.medium, fontSize: 16 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: c.border,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginTop: 8, marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
}));
