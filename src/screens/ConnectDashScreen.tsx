import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { setBikeConnected, setK1gConnected } from '../store/bikeSlice';
import { scanAvailableNetworks, connectToTripper } from '../services/wifiService';
import { k1gProtocol } from '../services/k1gProtocol';

export default function ConnectDashScreen() {
  const dispatch = useDispatch();
  const [networks, setNetworks] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedSSID, setSelectedSSID] = useState<string | null>(null);

  const scanNetworks = async () => {
    setScanning(true);
    const found = await scanAvailableNetworks();
    setNetworks(found);
    setScanning(false);
  };

  useEffect(() => {
    scanNetworks();
  }, []);

  const handleConnect = async (ssid: string) => {
    setConnecting(true);
    setSelectedSSID(ssid);

    try {
      // Step 1: Connect to WiFi
      const wifiConnected = await connectToTripper(ssid);
      if (!wifiConnected) {
        Alert.alert('Connection Failed', 'Could not connect to the dash WiFi network.');
        setConnecting(false);
        return;
      }

      // Step 2: Initialize K1G protocol
      const k1gConnected = await k1gProtocol.initializeConnection();
      
      // We will proceed to dashboard even if K1G fails for now, so we can track rides offline,
      // but we store the k1g state in Redux.
      dispatch(setK1gConnected(k1gConnected));
      dispatch(setBikeConnected({ ssid }));
      
      if (!k1gConnected) {
        Alert.alert('Tripper Dash Connected', 'WiFi connected, but K1G dash streaming protocol failed to initialize. You can still track your ride locally.');
      } else {
        Alert.alert('Success', 'Connected to Tripper Dash successfully!');
      }

    } catch (error: any) {
      Alert.alert('Connection Error', error.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#1A1A1A', paddingTop: 60 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 }}>
        Tripper Dash Connect
      </Text>
      <Text style={{ fontSize: 16, color: '#ccc', marginBottom: 30 }}>
        Please select your Royal Enfield Guerrilla 450, Himalayan, or Bear 650 Tripper network.
      </Text>

      {scanning ? (
        <ActivityIndicator size="large" color="#ff4500" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={networks}
          keyExtractor={(item) => item}
          ListEmptyComponent={<Text style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>No RE networks found nearby. Ensure your dash WiFi is on.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleConnect(item)}
              disabled={connecting && selectedSSID !== item}
              style={{
                padding: 20,
                marginVertical: 8,
                backgroundColor: connecting && selectedSSID === item ? '#333' : '#2A2A2A',
                borderRadius: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: connecting && selectedSSID === item ? '#ff4500' : '#444'
              }}
            >
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>{item}</Text>
                <Text style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>Royal Enfield Dash</Text>
              </View>
              {connecting && selectedSSID === item ? (
                <ActivityIndicator color="#ff4500" />
              ) : (
                <Text style={{ fontSize: 24, color: '#ff4500' }}>→</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        onPress={scanNetworks}
        disabled={scanning || connecting}
        style={{ 
            marginTop: 20, 
            paddingVertical: 16, 
            backgroundColor: (scanning || connecting) ? '#555' : '#ff4500', 
            borderRadius: 12,
            alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
          {scanning ? 'Scanning...' : 'Scan Again'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => {
            // Offline fallback
            dispatch(setBikeConnected({ ssid: 'OFFLINE_MODE' }));
        }}
        disabled={scanning || connecting}
        style={{ 
            marginTop: 15, 
            paddingVertical: 16, 
            backgroundColor: 'transparent', 
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#666',
            alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
          Track Offline Only
        </Text>
      </TouchableOpacity>
    </View>
  );
}
