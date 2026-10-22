import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { PaceColors } from '@/constants/pace';
import { initializeSession, useSession } from '@/features/auth/session-store';
import { PaceErrorDialog } from '@/components/pace-feedback';

import '@/features/running/location-tracking';

SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.error('Unable to keep the native splash screen visible.', error);
});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: PaceColors.background },
};

export default function RootLayout() {
  const { ready, error } = useSession();
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  useEffect(() => { void initializeSession(); }, []);
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
  });

  if (fontError) throw fontError;
  if (!fontsLoaded || !ready) return null;

  return (
    <ThemeProvider value={theme}>
      <View
        style={styles.root}
        onLayout={() => {
          SplashScreen.hideAsync().catch((error: unknown) => {
            console.error('Unable to hide the native splash screen.', error);
          });
        }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: styles.root }} />
        <PaceErrorDialog message={dismissedError === error ? null : error} onClose={() => setDismissedError(error)} />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PaceColors.background },
});
