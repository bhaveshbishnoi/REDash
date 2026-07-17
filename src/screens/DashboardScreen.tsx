import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootState } from '../store/store';
import { startTrip, endTrip, recordTripSegment } from '../services/tripService';
import { setBikeDisconnected } from '../store/bikeSlice';
import { disconnectFromTripper } from '../services/wifiService';
import LiveSpeedometer from '../components/LiveSpeedometer';

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { ssid, k1gConnected } = useSelector((state: RootState) => state.bike);

  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Automatically start trip & telemetry services on mount / connection
  useEffect(() => {
    let isMounted = true;
    const autoStartServices = async () => {
      if (!activeTripId && isMounted) {
        console.log('[Dashboard] Auto-starting ride segment & telemetry tracking…');
        const tripId = await startTrip();
        if (isMounted) setActiveTripId(tripId);
      }
    };
    autoStartServices();
    return () => { isMounted = false; };
  }, [activeTripId]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const setupLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5
        },
        (location) => {
          const speedInKmH = (location.coords.speed || 0) * 3.6;
          const displaySpeed = Math.max(0, Math.round(speedInKmH));

          setCurrentSpeed(displaySpeed);
          setMaxSpeed(prev => Math.max(prev, displaySpeed));

          // Automatically record segment & telemetry in background
          if (activeTripId) {
            recordTripSegment(activeTripId, displaySpeed, location.coords);
          }
        }
      );
    };

    setupLocation();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [activeTripId]);

  const handleDisconnect = async () => {
    if (activeTripId) {
      await endTrip(activeTripId);
      setActiveTripId(null);
    }
    if (ssid && ssid !== 'OFFLINE_MODE') {
      await disconnectFromTripper();
    }
    dispatch(setBikeDisconnected());
  };

  const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;

  return (
    <SafeAreaView style={[styles.container, styles.darkContainer]} edges={['top', 'left', 'right']}>
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0E14" />
        <View style={styles.header}>
          <View style={styles.networkBadge}>
            <MaterialCommunityIcons
              name={ssid === 'OFFLINE_MODE' ? 'wifi-off' : 'wifi'}
              size={14}
              color={ssid === 'OFFLINE_MODE' ? '#888' : '#00E676'}
            />
            <Text style={styles.networkText}>
              {ssid === 'OFFLINE_MODE' ? 'Offline Mode' : ssid || 'Dash Connected'}
            </Text>
          </View>
          <View style={styles.k1gBadge}>
            <MaterialCommunityIcons name="check-circle" size={12} color="#000" />
            <Text style={styles.k1gBadgeText}>
              {k1gConnected ? 'K1G Sync Active ⚡' : 'Auto-Track Active ⚡'}
            </Text>
          </View>
        </View>

        {/* Speedometer Gauge */}
        <LiveSpeedometer speed={currentSpeed} maxSpeed={maxSpeed} />

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="speedometer" size={22} color="#FF5722" />
            <Text style={styles.statLabel}>TOP SPEED</Text>
            <Text style={styles.statValue}>{maxSpeed} km/h</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="road-variant" size={22} color="#00E676" />
            <Text style={styles.statLabel}>MODE</Text>
            <Text style={styles.statValue}>{currentSpeed > 50 ? 'Highway' : 'Urban'}</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name={isDay ? 'weather-sunny' : 'weather-night'} size={22} color="#FFB300" />
            <Text style={styles.statLabel}>STATUS</Text>
            <Text style={styles.statValue}>Auto-Syncing</Text>
          </View>
        </View>

        {/* Action & Auto-Tracking Bar */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/map')}
            style={styles.mapShortcutBtn}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="map-marker-radius" size={20} color="#FFFFFF" />
            <Text style={styles.mapShortcutText}>Dash Maps & Nav</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDisconnect}
            style={styles.disconnectButton}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="power" size={20} color="#FF5722" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  darkContainer: {
    backgroundColor: '#0B0E14',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161B26',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262D3D',
  },
  networkText: {
    color: '#E0E6ED',
    fontSize: 13,
    fontWeight: '600',
  },
  k1gBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00E676',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  k1gBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
    marginVertical: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#151A24',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222938',
  },
  statLabel: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 14,
    marginTop: 10,
  },
  mapShortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    gap: 8,
  },
  mapShortcutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disconnectButton: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#161B26',
    borderWidth: 1,
    borderColor: '#FF572244',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
