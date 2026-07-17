import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootState } from '../store/store';
import { getCurrentPosition } from '../services/locationService';

export default function MapScreen() {
  const trip = useSelector((state: RootState) => state.trip);
  const mapRef = useRef<MapView>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });

  useEffect(() => {
    // Get initial location once on mount
    if (trip.coordinates.length > 0) {
      const last = trip.coordinates[trip.coordinates.length - 1];
      setInitialRegion({
        latitude: last.latitude,
        longitude: last.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
    } else {
      getCurrentPosition().then(pos => {
        setInitialRegion({
          latitude: pos.latitude,
          longitude: pos.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      });
    }
  }, []);

  useEffect(() => {
    if (isFollowing && trip.active && trip.coordinates.length > 0 && mapRef.current) {
      const last = trip.coordinates[trip.coordinates.length - 1];
      mapRef.current.animateToRegion(
        {
          latitude: last.latitude,
          longitude: last.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );
    }
  }, [trip.coordinates, isFollowing, trip.active]);

  const handleRecenter = () => {
    setIsFollowing(true);
    if (trip.coordinates.length > 0 && mapRef.current) {
      const last = trip.coordinates[trip.coordinates.length - 1];
      mapRef.current.animateToRegion({
        latitude: last.latitude,
        longitude: last.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500);
    } else {
      getCurrentPosition().then(pos => {
        mapRef.current?.animateToRegion({
          latitude: pos.latitude,
          longitude: pos.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }, 500);
      });
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' && !process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#212121' }]}>
           <Text style={{color: '#fff', textAlign: 'center', padding: 20}}>
             Map unavailable.{'\n'}
             Please configure EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local and rebuild the app.
           </Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          customMapStyle={darkMapStyle}
          showsUserLocation
          onPanDrag={() => setIsFollowing(false)}
        >
          {trip.coordinates.length > 0 && (
            <>
              <Polyline
                coordinates={trip.coordinates}
                strokeColor="#FF5722"
                strokeWidth={4}
              />
              <Marker
                coordinate={trip.coordinates[0]}
                title="Start Point"
                pinColor="#00E676"
              />
              <Marker
                coordinate={trip.coordinates[trip.coordinates.length - 1]}
                title="Current Position"
                pinColor="#FF3D00"
              />
            </>
          )}
        </MapView>
      )}

      {/* Recenter / Follow Toggle */}
      <TouchableOpacity
        style={[styles.recenterButton, isFollowing && styles.recenterButtonActive]}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name={isFollowing ? 'crosshairs-gps' : 'crosshairs'}
          size={24}
          color={isFollowing ? '#FF5722' : '#FFFFFF'}
        />
      </TouchableOpacity>

      {trip.active && (
        <View style={styles.overlayPanel}>
          <Text style={styles.title}>Live Ride Tracking</Text>
          <Text style={styles.detail}>{trip.distance} km traveled</Text>
        </View>
      )}
    </View>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "landscape", "elementType": "geometry.fill", "stylers": [{ "color": "#121212" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  overlayPanel: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detail: {
    color: '#FF5722',
    fontSize: 14,
    marginTop: 4,
    fontWeight: 'bold',
  },
  recenterButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  recenterButtonActive: {
    borderColor: '#FF5722',
    backgroundColor: 'rgba(30, 20, 20, 0.95)',
  },
});
