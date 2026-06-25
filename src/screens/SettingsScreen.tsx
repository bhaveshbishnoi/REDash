import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { updateSettings } from '../store/settingsSlice';

export default function SettingsScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);

  const handleToggleNotifications = (val: boolean) => {
    dispatch(updateSettings({ notificationsEnabled: val }));
  };

  const handleToggleTheme = (val: boolean) => {
    dispatch(updateSettings({ themeMode: val ? 'dark' : 'light' }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Rider Profile</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Active Companion Profile</Text>
        <Text style={styles.cardValue}>Guerrilla Rider (Offline Mode)</Text>
      </View>

      <Text style={styles.sectionHeader}>App Preferences</Text>
      <View style={styles.card}>
        <View style={styles.preferenceRow}>
          <Text style={styles.prefLabel}>Dark Theme Mode</Text>
          <Switch
            value={settings.themeMode === 'dark'}
            onValueChange={handleToggleTheme}
            trackColor={{ false: '#767577', true: '#FF5722' }}
            thumbColor={settings.themeMode === 'dark' ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
        <View style={[styles.preferenceRow, styles.borderTop]}>
          <Text style={styles.prefLabel}>Push Alerts</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#767577', true: '#FF5722' }}
          />
        </View>
      </View>

      <Text style={styles.sectionHeader}>Guerrilla Dash Settings</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('WallpaperGallery')}>
          <Text style={styles.menuText}>Customize Dashboard Wallpaper</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  cardLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 12,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 4,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  prefLabel: {
    fontSize: 14,
    color: '#ffffff',
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuText: {
    color: '#ffffff',
    fontSize: 14,
  },
  chevron: {
    color: '#888888',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
