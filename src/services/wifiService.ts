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

/** Small helper: wait for the WiFi stack to settle before probing the dash. */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Scan for available Tripper Dash networks (RE_* SSIDs).
 * Returns an empty array if the module is unavailable or on iOS.
 */
export const scanTripperNetworks = async (): Promise<string[]> => {
  if (Platform.OS !== 'android') return [];

  const module = getDashWifi();
  if (!module) {
    console.warn('[WiFi] DashWifi native module unavailable for scanning');
    return [];
  }

  try {
    console.log('[WiFi] Scanning for RE_* networks…');
    const networks: string[] = await module.scanNetworks('RE_');
    console.log(`[WiFi] Found networks: ${JSON.stringify(networks)}`);
    return networks;
  } catch (err) {
    console.warn('[WiFi] Scan error:', err);
    return [];
  }
};

/**
 * Connect to a specific SSID (chosen manually by the user).
 * Returns the connected SSID or null on failure.
 */
export const connectToSsidDirectly = async (ssid: string): Promise<string | null> => {
  if (Platform.OS !== 'android') {
    console.warn('[WiFi] iOS direct WiFi connection not supported');
    return null;
  }

  const module = getDashWifi();
  if (!module) {
    throw new Error('DashWifi native module unavailable. Please rebuild the app.');
  }

  try {
    console.log(`[WiFi] Connecting to specific SSID: ${ssid}`);
    const connected: string = await module.connectToSsid(ssid);
    console.log(`[WiFi] Connected to: ${connected}`);

    // Let the network stack fully settle before any TCP/HTTP probes
    await sleep(1500);
    return connected;
  } catch (error: any) {
    const msg: string = error?.message || String(error);
    if (msg.includes('UNAVAILABLE') || msg.includes('cancelled')) {
      console.warn('[WiFi] User cancelled or network unavailable');
      return null;
    }
    if (msg.includes('UNSUPPORTED')) {
      throw new Error('Your device requires Android 10 or newer to connect directly to the Tripper Dash WiFi.');
    }
    console.error('[WiFi] Connect-to-SSID error:', msg);
    return null;
  }
};

/**
 * Connect to any RE_* network via the system picker (legacy).
 * Returns the connected SSID or null on failure.
 */
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
    const ssid: string = await module.connectToPrefix('RE_');
    console.log(`[WiFi] Connected to: ${ssid}`);

    // Let the network stack fully settle before any TCP/HTTP probes
    await sleep(1500);
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
 * Returns true if 192.168.1.1 responds to an HTTP request within 5s.
 */
export const isDashReachable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('http://192.168.1.1/', { signal: controller.signal });
    clearTimeout(id);
    return res.status < 500;
  } catch {
    return false;
  }
};
