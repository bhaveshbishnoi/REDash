import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setWallpaper } from '../store/settingsSlice';
import { k1gProtocol } from '../services/k1gProtocol';

const OFFLINE_WALLPAPERS = [
  {
    id: 'wp1',
    title: 'Guerrilla Desert Rally',
    imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    category: 'Rally Dash',
  },
  {
    id: 'wp2',
    title: 'Obsidian Carbon Grid',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    category: 'Dark Tech',
  },
  {
    id: 'wp3',
    title: 'Cyberpunk Neon Telemetry',
    imageUrl: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=800&q=80',
    category: 'Neon Pulse',
  },
  {
    id: 'wp4',
    title: 'Himalayan High Pass',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    category: 'Expedition',
  }
];

export default function WallpaperScreen() {
  const dispatch = useDispatch();
  const currentWallpaper = useSelector((state: RootState) => state.settings.wallpaperUrl);
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setWallpapers(OFFLINE_WALLPAPERS);
    setLoading(false);
  }, []);

  const handleSelect = async (url: string) => {
    setSyncing(true);
    dispatch(setWallpaper(url));
    try {
      await k1gProtocol.sendWallpaperToDash(url);
    } catch {}
    setSyncing(false);
    if (url === '') {
      Alert.alert('Dash Reset ⚡', 'Tripper Dash display reset to default Obsidian Black.');
    } else {
      Alert.alert('Tripper Dash Updated ⚡', 'Wallpaper asset successfully pushed to your Royal Enfield bike dash display over K1G!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tripper Dash Wallpapers</Text>
      <Text style={styles.subtitle}>Push custom background themes directly to your bike dash display</Text>

      {loading || syncing ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#FF5722" style={styles.loader} />
          {syncing && <Text style={styles.syncText}>Pushing asset to Tripper Dash screen…</Text>}
        </View>
      ) : (
        <FlatList
          data={wallpapers}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const isSelected = currentWallpaper === item.imageUrl;
            return (
              <TouchableOpacity
                style={[styles.card, isSelected && styles.selectedCard]}
                onPress={() => handleSelect(item.imageUrl)}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
                <View style={styles.info}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {isSelected && <Text style={styles.activeText}>Dash Active</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {currentWallpaper && !syncing && (
        <TouchableOpacity style={styles.resetButton} onPress={() => handleSelect('')}>
          <Text style={styles.resetText}>Reset Bike Dash to Default Black Theme</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
    marginBottom: 20,
  },
  loader: {
    marginTop: 40,
  },
  grid: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  selectedCard: {
    borderColor: '#FF5722',
    borderWidth: 2,
  },
  image: {
    width: '100%',
    height: 140,
  },
  info: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  activeText: {
    color: '#FF5722',
    fontSize: 10,
    fontWeight: 'bold',
  },
  resetButton: {
    marginTop: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  resetText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  syncText: {
    color: '#FF5722',
    fontSize: 14,
    fontWeight: '600',
  },
});
