import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { initOfflineDatabase } from '../services/offlineService';

export default function AppLayout() {
  useEffect(() => {
    initOfflineDatabase();
  }, []);

  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="bluetooth-scan" options={{ title: 'Connect Bike', headerStyle: { backgroundColor: '#121212' }, headerTintColor: '#fff' }} />
      </Stack>
    </Provider>
  );
}
