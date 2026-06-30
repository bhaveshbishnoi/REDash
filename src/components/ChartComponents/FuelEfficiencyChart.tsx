import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  trips: any[];
}

export default function FuelEfficiencyChart({ trips }: Props) {
  // Only show trips that have valid distance and duration data
  const validTrips = trips
    .filter(t => t.distance > 0 && t.duration > 0)
    .slice(-6); // show last 6 trips

  const hasData = validTrips.length > 0;

  // Royal Enfield Guerrilla 450 rated ~35 km/l
  // Estimate fuel used from distance with a real-world factor
  const getEstimatedEfficiency = (trip: any): number => {
    const avgSpd = trip.avgSpeed || 0;
    // Base efficiency model: optimal at ~60 km/h, degrades at extremes
    let base = 35;
    if (avgSpd > 80) base = 28;
    else if (avgSpd > 60) base = 32;
    else if (avgSpd < 20) base = 25;
    return Math.round(base * 10) / 10;
  };

  const maxEfficiency = hasData
    ? Math.max(...validTrips.map(getEstimatedEfficiency), 40)
    : 40;

  const formatLabel = (trip: any): string => {
    const d = new Date(trip.startTime);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>Fuel Efficiency per Ride (km/l)</Text>
      {!hasData ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="gas-station" size={36} color="#333" />
          <Text style={styles.emptyText}>No trip data yet</Text>
          <Text style={styles.emptySubText}>Complete rides to see fuel efficiency estimates</Text>
        </View>
      ) : (
        <View style={styles.chartBody}>
          {validTrips.map((trip, idx) => {
            const eff = getEstimatedEfficiency(trip);
            const barHeight = (eff / maxEfficiency) * 100;
            return (
              <View key={trip.id || idx} style={styles.barItem}>
                <Text style={styles.valueText}>{eff}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: barHeight }]} />
                </View>
                <Text style={styles.labelText}>{formatLabel(trip)}</Text>
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
