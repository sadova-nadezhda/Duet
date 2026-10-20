import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { parseISODate, toISODate, WEEKDAYS_SHORT } from '@/lib/dates';
import { fonts, makeStyles } from '@/lib/theme';
import { IconButton, Txt } from './ui';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** Лёгкий календарь без нативных зависимостей. Неделя начинается с понедельника. */
export function MonthCalendar({ value, onChange }: { value: string | null; onChange: (iso: string) => void }) {
  const styles = useStyles();
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
        <Txt variant="title">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </Txt>
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon={ChevronLeft} size={36} onPress={() => shift(-1)} />
          <IconButton icon={ChevronRight} size={36} onPress={() => shift(1)} />
        </View>
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
          const isToday = iso === today;
          return (
            <Pressable key={iso} onPress={() => onChange(iso)} style={styles.cell}>
              <View style={[styles.day, selected && styles.daySel]}>
                <Text style={[styles.dayText, isToday && styles.todayText, selected && styles.daySelText]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  wd: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', lineHeight: 42 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: c.accent },
  dayText: { color: c.text, fontFamily: fonts.regular, fontSize: 15 },
  // Сегодня — подчёркнутое число, без лишних кружков
  todayText: { fontFamily: fonts.semibold, textDecorationLine: 'underline' },
  daySelText: { color: c.onAccent, textDecorationLine: 'none' },
}));
