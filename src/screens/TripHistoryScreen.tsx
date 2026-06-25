import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { fetchAllTrips } from '../services/analyticsService';
import { getTerrainEmoji, getTimeOfDayEmoji } from '../utils/calculations';

export default function TripHistoryScreen() {
  const isFocused = useIsFocused();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const data = await fetchAllTrips();
      setTrips(data);
    } catch (e) {
      console.warn('Failed to load trips history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadTrips();
    }
  }, [isFocused]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    return `${mins} min`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#FF5722" style={styles.loader} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.date}>{formatDate(item.startTime)}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.emoji}>{getTerrainEmoji(item.terrainType)}</Text>
                  <Text style={styles.emoji}>{getTimeOfDayEmoji(item.startTime.getHours())}</Text>
                  <Text style={[styles.syncBadge, item.synced ? styles.synced : styles.offline]}>
                    {item.synced ? 'Synced' : 'Offline'}
                  </Text>
                </View>
              </View>

              <View style={styles.stats}>
                <View style={styles.statItem}>
                  <Text style={styles.value}>{item.distance} km</Text>
                  <Text style={styles.label}>Distance</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.value}>{formatDuration(item.duration)}</Text>
                  <Text style={styles.label}>Time</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.value}>{item.avgSpeed} km/h</Text>
                  <Text style={styles.label}>Avg Speed</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No rides recorded yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingBottom: 12,
    marginBottom: 12,
  },
  date: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 16,
  },
  syncBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  synced: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    color: '#00E676',
  },
  offline: {
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
    color: '#FF9100',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  label: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#666666',
  },
});
