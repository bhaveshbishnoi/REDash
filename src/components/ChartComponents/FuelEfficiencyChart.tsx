import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FuelEfficiencyChart() {
  const points = [
    { trip: 'Trip A', value: 31.2 },
    { trip: 'Trip B', value: 34.5 },
    { trip: 'Trip C', value: 30.1 },
    { trip: 'Trip D', value: 35.8 },
    { trip: 'Trip E', value: 32.7 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>Fuel Efficiency History (km/l)</Text>
      <View style={styles.chartBody}>
        {points.map((p, idx) => (
          <View key={idx} style={styles.barItem}>
            <Text style={styles.valueText}>{p.value}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: (p.value / 40) * 100 }]} />
            </View>
            <Text style={styles.labelText}>{p.trip}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
  },
  barItem: {
    alignItems: 'center',
  },
  valueText: {
    fontSize: 11,
    color: '#00E676',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  barTrack: {
    width: 16,
    height: 100,
    backgroundColor: '#121212',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#00E676',
  },
  labelText: {
    fontSize: 10,
    color: '#888888',
    marginTop: 6,
  },
});
