import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getAllTrips } from '../services/tripService';
import WeeklyRidesChart from '../components/ChartComponents/WeeklyRidesChart';
import SpeedDistributionChart from '../components/ChartComponents/SpeedDistributionChart';
import FuelEfficiencyChart from '../components/ChartComponents/FuelEfficiencyChart';
import StatCard from '../components/StatCard';

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [allTrips, setAllTrips] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!stats) {
      setLoading(true);
    }
    try {
      const trips = await getAllTrips() as any[];
      setAllTrips(trips);

      let totalDistance = 0;
      let bestSpeed = 0;
      let totalSpeed = 0;
      let longestRideTime = 0;
      let totalRidingTime = 0;

      const byDay: Record<string, number> = {
        'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
      };

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (const t of trips) {
        totalDistance += (t.distance || 0);
        bestSpeed = Math.max(bestSpeed, t.maxSpeed || 0);
        totalSpeed += (t.avgSpeed || 0);
        longestRideTime = Math.max(longestRideTime, t.duration || 0);
        totalRidingTime += (t.duration || 0);

        if (t.startTime) {
          const dayName = days[new Date(t.startTime).getDay()];
          byDay[dayName] += 1;
        }
      }

      setStats({
        totalDistance: totalDistance.toFixed(1),
        totalRides: trips.length,
        bestSpeed: bestSpeed.toFixed(1),
        avgSpeed: trips.length > 0 ? (totalSpeed / trips.length).toFixed(1) : '0',
        longestRideTime: longestRideTime.toFixed(0),
        totalRidingTime: totalRidingTime.toFixed(0),
        byDay
      });
    } catch (e) {
      console.warn('Failed to load stats:', e);
      if (!stats) {
        setStats({
          totalDistance: '0.0', totalRides: 0, bestSpeed: '0.0',
          avgSpeed: '0', longestRideTime: '0', totalRidingTime: '0',
          byDay: { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 }
        });
      }
    } finally {
      setLoading(false);
    }
  }, [stats]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading || !stats) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <StatCard label="Total Distance" value={`${stats.totalDistance} km`} />
        <StatCard label="Total Rides" value={stats.totalRides} />
      </View>

      <View style={styles.row}>
        <StatCard label="Best Speed" value={`${stats.bestSpeed} km/h`} />
        <StatCard label="Avg Speed" value={`${stats.avgSpeed} km/h`} />
      </View>

      <View style={styles.row}>
        <StatCard label="Longest Ride" value={`${stats.longestRideTime} mins`} />
        <StatCard label="Riding Time" value={`${stats.totalRidingTime} mins`} />
      </View>
      <WeeklyRidesChart data={stats.byDay} />
      <SpeedDistributionChart trips={allTrips} />
      <FuelEfficiencyChart trips={allTrips} />
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
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
