import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Background, Txt } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/supabase';
import '@/lib/webAlert';
import { colors } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    primary: colors.accent,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
  },
};

function RootStack() {
  const { loading, session, me } = useAuth();
  const signedIn = Boolean(session);
  const paired = Boolean(me?.couple_id);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
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
        <Stack.Screen name="places" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Background />
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
