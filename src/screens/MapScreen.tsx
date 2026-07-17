import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootState } from '../store/store';
import { getCurrentPosition } from '../services/locationService';
import { k1gProtocol } from '../services/k1gProtocol';

interface Destination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: string;
  turn: string;
}

const PRESET_DESTINATIONS: Destination[] = [
  {
    id: 'dest_1',
    name: 'Rohtang Pass North Tunnel',
    latitude: 32.3653,
    longitude: 77.1685,
    distance: '24.8',
    turn: 'Turn Right onto NH-3 Mountain Pass',
  },
  {
    id: 'dest_2',
    name: 'Manali Highway Checkpoint',
    latitude: 32.2432,
    longitude: 77.1892,
    distance: '12.4',
    turn: 'Keep Left on River Expressway',
  },
  {
    id: 'dest_3',
    name: 'Royal Enfield Flagship Hub',
    latitude: 28.6139,
    longitude: 77.2090,
    distance: '4.2',
    turn: 'Turn Left onto Central Avenue',
  },
  {
    id: 'dest_4',
    name: 'Goa Coastal Expressway',
    latitude: 15.4989,
    longitude: 73.8278,
    distance: '86.5',
    turn: 'Continue Straight on Coastal Route 66',
  },
];

export default function MapScreen() {
  const trip = useSelector((state: RootState) => state.trip);
  const mapRef = useRef<MapView>(null);

  const [currentPos, setCurrentPos] = useState({ latitude: 28.6139, longitude: 77.2090 });
  const [selectedDest, setSelectedDest] = useState<Destination>(PRESET_DESTINATIONS[0]);
  const [isPushing, setIsPushing] = useState(false);
  const [dashNavActive, setDashNavActive] = useState(false);

  useEffect(() => {
    getCurrentPosition().then(pos => {
      setCurrentPos({ latitude: pos.latitude, longitude: pos.longitude });
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: pos.latitude,
          longitude: pos.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 600);
      }
    }).catch(() => {});
  }, []);

  const handleSelectPreset = (dest: Destination) => {
    setSelectedDest(dest);
    setDashNavActive(false);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: dest.latitude,
        longitude: dest.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }, 600);
    }
  };

  const handleMapPress = (coord: { latitude: number; longitude: number }) => {
    // Calculate approximate straight-line distance in km from current position
    const dLat = (coord.latitude - currentPos.latitude) * 111;
    const dLon = (coord.longitude - currentPos.longitude) * 111 * Math.cos(currentPos.latitude * (Math.PI / 180));
    const distKm = Math.sqrt(dLat * dLat + dLon * dLon).toFixed(1);

    const customDest: Destination = {
      id: `custom_${Date.now()}`,
      name: `Custom Waypoint (${coord.latitude.toFixed(3)}, ${coord.longitude.toFixed(3)})`,
      latitude: coord.latitude,
      longitude: coord.longitude,
      distance: distKm,
      turn: 'Navigate towards Custom Destination Pin',
    };

    setSelectedDest(customDest);
    setDashNavActive(false);
  };

  const handlePushToDash = async () => {
    setIsPushing(true);
    try {
      await k1gProtocol.sendNavigationCommand(selectedDest.name, selectedDest.turn, `${selectedDest.distance} km`);
      setDashNavActive(true);
      Alert.alert(
        'Tripper Dash Updated ⚡',
        `Route to "${selectedDest.name}" is now live on your Royal Enfield bike dash display screen over K1G UDP port 2002!`
      );
    } catch {
      Alert.alert('Error', 'Could not sync route with Tripper Dash.');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' && !process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <View style={[styles.map, styles.fallbackContainer]}>
          <MaterialCommunityIcons name="map-marker-off" size={48} color="#FF5722" />
          <Text style={styles.fallbackTitle}>Google Maps API Key Required</Text>
          <Text style={styles.fallbackText}>
            Please add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file. Meanwhile, you can select destination presets below and sync navigation commands with your bike dash directly.
          </Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: currentPos.latitude,
            longitude: currentPos.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }}
          customMapStyle={darkMapStyle}
          showsUserLocation
          onPress={(e) => handleMapPress(e.nativeEvent.coordinate)}
        >
          {/* Current Position Marker */}
          <Marker
            coordinate={currentPos}
            title="My Current Location"
            pinColor="#00E676"
          />

          {/* Selected Destination Marker */}
          <Marker
            coordinate={{ latitude: selectedDest.latitude, longitude: selectedDest.longitude }}
            title={selectedDest.name}
            description={`${selectedDest.distance} km away • ${selectedDest.turn}`}
            pinColor="#FF5722"
          />

          {/* Route Line connecting Current Position and Selected Destination */}
          <Polyline
            coordinates={[
              currentPos,
              { latitude: selectedDest.latitude, longitude: selectedDest.longitude }
            ]}
            strokeColor="#FF5722"
            strokeWidth={4}
            lineDashPattern={[6, 3]}
          />
        </MapView>
      )}

      {/* Top Selector Card - Choose Preset or Tap Map */}
      <View style={styles.topSelectorCard}>
        <View style={styles.topHeaderRow}>
          <MaterialCommunityIcons name="navigation" size={18} color="#FF5722" />
          <Text style={styles.topTitle}>Select Destination for Bike Dash</Text>
        </View>
        <Text style={styles.topHint}>Tap anywhere on map or pick preset below to send route to Tripper Dash:</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
          {PRESET_DESTINATIONS.map((preset) => {
            const isSelected = selectedDest.id === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                onPress={() => handleSelectPreset(preset)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={14}
                  color={isSelected ? '#FFFFFF' : '#FF5722'}
                />
                <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom Route Panel & Dash Push Control */}
      <View style={styles.overlayPanel}>
        <View style={styles.destHeaderRow}>
          <View style={styles.destInfoWrap}>
            <Text style={styles.destName} numberOfLines={1}>{selectedDest.name}</Text>
            <Text style={styles.destDetail}>
              {selectedDest.distance} km away • {selectedDest.turn}
            </Text>
          </View>
          {dashNavActive && (
            <View style={styles.activeBadge}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#000" />
              <Text style={styles.activeBadgeText}>Dash Active</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.pushDashBtn, dashNavActive && styles.pushDashBtnActive]}
          onPress={handlePushToDash}
          disabled={isPushing}
          activeOpacity={0.8}
        >
          {isPushing ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <MaterialCommunityIcons
              name={dashNavActive ? 'refresh' : 'send-circle'}
              size={22}
              color="#fff"
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={styles.pushDashBtnText}>
            {isPushing ? 'Syncing Route with Dash…' : dashNavActive ? 'Update Route on Bike Dash ⚡' : 'Push Route to Tripper Dash ⚡'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#181C26" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8A99AD" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#181C26" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2C3446" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#A0AEBA" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0B0E14" }] }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121620',
    padding: 24,
    gap: 12,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fallbackText: {
    color: '#8A99AD',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  topSelectorCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(18, 22, 32, 0.95)',
    borderWidth: 1,
    borderColor: '#262D3D',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  topHint: {
    color: '#8A99AD',
    fontSize: 11,
    marginBottom: 10,
  },
  presetScroll: {
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1C2230',
    borderWidth: 1,
    borderColor: '#2D364C',
    gap: 6,
  },
  presetChipSelected: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  presetText: {
    color: '#C3CEDD',
    fontSize: 12,
    fontWeight: '600',
  },
  presetTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  overlayPanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 80,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 18, 26, 0.96)',
    borderWidth: 1,
    borderColor: '#2C3446',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  destHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  destInfoWrap: {
    flex: 1,
  },
  destName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  destDetail: {
    color: '#FF5722',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E676',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  activeBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pushDashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  pushDashBtnActive: {
    backgroundColor: '#1E88E5',
    shadowColor: '#1E88E5',
  },
  pushDashBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
