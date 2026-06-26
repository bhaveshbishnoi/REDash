import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getAllTrips } from '../services/tripService';
import WeeklyRidesChart from '../components/ChartComponents/WeeklyRidesChart';
import SpeedDistributionChart from '../components/ChartComponents/SpeedDistributionChart';
import FuelEfficiencyChart from '../components/ChartComponents/FuelEfficiencyChart';
import StatCard from '../components/StatCard';

export default function StatsScreen() {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const allTrips = await getAllTrips();
      
      let totalDistance = 0;
      let bestSpeed = 0;
      let totalSpeed = 0;
      let longestRideTime = 0;
      let totalRidingTime = 0;
      
      const byDay: Record<string, number> = {
          'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
      };
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (const t of allTrips as any[]) {
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
          totalRides: allTrips.length,
          bestSpeed: bestSpeed.toFixed(1),
          avgSpeed: allTrips.length > 0 ? (totalSpeed / allTrips.length).toFixed(1) : '0',
          longestRideTime: longestRideTime.toFixed(0),
          totalRidingTime: totalRidingTime.toFixed(0),
          byDay
      });
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
      <WeeklyRidesChart data={stats.byDay} />
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
