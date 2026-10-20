import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { PaceColors } from '@/constants/pace';

import '@/features/running/location-task';

SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.error('Unable to keep the native splash screen visible.', error);
});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: PaceColors.background },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
  });

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

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
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PaceColors.background },
});
