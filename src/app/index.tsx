import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { session, me } = useAuth();
  if (!session) return <Redirect href="/sign-in" />;
  if (!me) return null;
  return <Redirect href={me.couple_id ? '/home' : '/pair'} />;
}
