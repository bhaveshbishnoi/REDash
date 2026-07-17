import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';

export function WebBadge() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <MaterialCommunityIcons name="motorbike" size={16} color="#FF5722" />
        <Text style={styles.badgeText}>REDASH GUERRILLA 450</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#161B26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF572233',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
