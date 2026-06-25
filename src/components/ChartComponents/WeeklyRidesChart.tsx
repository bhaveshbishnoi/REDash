import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface WeeklyRidesChartProps {
  data: Record<string, number>;
}

export default function WeeklyRidesChart({ data }: WeeklyRidesChartProps) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const values = days.map(d => data[d] || 0);
  const maxVal = Math.max(...values, 1);

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>Weekly Rides Frequency</Text>
      <View style={styles.chartBody}>
        {days.map((day, idx) => {
          const val = values[idx];
          const barHeight = (val / maxVal) * 120;
          return (
            <View key={day} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: barHeight }]} />
              </View>
              <Text style={styles.barLabel}>{day.substring(0, 3)}</Text>
              <Text style={styles.barValue}>{val}</Text>
            </View>
          );
        })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 12,
    height: 120,
    backgroundColor: '#121212',
    borderRadius: 6,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    color: '#888888',
    marginTop: 6,
  },
  barValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
});
