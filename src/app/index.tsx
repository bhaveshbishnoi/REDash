import React from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ConnectDashScreen from '../screens/ConnectDashScreen';

export default function Index() {
  const { connected } = useSelector((state: RootState) => state.bike);

  if (!connected) {
    return <ConnectDashScreen />;
  }

  return <Redirect href="/(tabs)" />;
}
