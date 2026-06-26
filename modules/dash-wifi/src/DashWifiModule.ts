import { NativeModule, requireNativeModule } from 'expo';

declare class DashWifiModule extends NativeModule<{}> {
  connectToPrefix(prefix: String): Promise<string>;
  disconnect(): Promise<void>;
}

export default requireNativeModule<DashWifiModule>('DashWifi');
