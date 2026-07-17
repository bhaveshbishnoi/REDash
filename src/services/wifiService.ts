import { Platform } from 'react-native';

/**
 * Connects to the Royal Enfield Tripper Dash WiFi network.
 *
 * The Tripper Dash creates a hotspot with SSID prefix "RE_".
 * On Android 10+ this is handled via WifiNetworkSpecifier which shows a
 * system dialog for the user to confirm the connection.
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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Scan ────────────────────────────────────────────────────────────────────

export const scanTripperNetworks = async (): Promise<string[]> => {
  if (Platform.OS !== 'android') return [];
  const module = getDashWifi();
  if (!module) return [];
  try {
    const networks: string[] = await module.scanNetworks('RE_');
    console.log(`[WiFi] Scan found: ${JSON.stringify(networks)}`);
    return networks;
  } catch (err) {
    console.warn('[WiFi] Scan error:', err);
    return [];
  }
};

// ─── Get currently connected SSID ────────────────────────────────────────────

export const getCurrentTripperSsid = async (): Promise<string | null> => {
  if (Platform.OS !== 'android') return null;
  const module = getDashWifi();
  if (!module) return null;
  try {
    const ssid: string | null = await module.getCurrentSsid();
    if (ssid && ssid.startsWith('RE_')) return ssid;
    return null;
  } catch {
    return null;
  }
};

// ─── Bind process to active WiFi network ──────────────────────────────────────

export const bindCurrentWifi = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  const module = getDashWifi();
  if (!module) return false;
  try {
    const ssid = await getCurrentTripperSsid();
    if (ssid) {
      console.log(`[WiFi] Found active RE_ connection: ${ssid}. Binding process...`);
      const bound = await module.bindToActiveWifi();
      return bound;
    }
    return false;
  } catch (e) {
    console.error('[WiFi] Bind error:', e);
    return false;
  }
};

// ─── Poll for manual connection via WiFi Settings ────────────────────────────

/**
 * Opens Android WiFi Settings, then polls every 1.5 seconds (up to 60 seconds)
 * to detect when the user has manually connected to an RE_* network.
 * Calls onConnected(ssid) when found, or onTimeout when time runs out.
 */
export const openWifiSettingsAndPoll = async (
  onConnected: (ssid: string) => void,
  onTimeout: () => void,
  timeoutMs = 60_000,
  abortSignal?: { aborted: boolean }
): Promise<void> => {
  if (Platform.OS !== 'android') return;
  const module = getDashWifi();
  if (!module) return;

  try {
    await module.openWifiSettings();
  } catch (e) {
    console.warn('[WiFi] Could not open WiFi settings:', e);
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (abortSignal?.aborted) {
      console.log('[WiFi] Polling aborted by user or screen unmount');
      return;
    }
    await sleep(1500);
    if (abortSignal?.aborted) return;

    const ssid = await getCurrentTripperSsid();
    if (ssid) {
      console.log(`[WiFi] Detected manual connection to: ${ssid}`);
      // Crucial: Bind process traffic to this WiFi network now!
      const bound = await module.bindToActiveWifi();
      console.log(`[WiFi] Bound process to network: ${bound}`);
      if (abortSignal?.aborted) return;
      // Give network stack a moment to stabilise
      await sleep(1000);
      if (abortSignal?.aborted) return;
      onConnected(ssid);
      return;
    }
  }
  if (!abortSignal?.aborted) {
    onTimeout();
  }
};

// ─── Connect via system dialog (WifiNetworkSpecifier) ────────────────────────

export const connectToSsidDirectly = async (ssid: string): Promise<string | null> => {
  if (Platform.OS !== 'android') return null;
  const module = getDashWifi();
  if (!module) throw new Error('DashWifi native module unavailable. Please rebuild the app.');

  try {
    console.log(`[WiFi] Connecting to SSID: ${ssid} via system dialog…`);
    const connected: string = await module.connectToSsid(ssid);
    console.log(`[WiFi] Connected to: ${connected}`);
    await sleep(1500); // Let network stack settle
    return connected;
  } catch (error: any) {
    const msg: string = error?.message || String(error);
    if (msg.includes('UNAVAILABLE') || msg.includes('cancelled')) return null;
    if (msg.includes('UNSUPPORTED')) throw new Error('Your device requires Android 10+.');
    console.error('[WiFi] Connect error:', msg);
    return null;
  }
};

export const connectToTripper = async (): Promise<string | null> => {
  if (Platform.OS !== 'android') return null;
  const module = getDashWifi();
  if (!module) throw new Error('DashWifi module unavailable. Please rebuild the app.');

  try {
    console.log('[WiFi] Requesting connection to RE_* network via system dialog…');
    const ssid: string = await module.connectToPrefix('RE_');
    console.log(`[WiFi] Connected to: ${ssid}`);
    await sleep(1500);
    return ssid;
  } catch (error: any) {
    const msg: string = error?.message || String(error);
    if (msg.includes('UNAVAILABLE') || msg.includes('cancelled')) return null;
    if (msg.includes('UNSUPPORTED')) throw new Error('Your device requires Android 10+.');
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
