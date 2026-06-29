import DashWifi from '../../modules/dash-wifi/src/DashWifiModule';
import { Platform } from 'react-native';

export const connectToTripper = async (): Promise<string | null> => {
  try {
    console.log(`Requesting Dash connection via native dialog`);
    if (Platform.OS === 'android') {
        const connectedSsid = await DashWifi.connectToPrefix('RE_');
        console.log(`Native connected to ${connectedSsid}`);
        return connectedSsid;
    } else {
        console.warn('iOS WiFi direct connection via prefix not supported natively in this module yet.');
        return null;
    }
  } catch (error) {
    console.error('WiFi connection failed:', error);
    return null;
  }
};

export const disconnectFromTripper = async () => {
  try {
    if (Platform.OS === 'android') {
        await DashWifi.disconnect();
    }
  } catch (error) {
    console.error('WiFi disconnect failed:', error);
  }
};
