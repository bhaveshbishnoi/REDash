import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, StyleSheet } from 'react-native';
import DashboardScreen from '../screens/DashboardScreen';
import MapScreen from '../screens/MapScreen';
import TripHistoryScreen from '../screens/TripHistoryScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WallpaperScreen from '../screens/WallpaperScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ 
      headerStyle: { backgroundColor: '#121212' },
      headerTintColor: '#ffffff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="WallpaperGallery" component={WallpaperScreen} options={{ title: 'Wallpapers' }} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, string> = {
            Dashboard: '🏍️',
            Map: '🗺️',
            History: '📜',
            Stats: '📊',
            Settings: '⚙️'
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Guerrilla 450' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Live Ride Map' }} />
      <Tab.Screen name="History" component={TripHistoryScreen} options={{ title: 'Trip History' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ title: 'Settings', headerShown: false }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: {
    marginBottom: -3,
  }
});
