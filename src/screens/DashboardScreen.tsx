import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  startNewTrip, 
  updateTripStats, 
  incrementTripDuration, 
  updateTripDistance,
  resetTrip
} from '../store/tripSlice';
import { subscribeToSpeedUpdates } from '../services/bluetoothService';
import { startLocationTracking, getCurrentPosition } from '../services/locationService';
import { startTrip as apiStartTrip, addTripSegment as apiAddSegment, endTrip as apiEndTrip } from '../services/tripService';
import LiveSpeedometer from '../components/LiveSpeedometer';
import SpeedEmoji from '../components/SpeedEmoji';
import BluetoothStatus from '../components/BluetoothStatus';
import { calculateDistance } from '../utils/geoUtils';

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const bike = useSelector((state: RootState) => state.bike);
  const trip = useSelector((state: RootState) => state.trip);

  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSessionSpeed, setMaxSessionSpeed] = useState(0);

  const locationUnsubscribeRef = useRef<(() => void) | null>(null);
  const speedUnsubscribeRef = useRef<(() => void) | null>(null);
  const timerIntervalRef = useRef<any | null>(null);
  
  // Track last coordinate to calculate distance increments
  const lastCoordRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Subscribe to speed updates from bluetooth device
  useEffect(() => {
    if (bike.connected && bike.connectedDevice) {
      const unsub = subscribeToSpeedUpdates(bike.connectedDevice.id, (speed) => {
        setCurrentSpeed(speed);
        if (speed > maxSessionSpeed) {
          setMaxSessionSpeed(speed);
        }
      });
      speedUnsubscribeRef.current = unsub;
    }

    return () => {
      if (speedUnsubscribeRef.current) speedUnsubscribeRef.current();
    };
  }, [bike.connected, bike.connectedDevice, maxSessionSpeed]);

  const handleStartTrip = async () => {
    try {
      const pos = await getCurrentPosition();
      const tripId = await apiStartTrip(pos.latitude, pos.longitude);
      
      dispatch(startNewTrip({
        tripId,
        startTime: new Date().toISOString(),
      }));

      lastCoordRef.current = pos;

      // Start GPS location watch
      const unsubLoc = await startLocationTracking(bike.simulated, (coords) => {
        // Calculate distance increment
        if (lastCoordRef.current) {
          const dist = calculateDistance(
            lastCoordRef.current.latitude,
            lastCoordRef.current.longitude,
            coords.latitude,
            coords.longitude
          );
          if (dist > 0.01) { // filter noise
            dispatch(updateTripDistance(dist));
            lastCoordRef.current = { latitude: coords.latitude, longitude: coords.longitude };
          }
        } else {
          lastCoordRef.current = { latitude: coords.latitude, longitude: coords.longitude };
        }

        // Add segment and update stats
        const segment = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: currentSpeed,
          timestamp: new Date().toISOString(),
          altitude: coords.altitude || undefined,
          heading: coords.heading || undefined,
        };

        dispatch(updateTripStats({ speed: currentSpeed, segment }));
        apiAddSegment(coords.latitude, coords.longitude, currentSpeed);
      });

      locationUnsubscribeRef.current = unsubLoc;

      // Start duration increment timer
      timerIntervalRef.current = setInterval(() => {
        dispatch(incrementTripDuration(1));
      }, 1000);

    } catch (e: any) {
      Alert.alert('Error', 'Failed to start trip recording');
    }
  };

  const handleEndTrip = async () => {
    if (!trip.tripId) return;

    // Clean up timers and subscriptions
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (locationUnsubscribeRef.current) {
      locationUnsubscribeRef.current();
      locationUnsubscribeRef.current = null;
    }

    try {
      const endLat = lastCoordRef.current?.latitude || 28.6139;
      const endLng = lastCoordRef.current?.longitude || 77.2090;
      
      await apiEndTrip(endLat, endLng, trip.distance, trip.duration);
      Alert.alert('Trip Saved', `Distance: ${trip.distance} km\nDuration: ${Math.round(trip.duration / 60)} mins`);
    } catch (e) {
      Alert.alert('Warning', 'Failed to sync trip online, cached locally.');
    } finally {
      dispatch(resetTrip());
      lastCoordRef.current = null;
    }
  };

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
  };

  return (
    <ImageBackground
      source={settings.wallpaperUrl ? { uri: settings.wallpaperUrl } : undefined}
      style={[styles.container, !settings.wallpaperUrl && { backgroundColor: '#0B0B0B' }]}
    >
      <View style={styles.overlay}>
        <BluetoothStatus />

        <View style={styles.speedometerContainer}>
          <LiveSpeedometer speed={currentSpeed} maxSpeed={maxSessionSpeed} />
          <SpeedEmoji speed={currentSpeed} size={70} />
        </View>

        {trip.active ? (
          <View style={styles.tripConsole}>
            <Text style={styles.tripHeading}>🔴 Recording Trip</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{trip.distance} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{formatDuration(trip.duration)}</Text>
                <Text style={styles.statLabel}>Time</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{trip.avgSpeed} km/h</Text>
                <Text style={styles.statLabel}>Avg Speed</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.tripButton, styles.stopBtn]} onPress={handleEndTrip}>
              <Text style={styles.tripButtonText}>Stop Recording</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tripConsole}>
            <Text style={styles.readyText}>Ignition Connected & Ready</Text>
            <TouchableOpacity style={[styles.tripButton, styles.startBtn]} onPress={handleStartTrip}>
              <Text style={styles.tripButtonText}>Start New Ride</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  speedometerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tripConsole: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  tripHeading: {
    fontSize: 14,
    color: '#FF3D00',
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  readyText: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 4,
  },
  tripButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: '#FF5722',
  },
  stopBtn: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#FF3D00',
  },
  tripButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
