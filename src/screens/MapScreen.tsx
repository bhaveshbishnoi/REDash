import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Platform,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Keyboard
} from 'react-native';
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
  etaMinutes: number;
}

const PRESET_DESTINATIONS: Destination[] = [
  {
    id: 'dest_1',
    name: 'Rohtang Pass North Tunnel',
    latitude: 32.3653,
    longitude: 77.1685,
    distance: '24.8',
    turn: 'Turn Right onto NH-3 Mountain Pass',
    etaMinutes: 38,
  },
  {
    id: 'dest_2',
    name: 'Manali Highway Checkpoint',
    latitude: 32.2432,
    longitude: 77.1892,
    distance: '12.4',
    turn: 'Keep Left on River Expressway',
    etaMinutes: 18,
  },
  {
    id: 'dest_3',
    name: 'Royal Enfield Service & Flagship Hub',
    latitude: 28.6139,
    longitude: 77.2090,
    distance: '4.2',
    turn: 'Turn Left onto Central Avenue',
    etaMinutes: 8,
  },
  {
    id: 'dest_4',
    name: 'Atal Tunnel North Portal Check-post',
    latitude: 32.4812,
    longitude: 77.1534,
    distance: '36.0',
    turn: 'Enter Atal Tunnel Portal straight',
    etaMinutes: 45,
  },
  {
    id: 'dest_5',
    name: 'Goa Coastal Highway Route 66',
    latitude: 15.4989,
    longitude: 73.8278,
    distance: '86.5',
    turn: 'Continue Straight along Coastal Expressway',
    etaMinutes: 110,
  },
];

