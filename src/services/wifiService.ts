import WifiManager from 'react-native-wifi-reborn';
import { Platform } from 'react-native';

export const scanAvailableNetworks = async (): Promise<string[]> => {
  try {
    // Attempt real scan
    if (Platform.OS === 'android') {
        const { loadWifiList } = require('react-native-wifi-reborn');
        try {
            const list = await loadWifiList();
            const reNetworks = list.map((n: any) => n.SSID).filter((ssid: string) => ssid.includes('RE_'));
            return reNetworks;
        } catch(e) {
            console.warn('loadWifiList failed', e);
        }
    }

    return []; 
  } catch (error) {
    console.error('WiFi scan failed:', error);
    return [];
  }
};

export const connectToTripper = async (ssid: string, password?: string): Promise<boolean> => {
  try {
    console.log(`Attempting to connect to ${ssid}`);
    await WifiManager.connectToSSID(ssid);
    console.log(`Connected to ${ssid}`);
    return true;
  } catch (error) {
    console.error('WiFi connection failed:', error);
    return false;
  }
};

export const disconnectFromTripper = async () => {
  try {
    await WifiManager.disconnect();
  } catch (error) {
    console.error('WiFi disconnect failed:', error);
  }
};
