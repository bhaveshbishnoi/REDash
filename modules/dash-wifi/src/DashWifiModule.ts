import { NativeModule, requireNativeModule } from 'expo';

declare class DashWifiModule extends NativeModule<{}> {
  /** Connect to ANY network matching prefix (legacy, shows system picker). */
  connectToPrefix(prefix: string): Promise<string>;
  /** Connect to a specific SSID by exact name. */
  connectToSsid(ssid: string): Promise<string>;
  /** Scan for WiFi networks matching a prefix. Returns list of matching SSIDs. */
  scanNetworks(prefix: string): Promise<string[]>;
  /** Disconnect and restore normal network routing. */
  disconnect(): Promise<void>;
}

export default requireNativeModule<DashWifiModule>('DashWifi');
