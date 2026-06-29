import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { setBikeConnected, setK1gConnected } from '../store/bikeSlice';
import { connectToTripper } from '../services/wifiService';
import { k1gProtocol } from '../services/k1gProtocol';

export default function ConnectDashScreen() {
  const dispatch = useDispatch();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);

    try {
      // Step 1: Connect to WiFi via Native Android Module
      const ssid = await connectToTripper();
      if (!ssid) {
        Alert.alert('Connection Failed', 'Could not connect to the dash WiFi network.');
        setConnecting(false);
        return;
      }

      // Step 2: Initialize K1G protocol
      const k1gConnected = await k1gProtocol.initializeConnection();
      
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
    <View style={{ flex: 1, padding: 20, backgroundColor: '#1A1A1A', paddingTop: 60, justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center' }}>
        Tripper Dash
      </Text>
      <Text style={{ fontSize: 16, color: '#ccc', marginBottom: 40, textAlign: 'center', paddingHorizontal: 10 }}>
        Ensure your motorcycle's ignition is on and Wi-Fi is enabled in the Dash settings.
      </Text>

      {Platform.OS === 'ios' && (
        <Text style={{ color: '#ff4500', textAlign: 'center', marginBottom: 20 }}>
          iOS direct connection is in development. Please use Offline Mode.
        </Text>
      )}

      <TouchableOpacity
        onPress={handleConnect}
        disabled={connecting || Platform.OS === 'ios'}
        style={{ 
            paddingVertical: 18, 
            backgroundColor: (connecting || Platform.OS === 'ios') ? '#555' : '#ff4500', 
            borderRadius: 14,
            alignItems: 'center',
            marginBottom: 20,
            shadowColor: '#ff4500',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8,
        }}
      >
        {connecting ? (
            <ActivityIndicator color="#fff" />
        ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
              Connect to Dash
            </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => dispatch(setBikeConnected({ ssid: 'OFFLINE_MODE' }))}
        disabled={connecting}
        style={{ 
            paddingVertical: 16, 
            backgroundColor: 'transparent', 
            borderRadius: 14,
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
