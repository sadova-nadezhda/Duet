# Duet — приложение для пары (iOS + Android)

Expo SDK 57 · React Native · Expo Router · Supabase · TMDB

## Запуск за 5 шагов

1. **Supabase**: создать проект на supabase.com → SQL Editor → вставить `supabase/schema.sql` → Run.
   Authentication → Providers → Email: для теста можно выключить «Confirm email».
2. **TMDB** (для поиска фильмов): themoviedb.org → Settings → API → скопировать *API Read Access Token*.
3. Скопировать `.env.example` в `.env` и вписать ключи.
4. `npm install` → `npx expo start`.
5. Открыть QR-код в **Expo Go** на телефоне. Оба партнёра регистрируются, один жмёт «Создать пару», второй вводит код.

## Сборка в App Store / Google Play

```bash
npx eas-cli@latest build --platform all
npx eas-cli@latest submit
```
Локальные уведомления в Expo Go работают ограниченно — для полной проверки нужен dev build (`eas build --profile development`).

## Структура

| Путь | Что там |
|---|---|
| `src/app/(tabs)/` | Вкладки: Дом, Вишлист, Мы, Кино, Ещё |
| `src/app/places.tsx`, `settings.tsx` | Места, Настройки |
| `src/features/home/` | Дела (разовые/повторы), напоминания, покупки, рецепты |
| `src/features/movies/` | Поиск TMDB, оценки, «Что смотрим сегодня?» |
| `src/components/ui.tsx` | UI-кит: карточки, чипы, сегменты, bottom sheet |
| `src/lib/theme.ts` | **Цвета** — меняйте акцент здесь |
| `src/lib/notifications.ts` | Локальные уведомления |
| `supabase/schema.sql` | Таблицы, RLS, функции пары, realtime |

## Безопасность
- Все данные изолированы по паре через RLS.
- Бронь подарка (`gift_reservations`) видит только даритель.
- Ключ TMDB лежит в клиенте — для личного использования норм; для публичного релиза лучше вынести запросы в Supabase Edge Function.
