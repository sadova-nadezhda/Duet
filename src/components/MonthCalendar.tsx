import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { parseISODate, toISODate, WEEKDAYS_SHORT } from '@/lib/dates';
import { colors, fonts } from '@/lib/theme';
import { IconButton, Txt } from './ui';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** Лёгкий календарь без нативных зависимостей. Неделя начинается с понедельника. */
export function MonthCalendar({ value, onChange }: { value: string | null; onChange: (iso: string) => void }) {
  const initial = value ? parseISODate(value) : new Date();
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const today = toISODate(new Date());

  const offset = (cursor.getDay() + 6) % 7; // сколько пустых клеток до 1-го числа
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <IconButton icon={ChevronLeft} size={34} onPress={() => shift(-1)} />
        <Txt variant="title" style={{ fontSize: 16 }}>
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </Txt>
        <IconButton icon={ChevronRight} size={34} onPress={() => shift(1)} />
      </View>
      <View style={styles.grid}>
        {WEEKDAYS_SHORT.map((d) => (
          <Text key={d} style={[styles.cell, styles.wd]}>
            {d}
          </Text>
        ))}
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={styles.cell} />;
          const iso = toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), day));
          const selected = iso === value;
          return (
            <Pressable key={iso} onPress={() => onChange(iso)} style={styles.cell}>
              <View style={[styles.day, selected && styles.daySel, iso === today && !selected && styles.dayToday]}>
                <Text style={[styles.dayText, selected && { color: '#fff' }]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, padding: 12, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  wd: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 12, textAlign: 'center', lineHeight: 40 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: colors.accent },
  dayToday: { borderWidth: 1, borderColor: colors.accentBorder },
  dayText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
});
