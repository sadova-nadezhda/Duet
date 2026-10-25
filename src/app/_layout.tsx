import {
  Geologica_300Light,
  Geologica_400Regular,
  Geologica_500Medium,
  Geologica_600SemiBold,
  useFonts,
} from '@expo-google-fonts/geologica';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Txt } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/supabase';
import '@/lib/webAlert';
import { useColors } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { loading, session, me } = useAuth();
  const c = useColors();
  const signedIn = Boolean(session);
  const paired = Boolean(me?.couple_id);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !paired}>
        <Stack.Screen name="pair" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && paired}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        {/* Свайпы не дружат с жестом закрытия модалки — открываем на весь экран */}
        <Stack.Screen name="movie-match" options={{ presentation: 'fullScreenModal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Geologica_300Light, Geologica_400Regular, Geologica_500Medium, Geologica_600SemiBold });
  const scheme = useColorScheme();
  const c = useColors();

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: c.bg, primary: c.accent, card: c.bg, text: c.text, border: c.border } };
  }, [scheme, c]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="auto" />
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          {isSupabaseConfigured ? (
            <AuthProvider>
              <RootStack />
            </AuthProvider>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', padding: 32, gap: 12 }}>
              <Txt variant="h2">Нужна настройка</Txt>
              <Txt variant="muted">Создайте файл .env по образцу .env.example (ключи Supabase и TMDB) и перезапустите `npx expo start`.</Txt>
            </View>
          )}
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
