import { NativeModule, requireNativeModule } from 'expo';

declare class DashWifiModule extends NativeModule<{}> {
  /** Connect to ANY network matching prefix (shows Android system picker). */
  connectToPrefix(prefix: string): Promise<string>;
  /** Connect to a specific SSID by exact name (shows Android system dialog). */
  connectToSsid(ssid: string): Promise<string>;
  /** Scan for WiFi networks matching a prefix. Returns list of matching SSIDs. */
  scanNetworks(prefix: string): Promise<string[]>;
  /** Get the SSID of the currently connected WiFi network, or null. */
  getCurrentSsid(): Promise<string | null>;
  /** Bind the process to the current active WiFi network so traffic routes properly. */
  bindToActiveWifi(): Promise<boolean>;
  /** Open Android WiFi Settings screen (for manual connection fallback). */
  openWifiSettings(): Promise<boolean>;
  /** Disconnect and restore normal network routing. */
  disconnect(): Promise<void>;
}

export default requireNativeModule<DashWifiModule>('DashWifi');
