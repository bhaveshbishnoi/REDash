import { BleManager } from 'react-native-ble-plx';

let manager: BleManager | null = null;
try {
  manager = new BleManager();
} catch (e) {
  console.log('Bluetooth BLE manager is not supported on this platform/runtime. Running in production hardware mode.');
}

const SERVICE_UUID = '0000FFF0-0000-1000-8000-00805f9b34fb'; 
const SPEED_CHARACTERISTIC = '0000FFF1-0000-1000-8000-00805f9b34fb';

export const scanForBikes = (onDeviceFound: (device: { id: string; name: string }) => void) => {
  if (!manager) {
    console.warn('BLE scanning is unavailable: Bluetooth hardware is not supported or active.');
    return;
  }

  manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.warn('BLE Scan error:', error);
      return;
    }
    if (device?.name?.includes('Guerrilla') || device?.name?.includes('OBD') || device?.name?.includes('Royal Enfield')) {
      onDeviceFound({ id: device.id, name: device.name || 'Guerrilla Bike' });
    }
  });
};

export const connectToBike = async (deviceId: string): Promise<{ id: string; name: string; simulated?: boolean }> => {
  if (!manager) {
    throw new Error('Bluetooth manager is not initialized.');
  }

  try {
    const device = await manager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    return { id: device.id, name: device.name || 'Guerrilla Bike', simulated: false };
  } catch (error: any) {
    console.error('BLE connection failed:', error);
    throw new Error(error.message || 'Failed to connect to bike hardware.');
  }
};

export const subscribeToSpeedUpdates = (
  deviceId: string,
  onSpeedUpdate: (speed: number) => void
) => {
  if (!manager) {
    return () => {};
  }

  let activeSubscription: any = null;
  
  (async () => {
    try {
      const connectedDevices = await manager!.devices([deviceId]);
      const device = connectedDevices[0];
      if (device) {
        activeSubscription = device.monitorCharacteristicForService(
          SERVICE_UUID,
          SPEED_CHARACTERISTIC,
          (error, characteristic) => {
            if (error) {
              console.error('BLE Speed characteristic error:', error);
              return;
            }
            if (characteristic?.value) {
              const decoded = atob(characteristic.value);
              const parsed = parseInt(decoded, 10);
              if (!isNaN(parsed)) {
                onSpeedUpdate(parsed);
              }
            }
          }
        );
      }
    } catch (e) {
      console.error('Error setting up real BLE monitor:', e);
    }
  })();

  return () => {
    if (activeSubscription) {
      activeSubscription.remove();
    }
  };
};

export const disconnectBike = async (deviceId: string) => {
  if (manager) {
    try {
      await manager.cancelDeviceConnection(deviceId);
    } catch (e) {
      console.warn('Error disconnecting BLE:', e);
    }
  }
};
