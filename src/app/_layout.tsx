import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from '../store/store';
import { initOfflineDatabase } from '../services/offlineService';
import BluetoothScanScreen from '../screens/BluetoothScanScreen';

function AppContent() {
  const { connected } = useSelector((state: RootState) => state.bike);

  if (!connected) {
    return <BluetoothScanScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function AppLayout() {
  useEffect(() => {
    initOfflineDatabase();
  }, []);

  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