export default function MapScreen() {
  const { ssid, k1gConnected } = useSelector((state: RootState) => state.bike);
  const mapRef = useRef<MapView>(null);

  const [currentPos, setCurrentPos] = useState({ latitude: 28.6139, longitude: 77.2090 });
  const [selectedDest, setSelectedDest] = useState<Destination>(PRESET_DESTINATIONS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [dashMode, setDashMode] = useState<'turn_by_turn' | 'full_map'>('turn_by_turn');
  const [isPushing, setIsPushing] = useState(false);
  const [dashNavActive, setDashNavActive] = useState(false);
  const [showTftPreview, setShowTftPreview] = useState(true);

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

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    const lower = text.toLowerCase();
    const matches = PRESET_DESTINATIONS.filter(d => d.name.toLowerCase().includes(lower));
    if (matches.length === 0 && text.trim().length > 2) {
      // Create a dynamic result from query
      matches.push({
        id: `search_${Date.now()}`,
        name: text.trim(),
        latitude: currentPos.latitude + 0.02,
        longitude: currentPos.longitude + 0.02,
        distance: '8.5',
        turn: `Head straight towards ${text.trim()}`,
        etaMinutes: 14,
      });
    }
    setSearchResults(matches);
  };

  const handleSelectDestination = (dest: Destination) => {
    setSelectedDest(dest);
    setSearchResults([]);
    setSearchQuery('');
    Keyboard.dismiss();
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
    const dLat = (coord.latitude - currentPos.latitude) * 111;
    const dLon = (coord.longitude - currentPos.longitude) * 111 * Math.cos(currentPos.latitude * (Math.PI / 180));
    const distKm = Math.sqrt(dLat * dLat + dLon * dLon);
    const formattedDist = distKm.toFixed(1);
    const eta = Math.max(2, Math.round((distKm / 45) * 60)); // Avg 45km/h

    const customDest: Destination = {
      id: `custom_${Date.now()}`,
      name: `Waypoint (${coord.latitude.toFixed(3)}, ${coord.longitude.toFixed(3)})`,
      latitude: coord.latitude,
      longitude: coord.longitude,
      distance: formattedDist,
      turn: 'Turn Right onto main connector road',
      etaMinutes: eta,
    };

    setSelectedDest(customDest);
    setDashNavActive(false);
  };

  const handlePushToDash = async () => {
    setIsPushing(true);
    try {
      await k1gProtocol.setDashNavigationMode(dashMode);
      await k1gProtocol.sendNavigationCommand(
        selectedDest.name,
        selectedDest.turn,
        '400m',
        `${selectedDest.distance} km`,
        selectedDest.etaMinutes
      );
      setDashNavActive(true);
      Alert.alert(
        'Royal Enfield Tripper Updated ⚡',
        `Route to "${selectedDest.name}" is now live on your bike dash in ${dashMode === 'full_map' ? 'Full Map Projection' : 'Turn-by-Turn Gauge'} mode over K1G UDP port 2002!`
      );
    } catch {
      Alert.alert('Connection Error', 'Could not sync route with Tripper Dash.');
    } finally {
      setIsPushing(false);
    }
  };

  const isOfflineMode = Platform.OS === 'android' && !process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <View style={styles.container}>
      {/* Map Rendering or Fallback Canvas */}
      {isOfflineMode ? (
        <View style={[styles.map, styles.fallbackContainer]}>
          <MaterialCommunityIcons name="compass-outline" size={54} color="#FF5722" />
          <Text style={styles.fallbackTitle}>Royal Enfield Tripper Dash Controller</Text>
          <Text style={styles.fallbackText}>
            Select a destination preset or search below to push full navigation telemetry and TFT display projection directly to your Guerrilla 450 / Himalayan 450 Tripper screen.
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
          <Marker
            coordinate={currentPos}
            title="My Current Location"
            pinColor="#00E676"
          />

          <Marker
            coordinate={{ latitude: selectedDest.latitude, longitude: selectedDest.longitude }}
            title={selectedDest.name}
            description={`${selectedDest.distance} km away • ${selectedDest.turn}`}
            pinColor="#FF5722"
          />

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

      {/* Top Search & Preset Hub */}
      <View style={styles.topSelectorCard}>
        <View style={styles.topHeaderRow}>
          <View style={styles.reBrandBadge}>
            <MaterialCommunityIcons name="motorbike" size={14} color="#FF5722" />
            <Text style={styles.reBrandText}>RE TRIPPER DASH NAV</Text>
          </View>
          <View style={styles.k1gStatusPill}>
            <View style={[styles.statusDot, { backgroundColor: k1gConnected || ssid ? '#00E676' : '#FFB300' }]} />
            <Text style={styles.k1gStatusText}>{k1gConnected || ssid ? 'Dash Connected' : 'Ready to Sync'}</Text>
          </View>
        </View>

        {/* Destination Search Bar */}
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8A99AD" />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to? Search destination or tap map..."
            placeholderTextColor="#667085"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#8A99AD" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsBox}>
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.searchResultRow}
                onPress={() => handleSelectDestination(item)}
              >
                <MaterialCommunityIcons name="map-marker" size={16} color="#FF5722" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{item.name}</Text>
                  <Text style={styles.resultSub}>{item.distance} km away • ETA: {item.etaMinutes} mins</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Presets Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
          {PRESET_DESTINATIONS.map((preset) => {
            const isSelected = selectedDest.id === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                onPress={() => handleSelectDestination(preset)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="compass"
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

      {/* Floating TFT Dash Cluster Preview Toggle & Overlay Panel */}
      <View style={styles.bottomSection}>
        {/* Tripper 4" TFT Display Preview Card */}
        {showTftPreview && (
          <View style={styles.tftPreviewBox}>
            <View style={styles.tftHeader}>
              <MaterialCommunityIcons name="gauge" size={16} color="#FF5722" />
              <Text style={styles.tftHeaderTitle}>Guerrilla 450 TFT Screen Preview</Text>
              <TouchableOpacity onPress={() => setShowTftPreview(false)}>
                <MaterialCommunityIcons name="close" size={16} color="#8A99AD" />
              </TouchableOpacity>
            </View>

            {dashMode === 'turn_by_turn' ? (
              <View style={styles.tftClusterRow}>
                <View style={styles.turnCircle}>
                  <MaterialCommunityIcons name="arrow-top-right-thick" size={32} color="#00E676" />
                </View>
                <View style={styles.tftTurnDetails}>
                  <Text style={styles.tftTurnDist}>In 400m</Text>
                  <Text style={styles.tftTurnInstruction} numberOfLines={1}>{selectedDest.turn}</Text>
                  <View style={styles.tftSubRow}>
                    <Text style={styles.tftEtaText}>{selectedDest.distance} km total</Text>
                    <Text style={styles.tftEtaText}>• {selectedDest.etaMinutes} min ETA</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.tftMapProjectionRow}>
                <MaterialCommunityIcons name="map-legend" size={26} color="#2196F3" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.tftTurnInstruction}>Full Map Projection Active</Text>
                  <Text style={styles.tftSubText}>Streaming high-res map layout over 192.168.1.1 WiFi to Tripper Dash</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Main Tripper Dash Sync Control Panel */}
        <View style={styles.overlayPanel}>
          {/* Display Mode Selection Row */}
          <View style={styles.modeSelectorRow}>
            <Text style={styles.modeLabel}>TFT DASH MODE:</Text>
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, dashMode === 'turn_by_turn' && styles.modeTabActive]}
                onPress={() => setDashMode('turn_by_turn')}
              >
                <MaterialCommunityIcons name="navigation" size={13} color={dashMode === 'turn_by_turn' ? '#fff' : '#8A99AD'} />
                <Text style={[styles.modeTabText, dashMode === 'turn_by_turn' && styles.modeTabTextActive]}>
                  Turn-by-Turn
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, dashMode === 'full_map' && styles.modeTabActive]}
                onPress={() => setDashMode('full_map')}
              >
                <MaterialCommunityIcons name="map" size={13} color={dashMode === 'full_map' ? '#fff' : '#8A99AD'} />
                <Text style={[styles.modeTabText, dashMode === 'full_map' && styles.modeTabTextActive]}>
                  Full Map Mirror
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Destination Details */}
          <View style={styles.destHeaderRow}>
            <View style={styles.destInfoWrap}>
              <Text style={styles.destName} numberOfLines={1}>{selectedDest.name}</Text>
              <Text style={styles.destDetail}>
                {selectedDest.distance} km • ETA: {selectedDest.etaMinutes} min • {selectedDest.turn}
              </Text>
            </View>
            {dashNavActive && (
              <View style={styles.activeBadge}>
                <MaterialCommunityIcons name="check-circle" size={12} color="#000" />
                <Text style={styles.activeBadgeText}>Live on Dash</Text>
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
              {isPushing
                ? 'Syncing with Tripper Dash…'
                : dashNavActive
                ? `Update Route on TFT (${dashMode === 'full_map' ? 'Map View' : 'Turn Mode'}) ⚡`
                : 'Start Tripper Dash Navigation ⚡'}
            </Text>
          </TouchableOpacity>
        </View>
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
    top: Platform.OS === 'ios' ? 48 : 28,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 18, 26, 0.96)',
    borderWidth: 1,
    borderColor: '#262D3D',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reBrandText: {
    color: '#FF5722',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  k1gStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2230',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  k1gStatusText: {
    color: '#C3CEDD',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181E2C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2D364C',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultsBox: {
    backgroundColor: '#181E2C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D364C',
    marginBottom: 10,
    maxHeight: 180,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242C3D',
    gap: 10,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resultSub: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: 2,
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
  bottomSection: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 92 : 76,
    left: 14,
    right: 14,
    gap: 10,
  },
  tftPreviewBox: {
    backgroundColor: 'rgba(21, 26, 36, 0.96)',
    borderWidth: 1,
    borderColor: '#FF572255',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  tftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tftHeaderTitle: {
    color: '#FF5722',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tftClusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  turnCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0E1622',
    borderWidth: 2,
    borderColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tftTurnDetails: {
    flex: 1,
  },
  tftTurnDist: {
    color: '#00E676',
    fontSize: 18,
    fontWeight: '900',
  },
  tftTurnInstruction: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  tftSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tftEtaText: {
    color: '#8A99AD',
    fontSize: 12,
    fontWeight: '600',
  },
  tftMapProjectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181E2C',
    padding: 12,
    borderRadius: 12,
  },
  tftSubText: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: 2,
  },
  overlayPanel: {
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
  modeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modeLabel: {
    color: '#8A99AD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#181E2C',
    borderRadius: 10,
    padding: 3,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  modeTabActive: {
    backgroundColor: '#FF5722',
  },
  modeTabText: {
    color: '#8A99AD',
    fontSize: 11,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
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
    fontSize: 14,
    fontWeight: '800',
  },
});
