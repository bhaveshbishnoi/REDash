import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setBikeDisconnected } from '../store/bikeSlice';
import { disconnectBike } from '../services/bluetoothService';

export default function BluetoothStatus() {
  const dispatch = useDispatch();
  const { connected, connectedDevice } = useSelector((state: RootState) => state.bike);

  const handleDisconnect = async () => {
    if (connectedDevice) {
      await disconnectBike(connectedDevice.id);
      dispatch(setBikeDisconnected());
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <View style={[styles.indicator, { backgroundColor: connected ? '#00E676' : '#FF3D00' }]} />
        <Text style={styles.text}>
          {connected ? `Connected: ${connectedDevice?.name}` : 'Bike Disconnected'}
        </Text>
      </View>
      {connected && (
        <TouchableOpacity style={styles.button} onPress={handleDisconnect}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#FF5722',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
