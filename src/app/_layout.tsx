import 'expo-sqlite/localStorage/install';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { theme } from '@/core/theme';
import { AppProviders } from '@/providers/AppProviders';
export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.canvas },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppProviders>
  );
}
