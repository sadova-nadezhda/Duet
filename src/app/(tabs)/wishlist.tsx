import { Image } from 'expo-image';
import { Wand2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { PhotoField } from '@/components/PhotoField';
import { deletePhoto } from '@/lib/upload';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import {
  Button,
  Chip,
  ChipRow,
  Empty,
  FieldLabel,
  ICON_STROKE,
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
import { fonts, makeStyles, radius, useColors } from '@/lib/theme';
import type { GiftReservation, Wish, WishCategory } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const alertErr = (e: any) => Alert.alert('Ошибка', e?.message ?? String(e));
const formatPrice = (w: Wish) => (w.price != null ? `${Number(w.price).toLocaleString('ru-RU')} ${w.currency ?? ''}`.trim() : null);

export default function Wishlist() {
  const { me, partner } = useAuth();
  const c = useColors();
  const styles = useStyles();
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
        <ScreenTitle title="Желания" onAdd={() => (setEditing(null), setAddOpen(true))} />
        <Segmented
          value={cat}
          onChange={setCat}
          items={[
            { key: 'gift', label: 'Подарки' },
            { key: 'trip', label: 'Поездки' },
            { key: 'dream', label: 'Мечты' },
          ]}
        />
        <Pills
          value={owner}
          onChange={setOwner}
          items={[
            { key: 'me', label: 'Хочу я' },
            ...(partner ? [{ key: 'partner' as const, label: `Хочет ${partner.name}` }] : []),
          ]}
        />
        {cat === 'gift' && owner === 'partner' && (
          <Txt variant="caption" style={{ marginTop: -4, marginBottom: 16 }}>
            Что вы готовите в подарок, {partner?.name ?? 'партнёр'} не видит.
          </Txt>
        )}

        {!list.length ? (
          <Empty
            title={
              owner === 'partner'
                ? `У ${partner?.name ?? 'партнёра'} пока пусто`
                : cat === 'dream'
                  ? 'Добавьте первую мечту'
                  : cat === 'trip'
                    ? 'Куда поедем?'
                    : 'Добавьте первое желание'
            }
            hint={
              cat === 'dream'
                ? 'Большие цели: машина, свой дом, отпуск'
                : cat === 'trip'
                  ? 'Города, страны и выходные за городом, куда хотите вместе. Побывали — добавьте в «Места»'
                  : 'Вставьте ссылку на товар, картинка и название подтянутся сами'
            }
          />
        ) : (
          <View style={styles.grid}>
            {list.map((w) => (
              <Pressable key={w.id} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]} onPress={() => setOpened(w)}>
                <View style={styles.imageBox}>
                  {w.image_url ? (
                    <Image source={{ uri: w.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                  ) : (
                    <Txt variant="caption" style={{ color: c.textFaint }}>
                      без фото
                    </Txt>
                  )}
                  {owner === 'partner' && reservedIds.has(w.id) && (
                    <View style={styles.badge}>
                      <Txt style={{ fontSize: 11, fontFamily: fonts.medium, color: c.onAccent }}>Вы дарите</Txt>
                    </View>
                  )}
                </View>
                <Txt style={{ fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, marginTop: 8 }} numberOfLines={3}>
                  {w.title}
                </Txt>
                {formatPrice(w) && <Txt variant="muted">{formatPrice(w)}</Txt>}
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
  const styles = useStyles();
  return (
    <Sheet visible onClose={p.onClose} title={w.title}>
      {w.image_url && (
        // На всю ширину листа: квадрат из imageBox заменяем на 4:3
        <View style={[styles.imageBox, { width: '100%', aspectRatio: 4 / 3, marginTop: 12 }]}>
          <Image source={{ uri: w.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
      )}
      {formatPrice(w) && (
        <Txt style={{ fontFamily: fonts.light, fontSize: 32, letterSpacing: -1, marginTop: 16 }}>{formatPrice(w)}</Txt>
      )}
      {!!w.note && (
        <Txt style={{ marginTop: 10, lineHeight: 22 }}>
          {w.note}
        </Txt>
      )}
      <View style={{ gap: 10, marginTop: 20 }}>
        {!!w.url && <Button label="Открыть ссылку" variant="ghost" onPress={() => Linking.openURL(w.url!)} />}

        {!p.isMine && w.category === 'gift' && !r && <Button label="Я подарю" onPress={() => p.onReserve('planned')} />}
        {!p.isMine && r && (
          <>
            <Txt variant="muted">
              {r.status === 'bought' ? 'Куплено. Партнёр не видит эту отметку.' : 'Вы готовите этот подарок. Партнёр не видит.'}
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
  const c = useColors();
  const styles = useStyles();

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
          { key: 'trip', label: 'Поездка' },
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
        <Pressable onPress={autofill} style={styles.magic} accessibilityLabel="Заполнить по ссылке">
          {loading ? <ActivityIndicator color={c.textMuted} /> : <Wand2 size={22} color={c.text} strokeWidth={ICON_STROKE} />}
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

const useStyles = makeStyles((c) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', paddingHorizontal: 6, marginBottom: 20 },
  imageBox: {
    aspectRatio: 1,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: c.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  magic: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
