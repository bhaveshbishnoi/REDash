import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { RootState } from '../store/store';
import { getSpeedEmoji } from '../utils/calculations';
import { startTrip, endTrip, recordTripSegment } from '../services/tripService';
import { setBikeDisconnected } from '../store/bikeSlice';
import { disconnectFromTripper } from '../services/wifiService';

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const { ssid, k1gConnected } = useSelector((state: RootState) => state.bike);
  
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [wallpaperPath, setWallpaperPath] = useState<string | null>(null);
  const [isRiding, setIsRiding] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

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
          distanceInterval: 10 
        },
        (location) => {
          // Speed is in m/s, convert to km/h
          const speedInKmH = (location.coords.speed || 0) * 3.6;
          const displaySpeed = Math.max(0, speedInKmH);
          
          setCurrentSpeed(displaySpeed);
          
          setMaxSpeed(prev => Math.max(prev, displaySpeed));

          if (isRiding && activeTripId) {
            recordTripSegment(activeTripId, displaySpeed);
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
  }, [isRiding, activeTripId]);

  const handleStartRide = async () => {
    if (isRiding) {
      // End ride
      if (activeTripId) {
        await endTrip(activeTripId);
      }
      setIsRiding(false);
      setActiveTripId(null);
    } else {
      // Start ride
      const tripId = await startTrip();
      setActiveTripId(tripId);
      setIsRiding(true);
      setMaxSpeed(0); // reset max speed for new ride
    }
  };

  const handleDisconnect = async () => {
    if (ssid && ssid !== 'OFFLINE_MODE') {
      await disconnectFromTripper();
    }
    dispatch(setBikeDisconnected());
  };

  const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;

  return (
    <ImageBackground
      source={wallpaperPath ? { uri: wallpaperPath } : require('../../assets/images/splash-icon.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.header}>
            <Text style={styles.networkText}>
                {ssid === 'OFFLINE_MODE' ? 'Offline Mode' : `Connected to: ${ssid}`}
            </Text>
            {k1gConnected && <Text style={styles.k1gBadge}>Dash Synced</Text>}
        </View>

        {/* Speed Display */}
        <Text style={styles.speedText}>
          {Math.round(currentSpeed)}
        </Text>
        <Text style={styles.speedLabel}>km/h</Text>

        {/* Speed Emoji */}
        <Text style={styles.emojiText}>
          {getSpeedEmoji(currentSpeed)}
        </Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statText}>
            Max Speed: {Math.round(maxSpeed)} km/h
          </Text>
          <Text style={styles.statText}>
            Terrain: {currentSpeed > 50 ? '🛣️ Highway' : '🏙️ City'}
          </Text>
          <Text style={styles.statText}>
            Time: {isDay ? '☀️ Day' : '🌙 Night'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleStartRide}
            style={[styles.button, { backgroundColor: isRiding ? '#ff4500' : '#00ff00' }]}
          >
            <Text style={[styles.buttonText, { color: isRiding ? '#fff' : '#000' }]}>
              {isRiding ? 'End Ride' : 'Start Ride'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDisconnect}
            style={[styles.button, { backgroundColor: '#333' }]}
          >
            <Text style={styles.buttonText}>
              Disconnect
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#111'
    },
    overlay: {
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: 30, 
        borderRadius: 20,
        width: '85%'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 10
    },
    networkText: {
        color: '#ccc',
        fontSize: 14,
    },
    k1gBadge: {
        backgroundColor: '#00ff00',
        color: '#000',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 'bold',
        overflow: 'hidden'
    },
    speedText: {
        fontSize: 84, 
        fontWeight: 'bold', 
        color: '#fff', 
        marginBottom: -10 
    },
    speedLabel: {
        fontSize: 18, 
        color: '#ccc', 
        marginBottom: 20 
    },
    emojiText: {
        fontSize: 70, 
        marginBottom: 20 
    },
    statsContainer: {
        marginTop: 20, 
        gap: 10,
        alignItems: 'center'
    },
    statText: {
        color: '#fff', 
        fontSize: 16, 
        textAlign: 'center'
    },
    buttonContainer: {
        flexDirection: 'row', 
        gap: 15, 
        marginTop: 40 
    },
    button: {
        paddingVertical: 14, 
        paddingHorizontal: 24, 
        borderRadius: 12,
        minWidth: 120,
        alignItems: 'center'
    },
    buttonText: {
        color: '#fff', 
        fontWeight: 'bold', 
        fontSize: 16 
    }
});
