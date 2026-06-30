import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  trips: any[];
}

export default function SpeedDistributionChart({ trips }: Props) {
  // Calculate real speed distribution from actual trip data
  const buckets = [
    { label: '0-20', min: 0, max: 20, icon: 'speedometer-slow', color: '#4ecdc4' },
    { label: '21-40', min: 21, max: 40, icon: 'speedometer-medium', color: '#45b7d1' },
    { label: '41-60', min: 41, max: 60, icon: 'speedometer', color: '#f9ca24' },
    { label: '61-80', min: 61, max: 80, icon: 'speedometer', color: '#f0932b' },
    { label: '81+', min: 81, max: Infinity, icon: 'speedometer', color: '#FF5722' },
  ];

  // Build real counts from trip avgSpeed data
  const counts = buckets.map(b =>
    trips.filter(t => {
      const spd = t.avgSpeed || 0;
      return spd >= b.min && spd <= b.max;
    }).length
  );

  const total = counts.reduce((a, b) => a + b, 0);
  const hasData = total > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>Speed Range Distribution</Text>
      {!hasData ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="speedometer" size={36} color="#333" />
          <Text style={styles.emptyText}>No trip data yet</Text>
          <Text style={styles.emptySubText}>Record rides to see speed distribution</Text>
        </View>
      ) : (
        <View style={styles.chartBody}>
          {buckets.map((b, idx) => {
            const percentage = total > 0 ? Math.round((counts[idx] / total) * 100) : 0;
            return (
              <View key={b.label} style={styles.row}>
                <MaterialCommunityIcons name={b.icon as any} size={16} color={b.color} style={styles.icon} />
                <Text style={styles.label}>{b.label} km/h</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${percentage}%` as any, backgroundColor: b.color }]} />
                </View>
                <Text style={styles.percentage}>{percentage}%</Text>
              </View>
            );
          })}
        </View>
      )}
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptySubText: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
  },
  chartBody: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
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
