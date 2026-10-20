import { Image } from 'expo-image';
import { Eye, Gift, Info, Link2, Lock, Sparkles, Wand2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { PhotoField } from '@/components/PhotoField';
import { deletePhoto } from '@/lib/upload';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import {
  Avatar,
  Button,
  Chip,
  ChipRow,
  Empty,
  FieldLabel,
  Input,
  Pills,
  ScreenTitle,
  Segmented,
  Sheet,
  Txt,
  Screen,
} from '@/components/ui';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { fetchLinkPreview } from '@/lib/linkPreview';
import { colors, fonts, radius } from '@/lib/theme';
import type { GiftReservation, Wish, WishCategory } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const alertErr = (e: any) => Alert.alert('Ошибка', e?.message ?? String(e));
const formatPrice = (w: Wish) => (w.price != null ? `${Number(w.price).toLocaleString('ru-RU')} ${w.currency ?? ''}`.trim() : null);

export default function Wishlist() {
  const { me, partner } = useAuth();
  const wishes = useCoupleTable<Wish>('wishes', { ascending: false });
  const reservations = useCoupleTable<GiftReservation>('gift_reservations', { noCoupleFilter: true });

  const [cat, setCat] = useState<WishCategory>('gift');
  const [owner, setOwner] = useState<'me' | 'partner'>('me');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Wish | null>(null);
  const [opened, setOpened] = useState<Wish | null>(null);

  const ownerId = owner === 'me' ? me?.id : partner?.id;
  const list = useMemo(() => wishes.rows.filter((w) => w.category === cat && w.owner === ownerId), [wishes.rows, cat, ownerId]);
  const reservedIds = new Set(reservations.rows.map((r) => r.wish_id));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE }}>
        <ScreenTitle title="Наш вишлист" onAdd={() => (setEditing(null), setAddOpen(true))} />
        <Segmented
          value={cat}
          onChange={setCat}
          items={[
            { key: 'gift', label: 'Подарки', icon: Gift },
            { key: 'see', label: 'Посмотреть', icon: Eye },
            { key: 'dream', label: 'Мечты', icon: Sparkles },
          ]}
        />
        <Pills
          value={owner}
          onChange={setOwner}
          items={[
            { key: 'me', label: 'Хочу я', prefix: <Avatar name={me?.name ?? 'Я'} size={24} dim={owner !== 'me'} /> },
            ...(partner
              ? [
                  {
                    key: 'partner' as const,
                    label: `Хочет ${partner.name}`,
                    prefix: <Avatar name={partner.name} size={24} dim={owner !== 'partner'} />,
                  },
                ]
              : []),
          ]}
        />
        {cat === 'gift' && (
          <View style={styles.notice}>
            <Lock size={16} color={colors.textFaint} />
            <Txt variant="caption" style={{ flex: 1, fontSize: 13 }}>
              Подготовка подарка видна только дарителю
            </Txt>
            <Info size={16} color={colors.textFaint} />
          </View>
        )}

        {!list.length ? (
          <Empty
            icon={Gift}
            title={owner === 'me' ? 'Добавьте первое желание' : `У ${partner?.name ?? 'партнёра'} пока пусто`}
            hint="Вставьте ссылку на товар — картинка и название подтянутся сами"
          />
        ) : (
          <View style={styles.grid}>
            {list.map((w) => (
              <Pressable key={w.id} style={styles.cell} onPress={() => setOpened(w)}>
                <View style={styles.wishCard}>
                  <View style={styles.imageBox}>
                    {w.image_url ? (
                      <Image source={{ uri: w.image_url }} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} />
                    ) : (
                      <Gift size={40} color={colors.accentBorder} />
                    )}
                    {owner === 'partner' && reservedIds.has(w.id) && (
                      <View style={styles.badge}>
                        <Txt style={{ fontSize: 11, fontFamily: fonts.bold, color: '#fff' }}>🎁 Вы дарите</Txt>
                      </View>
                    )}
                  </View>
                  <View style={{ padding: 14, gap: 6 }}>
                    <Txt style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 }} numberOfLines={3}>
                      {w.title}
                    </Txt>
                    {formatPrice(w) && <Txt style={{ color: colors.accentLight, fontFamily: fonts.bold }}>{formatPrice(w)}</Txt>}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <WishSheet
        visible={addOpen}
        editing={editing}
        defaultCategory={cat}
        onClose={() => setAddOpen(false)}
        onSave={(v) => (editing ? wishes.update(editing.id, v) : wishes.insert(v))}
      />

      {opened && (
        <WishDetails
          wish={opened}
          isMine={opened.owner === me?.id}
          reservation={reservations.rows.find((r) => r.wish_id === opened.id) ?? null}
          onClose={() => setOpened(null)}
          onEdit={() => {
            setEditing(opened);
            setOpened(null);
            setAddOpen(true);
          }}
          onDelete={() => {
            wishes
              .remove(opened.id)
              .then(() => deletePhoto(opened.image_url))
              .catch(alertErr);
            setOpened(null);
          }}
          onReserve={(status) => reservations.insert({ wish_id: opened.id, status }).catch(alertErr)}
          onUpdateReservation={(status) => reservations.update(opened.id, { status }).catch(alertErr)}
          onCancelReservation={() => reservations.remove(opened.id).catch(alertErr)}
        />
      )}
    </Screen>
  );
}

