import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const BUCKET = 'photos';

/**
 * Открывает галерею и загружает выбранное фото в Supabase Storage (бакет `photos`, папка пары).
 * Возвращает публичный URL или null, если пользователь ничего не выбрал.
 */
export async function pickAndUploadPhoto(coupleId: string, opts: { square?: boolean } = {}): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: opts.square,
    aspect: opts.square ? [1, 1] : undefined,
    quality: 0.8,
  });
  const asset = res.assets?.[0];
  if (res.canceled || !asset) return null;

  const contentType = asset.mimeType ?? 'image/jpeg';
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${coupleId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  // В вебе есть готовый File, на телефоне читаем локальный файл по uri
  const body = asset.file ?? (await fetch(asset.uri).then((r) => r.arrayBuffer()));

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Удаляет файл из бакета, если URL ведёт в наш Storage. Чужие ссылки (вставленные вручную) не трогает.
 * Ошибки глотаем: висящий файл не стоит того, чтобы ломать сохранение.
 */
export async function deletePhoto(url: string | null | undefined) {
  const prefix = supabase.storage.from(BUCKET).getPublicUrl('').data.publicUrl;
  if (!url || !url.startsWith(prefix)) return;
  await supabase.storage
    .from(BUCKET)
    .remove([decodeURIComponent(url.slice(prefix.length))])
    .catch(() => {});
}
