import React, { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ConnectDashScreen from '../screens/ConnectDashScreen';
import PermissionsScreen, { hasCompletedPermissions } from '../screens/PermissionsScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

type AppState = 'loading' | 'permissions' | 'connect' | 'dashboard';

export default function Index() {
  const { connected } = useSelector((state: RootState) => state.bike);
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    (async () => {
      const permsDone = await hasCompletedPermissions();
      if (!permsDone) {
        setAppState('permissions');
      } else if (connected) {
        setAppState('dashboard');
      } else {
        setAppState('connect');
      }
    })();
  }, [connected]);

  if (appState === 'loading') {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  if (appState === 'permissions') {
    return (
      <PermissionsScreen
        onComplete={() => {
          setAppState(connected ? 'dashboard' : 'connect');
        }}
      />
    );
  }

  if (appState === 'connect' && !connected) {
    return <ConnectDashScreen />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
