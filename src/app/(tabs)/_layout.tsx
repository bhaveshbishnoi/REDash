import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, string> = {
            index: '🏍️',
            map: '🗺️',
            history: '📜',
            stats: '📊',
            settings: '⚙️'
          };
          return (
            <Text style={[styles.icon, { fontSize: focused ? size + 4 : size }]}>
              {icons[route.name] || '📍'}
            </Text>
          );
        },
        tabBarActiveTintColor: '#FF5722',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#222222',
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#121212',
          shadowColor: 'transparent',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Guerrilla 450' }} />
      <Tabs.Screen name="map" options={{ title: 'Live Ride Map' }} />
      <Tabs.Screen name="history" options={{ title: 'Trip History' }} />
      <Tabs.Screen name="stats" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    marginBottom: -3,
  }
});
