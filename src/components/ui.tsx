import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Plus, X } from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { colors, fonts, gradients, radius } from '@/lib/theme';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// ---------- Текст ----------
type Variant = 'h1' | 'h2' | 'title' | 'body' | 'muted' | 'caption' | 'label';
export function Txt({ variant = 'body', style, ...p }: TextProps & { variant?: Variant }) {
  return <Text {...p} style={[t.base, t[variant], style]} />;
}
const t = StyleSheet.create({
  base: { color: colors.text, fontFamily: fonts.medium },
  h1: { fontSize: 30, fontFamily: fonts.extrabold, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontFamily: fonts.bold, letterSpacing: -0.3 },
  title: { fontSize: 18, fontFamily: fonts.bold },
  body: { fontSize: 15 },
  muted: { fontSize: 14, color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textMuted },
  label: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
});

// ---------- Фон с фиолетовыми «свечениями» ----------
export function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#2A1640', colors.bg, colors.bg, '#25102E']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** Обёртка экрана вкладки: свой непрозрачный фон, чтобы неактивные вкладки не просвечивали */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Background />
      {children}
    </View>
  );
}

// ---------- Карточка ----------
export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const body = <View style={[s.card, style]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      {body}
    </Pressable>
  ) : (
    body
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
  tone?: 'default' | 'accent';
}) {
  const color = selected || tone === 'accent' ? colors.accentLight : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        s.chip,
        size === 'sm' && s.chipSm,
        size === 'lg' && s.chipLg,
        selected && s.chipSelected,
        tone === 'accent' && !selected && { backgroundColor: colors.accentSoft, borderColor: 'transparent' },
      ]}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 15} color={color} />}
      <Text
        numberOfLines={1}
        style={[s.chipText, { flexShrink: 1 }, size === 'sm' && { fontSize: 12 }, size === 'lg' && { fontSize: 16 }, { color }]}
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

// ---------- Сегменты (Покупки / Дела / Рецепты) ----------
export function Segmented<K extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: K; label: string; icon?: IconType }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={s.segment}>
      {items.map(({ key, label, icon: Icon }) => {
        const active = key === value;
        const color = active ? colors.accentLight : colors.textMuted;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={[s.segmentItem, active && s.segmentActive]}>
            {Icon && <Icon size={15} color={color} />}
            <Text numberOfLines={1} style={[s.segmentText, { color }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Под-вкладки-пилюли (Список дел / Напоминания) ----------
export function Pills<K extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: K; label: string; prefix?: ReactNode }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginVertical: 16 }}>
      {items.map(({ key, label, prefix }) => {
        const active = key === value;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={[s.pill, active && s.pillActive]}>
            {prefix}
            <Text style={[s.pillText, active && { color: colors.accentLight }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Поля формы ----------
export function FieldLabel({ children, optional, required }: { children: string; optional?: boolean; required?: boolean }) {
  return (
    <Txt variant="label" style={{ marginTop: 18, marginBottom: 8 }}>
      {children}
      {optional ? ' — необязательно' : ''}
      {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Txt>
  );
}

export function Input(props: TextInputProps & { focusedStyle?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      selectionColor={colors.accent}
      {...props}
      style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top', paddingTop: 16 }, props.style]}
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
  const content = (
    <View style={s.btnInner}>
      {Icon && <Icon size={18} color={variant === 'primary' ? '#fff' : variant === 'danger' ? colors.danger : colors.accentLight} />}
      <Text style={[s.btnText, variant !== 'primary' && { color: variant === 'danger' ? colors.danger : colors.accentLight }]}>
        {label}
      </Text>
    </View>
  );
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}>
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[s.btn, s.btnGhost]}>{content}</View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  size = 40,
  color = colors.textMuted,
}: {
  icon: IconType;
  onPress?: () => void;
  size?: number;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [s.iconBtn, { width: size, height: size, borderRadius: size / 2 }, pressed && { opacity: 0.7 }]}
    >
      <Icon size={size * 0.45} color={color} />
    </Pressable>
  );
}

/** Квадратная фиолетовая кнопка «+» со свечением, как в референсе */
export function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}>
      <LinearGradient colors={gradients.fab} style={s.addBtn}>
        <Plus size={26} color="#fff" strokeWidth={2.5} />
      </LinearGradient>
    </Pressable>
  );
}

export function ScreenTitle({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 16 }}>
      <Txt variant="h2">{title}</Txt>
      {onAdd && <AddButton onPress={onAdd} />}
    </View>
  );
}

// ---------- Аватары ----------
export function Avatar({ name, url, size = 28, dim }: { name: string; url?: string | null; size?: number; dim?: boolean }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[s.avatar, style, dim && { borderColor: colors.borderStrong }]}>
      {url ? (
        <Image source={{ uri: url }} style={style} />
      ) : (
        <Text style={{ color: dim ? colors.textMuted : colors.accentLight, fontFamily: fonts.bold, fontSize: size * 0.42 }}>
          {(name || '?').charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

// ---------- Переключатель ----------
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
      thumbColor="#fff"
      ios_backgroundColor={colors.surfaceRaised}
    />
  );
}

// ---------- Пусто ----------
export function Empty({ icon: Icon, title, hint }: { icon: IconType; title: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
      <View style={[s.iconBtn, { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.accentSoft }]}>
        <Icon size={28} color={colors.accentLight} />
      </View>
      <Txt variant="title">{title}</Txt>
      {hint && (
        <Txt variant="muted" style={{ textAlign: 'center', maxWidth: 260 }}>
          {hint}
        </Txt>
      )}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20 }} />;
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
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  chip: {
    maxWidth: '100%',
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  chipSm: { height: 28, paddingHorizontal: 10 },
  chipLg: { height: 48, paddingHorizontal: 22 },
  chipSelected: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  chipText: { fontFamily: fonts.semibold, fontSize: 14 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
  },
  segmentActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  segmentText: { fontFamily: fonts.bold, fontSize: 14, flexShrink: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 44, borderRadius: radius.pill },
  pillActive: { backgroundColor: colors.accentSoft },
  pillText: { fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    minHeight: 56,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  btn: { height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnGhost: { backgroundColor: colors.accentSoft },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontFamily: fonts.bold, fontSize: 16 },
  iconBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  addShadow: {
    borderRadius: 18,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  addBtn: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,2,10,0.6)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#17111F',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginTop: 10,
    marginBottom: 14,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  closeBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
