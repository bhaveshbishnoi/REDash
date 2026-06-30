import { Platform } from 'react-native';

/**
 * Connects to the Royal Enfield Tripper Dash WiFi network.
 *
 * The Tripper Dash creates a hotspot with SSID prefix "RE_".
 * On Android 10+ this is handled via WifiNetworkSpecifier which shows a
 * system dialog for the user to confirm the connection.
 *
 * Prerequisites (user must do on the dash):
 *   1. Ignition ON
 *   2. Hold right joystick ~3 seconds → WiFi icon appears on dash
 *
 * After connection the dash is at 192.168.1.1 (UDP port 2002 for control).
 */

let DashWifi: any = null;

const getDashWifi = () => {
  if (!DashWifi) {
    try {
      DashWifi = require('../../modules/dash-wifi/src/DashWifiModule').default;
    } catch (e) {
      console.warn('[WiFi] DashWifi native module not available:', e);
    }
  }
  return DashWifi;
};

export const connectToTripper = async (): Promise<string | null> => {
  if (Platform.OS !== 'android') {
    console.warn('[WiFi] iOS direct WiFi connection not supported');
    return null;
  }

  const module = getDashWifi();
  if (!module) {
    throw new Error('DashWifi native module unavailable. Please rebuild the app.');
  }

  try {
    console.log('[WiFi] Requesting connection to RE_* network via system dialog…');
    // connectToPrefix shows Android's native WiFi picker filtered to RE_ SSIDs
    const ssid: string = await module.connectToPrefix('RE_');
    console.log(`[WiFi] Connected to: ${ssid}`);
    return ssid;
  } catch (error: any) {
    const msg: string = error?.message || String(error);
    if (msg.includes('UNAVAILABLE') || msg.includes('cancelled')) {
      console.warn('[WiFi] User cancelled WiFi connection or dash not found');
      return null;
    }
    if (msg.includes('UNSUPPORTED')) {
      throw new Error('Your device requires Android 10 or newer to connect directly to the Tripper Dash WiFi.');
    }
    console.error('[WiFi] Connection error:', msg);
    return null;
  }
};

export const disconnectFromTripper = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  const module = getDashWifi();
  if (!module) return;

  try {
    await module.disconnect();
    console.log('[WiFi] Disconnected from Tripper Dash network');
  } catch (error) {
    console.warn('[WiFi] Disconnect error:', error);
  }
};

/**
 * Quick check: can we reach the dash gateway after WiFi connection?
 * Returns true if 192.168.1.1 responds to an HTTP request within 3s.
 */
export const isDashReachable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('http://192.168.1.1/', { signal: controller.signal });
    clearTimeout(id);
    return res.status < 500;
  } catch {
    return false;
  }
};
