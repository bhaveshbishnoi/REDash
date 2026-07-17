import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from '../store/store';
import { initDatabase } from '../services/tripService';

export default function AppLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#0B0E14' } }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </Provider>
  );
}
