import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { getCurrentPosition } from '../services/locationService';

export default function MapScreen() {
  const trip = useSelector((state: RootState) => state.trip);
  const [currentRegion, setCurrentRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });

  useEffect(() => {
    if (trip.active && trip.coordinates.length > 0) {
      const last = trip.coordinates[trip.coordinates.length - 1];
      setCurrentRegion(prev => ({
        ...prev,
        latitude: last.latitude,
        longitude: last.longitude,
      }));
    } else {
      // Get current location on screen mount
      getCurrentPosition().then(pos => {
        setCurrentRegion(prev => ({
          ...prev,
          latitude: pos.latitude,
          longitude: pos.longitude,
        }));
      });
    }
  }, [trip.active, trip.coordinates]);

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
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={currentRegion}
          customMapStyle={darkMapStyle}
          showsUserLocation
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
});
