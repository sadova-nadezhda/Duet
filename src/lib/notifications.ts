import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, parseISODate } from './dates';
import type { Reminder, Task } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'reminders';
const DEFAULT_HOUR = 10; // во сколько напоминать о делах

export async function ensurePermissions() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Напоминания',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#8B5CF6',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** 1 = Пн … 7 = Вс  →  формат expo: 1 = Вс … 7 = Сб */
const toExpoWeekday = (d: number) => (d % 7) + 1;

/** Следующая дата дела с учётом повторов */
function nextOccurrence(t: Task): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (t.kind === 'once') return t.due_date ? parseISODate(t.due_date) : null;
  if (t.kind === 'monthly' && t.due_date) {
    let d = parseISODate(t.due_date);
    while (d < today) d = new Date(d.getFullYear(), d.getMonth() + (t.every_n_months || 1), d.getDate());
    return d;
  }
  if (t.kind === 'weekly' && t.weekday) {
    const jsTarget = t.weekday % 7; // JS: 0 = Вс
    const diff = (jsTarget - today.getDay() + 7) % 7;
    return addDays(today, diff);
  }
  return null;
}

/**
 * Пересоздаёт все локальные уведомления на этом устройстве.
 * Уведомляем только о своих и общих делах/напоминаниях.
 */
export async function rescheduleAll(opts: { me: string; tasks: Task[]; reminders: Reminder[] }) {
  if (Platform.OS === 'web') return;
  if (!(await ensurePermissions())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const mine = (assignee: string | null) => assignee === null || assignee === opts.me;

  for (const r of opts.reminders) {
    if (!r.enabled || !mine(r.assignee)) continue;
    const [hour, minute] = r.time.split(':').map(Number);
    const content = { title: r.title, body: 'Напоминание 💜' };
    if (r.days.length === 7) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
      });
    } else {
      for (const day of r.days) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: toExpoWeekday(day),
            hour,
            minute,
            channelId: CHANNEL,
          },
        });
      }
    }
  }

  for (const t of opts.tasks) {
    if (t.done || t.remind_days_before == null || !mine(t.assignee)) continue;
    const occ = nextOccurrence(t);
    if (!occ) continue;
    const at = addDays(occ, -t.remind_days_before);
    at.setHours(DEFAULT_HOUR, 0, 0, 0);
    const body = t.remind_days_before === 0 ? 'Сегодня дедлайн' : `Дедлайн через ${t.remind_days_before} дн.`;
    const content = { title: t.title, body };

    if (t.kind === 'weekly' && t.weekday) {
      const day = ((((t.weekday - 1 - t.remind_days_before) % 7) + 7) % 7) + 1;
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(day),
          hour: DEFAULT_HOUR,
          minute: 0,
          channelId: CHANNEL,
        },
      });
    } else if (at > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  }
}
