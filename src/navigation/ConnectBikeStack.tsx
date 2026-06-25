import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BluetoothScanScreen from '../screens/BluetoothScanScreen';

const Stack = createNativeStackNavigator();

export default function ConnectBikeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BluetoothScan" component={BluetoothScanScreen} />
    </Stack.Navigator>
  );
}
