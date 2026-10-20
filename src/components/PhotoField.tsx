import { Image } from 'expo-image';
import { ImageUp, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { deletePhoto, pickAndUploadPhoto } from '@/lib/upload';
import { makeStyles, radius, useColors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { ICON_STROKE, Input } from './ui';

/**
 * Поле фото: вставить URL картинки или загрузить из галереи. Значение — всегда URL.
 * Фото, загруженные здесь и ещё не сохранённые, удаляются из Storage сразу при замене/очистке.
 * Удаление уже сохранённого фото — на совести формы (при сохранении или отмене).
 */
export function PhotoField({
  value,
  onChange,
  placeholder = 'https://… или загрузите',
  square,
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  /** Обрезка 1:1 при выборе (для аватара) */
  square?: boolean;
}) {
  const { me } = useAuth();
  const c = useColors();
  const s = useStyles();
  const [uploading, setUploading] = useState(false);
  const uploaded = useRef(new Set<string>());

  const set = (next: string) => {
    if (next !== value && uploaded.current.delete(value)) deletePhoto(value);
    onChange(next);
  };

  const upload = async () => {
    if (!me?.couple_id || uploading) return;
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto(me.couple_id, { square });
      if (url) {
        set(url);
        uploaded.current.add(url);
      }
    } catch (e: any) {
      Alert.alert('Не удалось загрузить', e.message);
    } finally {
      setUploading(false);
    }
  };

  const url = value.trim();
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Input
          value={value}
          onChangeText={set}
          placeholder={placeholder}
          autoCapitalize="none"
          keyboardType="url"
          style={{ flex: 1 }}
        />
        <Pressable onPress={upload} style={s.btn} accessibilityLabel="Загрузить фото">
          {uploading ? <ActivityIndicator color={c.textMuted} /> : <ImageUp size={22} color={c.text} strokeWidth={ICON_STROKE} />}
        </Pressable>
      </View>
      {/^https?:\/\//.test(url) && (
        <View style={[s.preview, square && { width: 96 }]}>
          <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit={square ? 'cover' : 'contain'} transition={150} />
          <Pressable onPress={() => set('')} hitSlop={8} style={s.clear} accessibilityLabel="Убрать фото">
            <X size={14} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  btn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    marginTop: 10,
    width: 120,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  clear: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
