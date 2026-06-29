import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet as RNStyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { getCurrentPosition } from '../services/locationService';

export default function MapScreenWeb() {
  const trip = useSelector((state: RootState) => state.trip);
  const [position, setPosition] = useState({ latitude: 28.6139, longitude: 77.2090 });

  useEffect(() => {
    if (trip.active && trip.coordinates.length > 0) {
      const last = trip.coordinates[trip.coordinates.length - 1];
      setPosition({ latitude: last.latitude, longitude: last.longitude });
    } else {
      getCurrentPosition().then(pos => {
        setPosition({ latitude: pos.latitude, longitude: pos.longitude });
      });
    }
  }, [trip.active, trip.coordinates]);

  return (
    <RNView style={styles.container}>
      {/* Interactive web map placeholder styled beautifully like a futuristic cockpit display */}
      <RNView style={styles.mapMock}>
        <RNView style={styles.gridLines} />
        
        {/* Draw coordinates using standard SVG when there is an active ride */}
        {trip.coordinates.length > 0 ? (
          <svg style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={trip.coordinates.map((c, i) => `${(c.longitude - 77.2090) * 1000 + 50},${(28.6139 - c.latitude) * 1000 + 50}`).join(' ')}
              fill="none"
              stroke="#FF5722"
              strokeWidth="3"
            />
          </svg>
        ) : (
          <RNView style={styles.radarRing} />
        )}
        
        <RNView style={styles.marker}>
          <MaterialCommunityIcons name={"motorcycle" as any} size={32} color="#fff" />
        </RNView>

        <RNView style={styles.coordsPanel}>
          <RNText style={styles.coordsHeading}>GPS Satellite Fix</RNText>
          <RNText style={styles.coordsText}>LAT: {position.latitude.toFixed(6)}</RNText>
          <RNText style={styles.coordsText}>LNG: {position.longitude.toFixed(6)}</RNText>
        </RNView>
      </RNView>

      {trip.active && (
        <RNView style={styles.overlayPanel}>
          <RNText style={styles.title}>Live Ride Tracking (Web Sim)</RNText>
          <RNText style={styles.detail}>{trip.distance} km traveled</RNText>
        </RNView>
      )}
    </RNView>
  );
}

const styles = RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMock: {
    width: '90%',
    height: '70%',
    backgroundColor: '#151515',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.05,
    borderWidth: 1,
    borderColor: '#fff',
    borderStyle: 'dashed',
  },
  radarRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FF5722',
    opacity: 0.3,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontSize: 32,
  },
  coordsPanel: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  coordsHeading: {
    color: '#FF5722',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  coordsText: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  overlayPanel: {
    position: 'absolute',
    bottom: 24,
    left: '5%',
    right: '5%',
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
