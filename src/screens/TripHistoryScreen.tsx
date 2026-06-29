import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllTrips } from '../services/tripService';
import { useIsFocused } from '@react-navigation/native';

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    const loadTrips = async () => {
      setLoading(true);
      try {
        const tripsData = await getAllTrips();
        setTrips(tripsData);
      } catch (e) {
        console.error("Error loading trips", e);
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
        loadTrips();
    }
  }, [isFocused]);

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Ride History
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#ff4500" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No rides recorded yet. Start a ride from the dashboard!</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tripCard,
                { borderLeftColor: item.terrainType === 'highway' ? '#ff4500' : '#4ecdc4' }
              ]}
            >
              <View style={styles.row}>
                <View style={styles.leftCol}>
                  <Text style={styles.dateText}>
                    {new Date(item.startTime).toLocaleDateString()} at {new Date(item.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                  <Text style={styles.statsText}>
                    {(item.distance || 0).toFixed(1)} km • {formatDuration(item.duration)} • {item.timeOfDay === 'day' ? 'Day' : 'Night'}
                  </Text>
                </View>
                <View style={styles.rightCol}>
                  <MaterialCommunityIcons 
                     name={item.terrainType === 'highway' ? 'highway' : 'city'} 
                     size={24} 
                     color={item.terrainType === 'highway' ? '#ff4500' : '#4ecdc4'} 
                  />
                  <Text style={styles.avgSpeedText}>
                    {Math.round(item.avgSpeed || 0)} km/h avg
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 20,
        backgroundColor: '#1A1A1A',
        paddingTop: 60
    },
    title: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        marginBottom: 20,
        color: '#fff'
    },
    emptyText: {
        color: '#aaa',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16
    },
    tripCard: {
        padding: 18,
        marginVertical: 8,
        backgroundColor: '#2A2A2A',
        borderLeftWidth: 6,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84
    },
    row: { 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    leftCol: { 
        flex: 1 
    },
    dateText: { 
        fontSize: 16, 
        fontWeight: 'bold',
        color: '#fff'
    },
    statsText: { 
        fontSize: 13, 
        color: '#aaa', 
        marginTop: 6 
    },
    rightCol: { 
        alignItems: 'flex-end',
        paddingLeft: 10
    },
    emojiText: { 
        fontSize: 24 
    },
    avgSpeedText: { 
        fontSize: 12, 
        color: '#aaa', 
        marginTop: 6,
        fontWeight: 'bold'
    }
});
