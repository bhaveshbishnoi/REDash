import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { RootState } from '../store/store';
import { setUser, setLoading } from '../store/authSlice';
import { listenToAuthChanges } from '../services/authService';
import AuthStack from './AuthStack';
import ConnectBikeStack from './ConnectBikeStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state: RootState) => state.auth);
  const { connected } = useSelector((state: RootState) => state.bike);

  useEffect(() => {
    dispatch(setLoading(true));
    const unsubscribe = listenToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        dispatch(setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'Guerrilla Rider',
        }));
      } else {
        dispatch(setUser(null));
      }
    });

    return unsubscribe;
  }, [dispatch]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="AuthFlow" component={AuthStack} />
        ) : !connected ? (
          <Stack.Screen name="BluetoothFlow" component={ConnectBikeStack} />
        ) : (
          <Stack.Screen name="MainFlow" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
