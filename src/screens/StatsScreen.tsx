import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getUserStats, getRidingPatterns } from '../services/analyticsService';
import WeeklyRidesChart from '../components/ChartComponents/WeeklyRidesChart';
import SpeedDistributionChart from '../components/ChartComponents/SpeedDistributionChart';
import FuelEfficiencyChart from '../components/ChartComponents/FuelEfficiencyChart';
import StatCard from '../components/StatCard';

export default function StatsScreen() {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [patterns, setPatterns] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await getUserStats();
      const p = await getRidingPatterns();
      setStats(s);
      setPatterns(p);
    } catch (e) {
      console.warn('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

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

      <WeeklyRidesChart data={patterns.byDay} />
      <SpeedDistributionChart />
      <FuelEfficiencyChart />
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
