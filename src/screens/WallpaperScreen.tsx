import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setWallpaper } from '../store/settingsSlice';

const OFFLINE_WALLPAPERS = [
  {
    id: 'wp1',
    title: 'Desert Guerrilla 450',
    imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
    category: 'bike',
  },
  {
    id: 'wp2',
    title: 'Mountain Pass',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    category: 'landscape',
  },
  {
    id: 'wp3',
    title: 'Cyberpunk Neon Street',
    imageUrl: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=600&q=80',
    category: 'abstract',
  }
];

export default function WallpaperScreen() {
  const dispatch = useDispatch();
  const currentWallpaper = useSelector((state: RootState) => state.settings.wallpaperUrl);
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWallpapers(OFFLINE_WALLPAPERS);
    setLoading(false);
  }, []);

  const handleSelect = (url: string) => {
    dispatch(setWallpaper(url));
    Alert.alert('Success', 'Dashboard wallpaper updated successfully!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard Wallpapers</Text>
      <Text style={styles.subtitle}>Personalize your companion dash background</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF5722" style={styles.loader} />
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
                  {isSelected && <Text style={styles.activeText}>Active</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {currentWallpaper && (
        <TouchableOpacity style={styles.resetButton} onPress={() => handleSelect('')}>
          <Text style={styles.resetText}>Reset to Default Black Theme</Text>
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
});
