import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SpeedDistributionChart() {
  const buckets = [
    { label: '0-20', percentage: 15, icon: 'turtle' },
    { label: '21-40', percentage: 25, icon: 'car' },
    { label: '41-60', percentage: 35, icon: 'motorcycle' },
    { label: '61-80', percentage: 15, icon: 'rocket' },
    { label: '81+', percentage: 10, icon: 'lightning-bolt' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>Speed Range Distribution (%)</Text>
      <View style={styles.chartBody}>
        {buckets.map(b => (
          <View key={b.label} style={styles.row}>
            <MaterialCommunityIcons name={b.icon as any} size={16} color="#fff" style={styles.emoji} />
            <Text style={styles.label}>{b.label} km/h</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${b.percentage}%` }]} />
            </View>
            <Text style={styles.percentage}>{b.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  chartBody: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 16,
    marginRight: 8,
  },
  label: {
    fontSize: 12,
    color: '#aaaaaa',
    width: 70,
  },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: '#121212',
    borderRadius: 5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 5,
  },
  percentage: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    width: 35,
    textAlign: 'right',
  },
});
