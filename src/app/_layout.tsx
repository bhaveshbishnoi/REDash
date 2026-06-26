import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from '../store/store';
import ConnectDashScreen from '../screens/ConnectDashScreen';
import { initDatabase } from '../services/tripService';

function AppContent() {
  const { connected } = useSelector((state: RootState) => state.bike);

  if (!connected) {
    return <ConnectDashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function AppLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
