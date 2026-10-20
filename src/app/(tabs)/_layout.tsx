import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { TabBar } from '@/components/TabBar';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import { rescheduleAll } from '@/lib/notifications';
import type { Reminder, Task } from '@/lib/types';
import { colors } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export const unstable_settings = { initialRouteName: 'home' };

/** Держит локальные уведомления в синхроне с делами и напоминаниями пары */
function NotificationsSync() {
  const { me } = useAuth();
  const { rows: tasks } = useCoupleTable<Task>('tasks');
  const { rows: reminders } = useCoupleTable<Reminder>('reminders');
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => rescheduleAll({ me: me.id, tasks, reminders }).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [me, tasks, reminders]);
  return null;
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <NotificationsSync />
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
        <Tabs.Screen name="home" />
        <Tabs.Screen name="wishlist" />
        <Tabs.Screen name="us" />
        <Tabs.Screen name="movies" />
        <Tabs.Screen name="more" />
      </Tabs>
    </View>
  );
}
