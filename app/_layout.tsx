import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initMetrica } from '@/analytics/track';
import { theme } from '@/components/theme';
import { ProgressProvider } from '@/state/ProgressContext';

export default function RootLayout() {
  useEffect(() => {
    initMetrica();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaProvider>
        <ProgressProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.bg },
            }}
          />
        </ProgressProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
