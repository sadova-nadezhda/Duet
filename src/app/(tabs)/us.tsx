import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CalendarHeart, Clapperboard, Heart, MessageCircleHeart, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ItemMenu } from '@/components/common';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Avatar, Card, Input, Txt, Screen } from '@/components/ui';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { daysBetween, humanDate, plural } from '@/lib/dates';
import { colors, fonts, radius } from '@/lib/theme';
import type { Movie, Note, Task, Wish } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function Us() {
  const router = useRouter();
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

  const stats = [
    { icon: Clapperboard, value: movies.rows.filter((m) => m.status === 'watched').length, label: 'фильмов вместе' },
    { icon: Heart, value: tasks.rows.filter((t) => t.done || t.last_done).length, label: 'дел сделано' },
    { icon: CalendarHeart, value: wishes.rows.length, label: 'желаний' },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['rgba(139,92,246,0.35)', 'rgba(139,92,246,0.06)']} style={styles.hero}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar name={me?.name ?? ''} url={me?.avatar_url} size={72} />
            <View style={styles.heart}>
              <Heart size={20} color="#fff" fill="#fff" />
            </View>
            <Avatar name={partner?.name ?? '?'} url={partner?.avatar_url} size={72} dim={!partner} />
          </View>
          <Txt variant="title" style={{ marginTop: 14 }}>
            {me?.name} & {partner?.name ?? '…'}
          </Txt>
          {days != null ? (
            <>
              <Txt style={{ fontFamily: fonts.extrabold, fontSize: 48, color: colors.text, marginTop: 6, letterSpacing: -1 }}>{days}</Txt>
              <Txt variant="muted">
                {plural(days, 'день', 'дня', 'дней')} вместе · с {humanDate(couple!.together_since!)}
              </Txt>
            </>
          ) : (
            <Pressable onPress={() => router.push('/settings')} style={{ marginTop: 10 }}>
              <Txt style={{ color: colors.accentLight }}>Указать дату начала отношений →</Txt>
            </Pressable>
          )}
        </LinearGradient>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          {stats.map((s) => (
            <Card key={s.label} style={{ flex: 1, padding: 14, alignItems: 'flex-start' }}>
              <s.icon size={18} color={colors.accentLight} />
              <Txt style={{ fontFamily: fonts.extrabold, fontSize: 24, marginTop: 8 }}>{s.value}</Txt>
              <Txt variant="caption">{s.label}</Txt>
            </Card>
          ))}
        </View>

        <Txt variant="label" style={{ marginTop: 28, marginBottom: 12 }}>
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
          <Pressable onPress={send} style={styles.send}>
            <Send size={20} color="#fff" />
          </Pressable>
        </View>

        {!notes.rows.length && (
          <View style={{ alignItems: 'center', marginTop: 28, gap: 8 }}>
            <MessageCircleHeart size={32} color={colors.accentBorder} />
            <Txt variant="muted">Здесь будут ваши записки</Txt>
          </View>
        )}
        {notes.rows.map((n) => {
          const mine = n.author === me?.id;
          return (
            <View key={n.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Txt style={{ fontSize: 15, lineHeight: 21 }}>{n.text}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 12 }}>
                <Txt variant="caption">
                  {nameOf(n.author)} · {new Date(n.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </Txt>
                {mine && <ItemMenu onDelete={() => notes.remove(n.id)} />}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 20, borderRadius: radius.xl, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.accentBorder },
  heart: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -10,
    zIndex: 2,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  send: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bubble: { marginTop: 12, padding: 14, borderRadius: 20, maxWidth: '85%' },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accentSoft, borderBottomRightRadius: 6 },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
});
