import { useRouter } from 'expo-router';
import { ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { ItemMenu } from '@/components/common';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Input, PersonMark, Txt, Screen } from '@/components/ui';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { daysBetween, humanDate, plural } from '@/lib/dates';
import { fonts, makeStyles, useColors } from '@/lib/theme';
import type { Movie, Note, Task, Wish } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function Us() {
  const router = useRouter();
  const c = useColors();
  const s = useStyles();
  const { me, partner, couple, nameOf } = useAuth();
  const notes = useCoupleTable<Note>('notes', { ascending: false });
  const movies = useCoupleTable<Movie>('movies');
  const tasks = useCoupleTable<Task>('tasks');
  const wishes = useCoupleTable<Wish>('wishes');
  const [text, setText] = useState('');

  const days = couple?.together_since ? daysBetween(couple.together_since) : null;

  const send = () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    notes.insert({ text: v }).catch((e) => Alert.alert('Ошибка', e.message));
  };

  const watched = movies.rows.filter((m) => m.status === 'watched').length;
  const done = tasks.rows.filter((t) => t.done || t.last_done).length;
  const stats = [
    { value: watched, label: plural(watched, 'фильм', 'фильма', 'фильмов') },
    { value: done, label: plural(done, 'дело сделано', 'дела сделано', 'дел сделано') },
    { value: wishes.rows.length, label: plural(wishes.rows.length, 'желание', 'желания', 'желаний') },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 }}>
          <PersonMark mine />
          <Txt variant="label" style={{ color: c.text }}>
            {me?.name}
          </Txt>
          <PersonMark mine={false} />
          <Txt variant="label" style={{ color: c.text }}>
            {partner?.name ?? 'ждём партнёра'}
          </Txt>
        </View>

        {days != null ? (
          <>
            <Txt style={s.days}>{days.toLocaleString('ru-RU')}</Txt>
            <Txt variant="title" style={{ marginTop: 4 }}>
              {plural(days, 'день', 'дня', 'дней')} вместе
            </Txt>
            <Txt variant="muted">с {humanDate(couple!.together_since!)} {couple!.together_since!.slice(0, 4)}</Txt>
          </>
        ) : (
          <Pressable onPress={() => router.push('/settings')} style={{ marginTop: 16 }} hitSlop={8}>
            <Txt style={s.days}>—</Txt>
            <Txt style={{ color: c.accentLight, marginTop: 4 }}>Укажите дату начала отношений</Txt>
          </Pressable>
        )}

        <View style={s.stats}>
          {stats.map((st, i) => (
            <View key={st.label} style={[s.stat, i > 0 ? s.statDivider : { paddingLeft: 0 }]}>
              <Txt style={{ fontFamily: fonts.light, fontSize: 28, letterSpacing: -0.8 }}>{st.value}</Txt>
              <Txt variant="caption">{st.label}</Txt>
            </View>
          ))}
        </View>

        <Txt variant="title" style={{ marginTop: 36, marginBottom: 12 }}>
          Записки друг другу
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input
            value={text}
            onChangeText={setText}
            placeholder="Написать что-то тёплое…"
            style={{ flex: 1 }}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            disabled={!text.trim()}
            style={({ pressed }) => [s.send, { opacity: !text.trim() ? 0.3 : pressed ? 0.7 : 1 }]}
            accessibilityLabel="Отправить"
          >
            <ArrowUp size={22} color={c.onAccent} strokeWidth={1.75} />
          </Pressable>
        </View>

        {!notes.rows.length && (
          <Txt variant="muted" style={{ marginTop: 20 }}>
            Здесь будут ваши записки
          </Txt>
        )}
        {notes.rows.map((n) => {
          const mine = n.author === me?.id;
          return (
            <View key={n.id} style={s.note}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <PersonMark mine={mine} size={8} />
                <Txt variant="caption" style={{ flex: 1 }}>
                  {nameOf(n.author)}, {new Date(n.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </Txt>
                {mine && <ItemMenu title="Записка" onDelete={() => notes.remove(n.id)} />}
              </View>
              <Txt style={{ fontSize: 16, lineHeight: 23, marginTop: 6 }}>{n.text}</Txt>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  days: { fontFamily: fonts.light, fontSize: 96, lineHeight: 100, letterSpacing: -4, color: c.text, marginTop: 12 },
  stats: { flexDirection: 'row', marginTop: 32, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border },
  stat: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: c.border },
  send: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  note: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border },
}));
