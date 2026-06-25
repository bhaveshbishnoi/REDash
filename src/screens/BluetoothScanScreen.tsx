import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setScanning, addDiscoveredDevice, setBikeConnected } from '../store/bikeSlice';
import { scanForBikes, connectToBike } from '../services/bluetoothService';

export default function BluetoothScanScreen() {
  const dispatch = useDispatch();
  const { scanning, discoveredDevices } = useSelector((state: RootState) => state.bike);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const startScanning = () => {
    dispatch(setScanning(true));
    scanForBikes((device) => {
      dispatch(addDiscoveredDevice(device));
    });
    // Stop scanning automatically after 10s
    setTimeout(() => {
      dispatch(setScanning(false));
    }, 10000);
  };

  useEffect(() => {
    startScanning();
  }, []);

  const handleConnect = async (device: { id: string; name: string }) => {
    setConnectingId(device.id);
    try {
      const result = await connectToBike(device.id);
      dispatch(setBikeConnected({ 
        id: result.id, 
        name: result.name, 
        simulated: false 
      }));
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message || 'Could not connect to the bike.');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pair Your Guerrilla 450</Text>
      <Text style={styles.subtitle}>Turn on your bike's ignition to make it discoverable</Text>

      {scanning && (
        <View style={styles.scanStatus}>
          <ActivityIndicator size="small" color="#FF5722" />
          <Text style={styles.scanStatusText}>Scanning for nearby bikes...</Text>
        </View>
      )}

      <FlatList
        data={discoveredDevices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceCard}
            onPress={() => handleConnect(item)}
            disabled={connectingId !== null}
          >
            <View>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.deviceId}>{item.id}</Text>
            </View>
            {connectingId === item.id ? (
              <ActivityIndicator size="small" color="#FF5722" />
            ) : (
              <Text style={styles.connectText}>Connect</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !scanning ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No bikes found nearby.</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.footer}>
        {!scanning && (
          <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
            <Text style={styles.scanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    marginBottom: 24,
  },
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
  },
  scanStatusText: {
    color: '#ffffff',
    marginLeft: 10,
    fontSize: 13,
  },
  list: {
    paddingVertical: 10,
  },
  deviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  deviceId: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  connectText: {
    color: '#FF5722',
    fontWeight: 'bold',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#666666',
  },
  footer: {
    marginTop: 20,
    gap: 12,
  },
  scanButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
