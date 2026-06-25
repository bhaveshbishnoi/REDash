import { BleManager } from 'react-native-ble-plx';

let manager: BleManager | null = null;
try {
  manager = new BleManager();
} catch (e) {
  console.log('Bluetooth BLE manager is not supported on this platform/runtime. Running in mockable mode.');
}

const SERVICE_UUID = '0000FFF0-0000-1000-8000-00805f9b34fb'; 
const SPEED_CHARACTERISTIC = '0000FFF1-0000-1000-8000-00805f9b34fb';

let simulatedInterval: any = null;

export const scanForBikes = (onDeviceFound: (device: { id: string; name: string }) => void) => {
  if (!manager) {
    // Provide a simulated bike device in 1.5 seconds
    setTimeout(() => {
      onDeviceFound({ id: 'SIM-RE-GUERRILLA-450', name: 'Guerrilla 450 (Simulated)' });
    }, 1500);
    return;
  }

  manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.warn('BLE Scan error:', error);
      // Fallback: report simulated device
      onDeviceFound({ id: 'SIM-RE-GUERRILLA-450', name: 'Guerrilla 450 (Simulated)' });
      return;
    }
    if (device?.name?.includes('Guerrilla') || device?.name?.includes('OBD') || device?.name?.includes('Royal Enfield')) {
      onDeviceFound({ id: device.id, name: device.name || 'Guerrilla Bike' });
    }
  });
};

export const connectToBike = async (deviceId: string): Promise<{ id: string; name: string; simulated?: boolean }> => {
  if (deviceId.startsWith('SIM-') || !manager) {
    return { id: deviceId, name: 'Guerrilla 450 (Simulated)', simulated: true };
  }

  try {
    const device = await manager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    return { id: device.id, name: device.name || 'Guerrilla Bike', simulated: false };
  } catch (error) {
    console.error('BLE connection failed, falling back to simulated connection:', error);
    return { id: `SIM-${deviceId}`, name: 'Guerrilla 450 (Simulated)', simulated: true };
  }
};

export const subscribeToSpeedUpdates = (
  deviceId: string,
  onSpeedUpdate: (speed: number) => void
) => {
  if (deviceId.startsWith('SIM-') || !manager) {
    let speed = 0;
    let acceleration = 2;
    simulatedInterval = setInterval(() => {
      // Simulate bike speed matching throttle/braking
      if (speed <= 10) {
        acceleration = 3 + Math.random() * 2;
      } else if (speed >= 90) {
        acceleration = -3 - Math.random() * 2;
      } else {
        acceleration = (Math.random() - 0.45) * 6;
      }
      speed = Math.max(0, Math.min(130, speed + acceleration));
      onSpeedUpdate(Math.round(speed));
    }, 1000);

    return () => {
      if (simulatedInterval) {
        clearInterval(simulatedInterval);
        simulatedInterval = null;
      }
    };
  }

  // Real BLE monitoring
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
  if (simulatedInterval) {
    clearInterval(simulatedInterval);
    simulatedInterval = null;
  }
  if (manager && !deviceId.startsWith('SIM-')) {
    try {
      await manager.cancelDeviceConnection(deviceId);
    } catch (e) {
      console.warn('Error disconnecting BLE:', e);
    }
  }
};
