import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, any> = {
            index: 'motorcycle',
            map: 'map',
            history: 'history',
            stats: 'chart-bar',
            settings: 'cog'
          };
          return (
            <MaterialCommunityIcons 
                name={icons[route.name] || 'map-marker'} 
                size={focused ? size + 4 : size} 
                color={color} 
                style={styles.icon}
            />
          );
        },
        tabBarActiveTintColor: '#FF5722',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#222222',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
        headerStyle: {
          backgroundColor: '#121212',
          shadowColor: 'transparent',
          elevation: 0,
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
