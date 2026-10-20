import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

/** Стартовый маршрут: отправляет туда, куда пользователю можно */
export default function Index() {
  const { session, me } = useAuth();
  if (!session) return <Redirect href="/sign-in" />;
  if (!me) return null; // профиль ещё грузится
  return <Redirect href={me.couple_id ? '/home' : '/pair'} />;
}
