import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Platform, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, any> = {
            index: 'motorbike',
            map: 'map-legend',
            history: 'history',
            stats: 'chart-bar',
            settings: 'cog-outline'
          };
          return (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={icons[route.name] || 'map-marker'} 
                size={24} 
                color={color} 
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          );
        },
        tabBarActiveTintColor: '#FF5722',
        tabBarInactiveTintColor: '#667085',
        tabBarStyle: {
          backgroundColor: '#0B0E14',
          borderTopColor: '#1E2433',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerStyle: {
          backgroundColor: '#0B0E14',
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomColor: '#1E2433',
          borderBottomWidth: 1,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: 0.5,
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
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF5722',
    marginTop: 3,
  },
});
