const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']; // индекс 0 = Пн

export const toISODate = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const parseISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const humanDate = (s: string) => {
  const d = parseISODate(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
};

/** «12 ноября», а если год не текущий — «12 ноября 2027» */
export const humanDateWithYear = (s: string) => {
  const y = parseISODate(s).getFullYear();
  return y === new Date().getFullYear() ? humanDate(s) : `${humanDate(s)} ${y}`;
};

export const relativeDay = (s: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((parseISODate(s).getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  return humanDate(s);
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Ближайшая суббота (или сегодня, если сегодня суббота) */
export const nextWeekend = () => {
  const d = new Date();
  const dow = d.getDay(); // 0 = Вс
  return addDays(d, dow === 6 ? 0 : dow === 0 ? 0 : 6 - dow);
};

export const daysBetween = (from: string, to = new Date()) => Math.floor((to.getTime() - parseISODate(from).getTime()) / 86400000);

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10,
    m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