// ---------- Детали желания ----------
function WishDetails(p: {
  wish: Wish;
  isMine: boolean;
  reservation: GiftReservation | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReserve: (s: 'planned' | 'bought') => void;
  onUpdateReservation: (s: 'planned' | 'bought') => void;
  onCancelReservation: () => void;
}) {
  const { wish: w, reservation: r } = p;
  return (
    <Sheet visible onClose={p.onClose} title={w.title}>
      {w.image_url && (
        <View style={[styles.imageBox, { height: 220, borderRadius: radius.lg, marginTop: 12 }]}>
          <Image source={{ uri: w.image_url }} style={StyleSheet.absoluteFill} contentFit="contain" />
        </View>
      )}
      {formatPrice(w) && (
        <Txt style={{ color: colors.accentLight, fontFamily: fonts.extrabold, fontSize: 22, marginTop: 16 }}>{formatPrice(w)}</Txt>
      )}
      {!!w.note && (
        <Txt variant="muted" style={{ marginTop: 10, lineHeight: 21 }}>
          {w.note}
        </Txt>
      )}
      <View style={{ gap: 10, marginTop: 20 }}>
        {!!w.url && <Button label="Открыть ссылку" variant="ghost" icon={Link2} onPress={() => Linking.openURL(w.url!)} />}

        {!p.isMine && w.category === 'gift' && !r && <Button label="Я подарю 🎁" onPress={() => p.onReserve('planned')} />}
        {!p.isMine && r && (
          <>
            <Txt variant="muted" style={{ textAlign: 'center' }}>
              {r.status === 'bought' ? '✅ Куплено — партнёр не видит эту отметку' : '🤫 Вы готовите этот подарок — партнёр не видит'}
            </Txt>
            {r.status !== 'bought' && <Button label="Отметить «Куплено»" onPress={() => p.onUpdateReservation('bought')} />}
            <Button label="Отменить бронь" variant="ghost" onPress={p.onCancelReservation} />
          </>
        )}

        {p.isMine && (
          <>
            <Button label="Редактировать" variant="ghost" onPress={p.onEdit} />
            <Button label="Удалить" variant="danger" onPress={p.onDelete} />
          </>
        )}
      </View>
    </Sheet>
  );
}

// ---------- Форма добавления ----------
function WishSheet({
  visible,
  onClose,
  editing,
  defaultCategory,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  editing: Wish | null;
  defaultCategory: WishCategory;
  onSave: (v: Partial<Wish>) => Promise<unknown>;
}) {
  const [category, setCategory] = useState<WishCategory>(defaultCategory);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('₸');
  const [image, setImage] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCategory(editing?.category ?? defaultCategory);
    setUrl(editing?.url ?? '');
    setTitle(editing?.title ?? '');
    setPrice(editing?.price != null ? String(editing.price) : '');
    setCurrency(editing?.currency ?? '₸');
    setImage(editing?.image_url ?? '');
    setNote(editing?.note ?? '');
  }, [visible, editing, defaultCategory]);

  const autofill = async () => {
    if (!/^https?:\/\//.test(url)) return;
    setLoading(true);
    const p = await fetchLinkPreview(url.trim());
    setLoading(false);
    if (p.title && !title) setTitle(p.title);
    if (p.image) {
      if (image !== (editing?.image_url ?? '')) deletePhoto(image);
      setImage(p.image);
    }
    if (p.price && !price) setPrice(String(p.price));
    if (!p.title && !p.image) Alert.alert('Не удалось', 'Сайт не отдал данные — заполните вручную');
  };

  /** Сохранённая картинка заменена — старая больше не нужна */
  const imageChanged = () => image.trim() !== (editing?.image_url ?? '');

  /** Закрыли без сохранения — удаляем только что загруженное фото */
  const cancel = () => {
    if (imageChanged()) deletePhoto(image.trim());
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={cancel}
      title={editing ? 'Изменить желание' : 'Новое желание'}
      footer={
        <Button
          label="Сохранить"
          disabled={!title.trim()}
          onPress={() =>
            onSave({
              category,
              title: title.trim(),
              url: url.trim() || null,
              price: price ? Number(price.replace(',', '.')) : null,
              currency,
              image_url: image.trim() || null,
              note: note.trim() || null,
            })
              .then(() => {
                if (imageChanged()) deletePhoto(editing?.image_url);
                onClose();
              })
              .catch(alertErr)
          }
        />
      }
    >
      <FieldLabel>Раздел</FieldLabel>
      <Segmented
        value={category}
        onChange={setCategory}
        items={[
          { key: 'gift', label: 'Подарок' },
          { key: 'see', label: 'Посмотреть' },
          { key: 'dream', label: 'Мечта' },
        ]}
      />
      <FieldLabel optional>Ссылка на товар</FieldLabel>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Input
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          autoCapitalize="none"
          keyboardType="url"
          style={{ flex: 1 }}
          onBlur={autofill}
        />
        <Pressable onPress={autofill} style={styles.magic}>
          {loading ? <ActivityIndicator color={colors.accentLight} /> : <Wand2 size={22} color={colors.accentLight} />}
        </Pressable>
      </View>
      <FieldLabel required>Название</FieldLabel>
      <Input value={title} onChangeText={setTitle} placeholder="Например, подсветка для телевизора" />
      <FieldLabel optional>Цена</FieldLabel>
      <Input value={price} onChangeText={setPrice} placeholder="120" keyboardType="decimal-pad" />
      <View style={{ marginTop: 10 }}>
        <ChipRow>
          {['₸', '$', '€', '₽'].map((c) => (
            <Chip key={c} label={c} size="sm" selected={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </ChipRow>
      </View>
      <FieldLabel optional>Картинка</FieldLabel>
      <PhotoField value={image} onChange={setImage} placeholder="URL или подставится из ссылки" />
      <FieldLabel optional>Заметка</FieldLabel>
      <Input value={note} onChangeText={setNote} placeholder="Размер, цвет…" multiline />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 },
  cell: { width: '50%', padding: 7 },
  wishCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  imageBox: { height: 170, backgroundColor: '#F7F5FA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  magic: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
