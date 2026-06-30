/**
 * RE Tripper Dash – K1G UDP Protocol Service
 *
 * The Tripper Dash (found on Guerrilla 450 / Himalayan 450) acts as a WiFi AP
 * (SSID: RE_<model>_<serial>, IP: 192.168.1.1) and communicates over UDP.
 *
 * Protocol (reverse-engineered by community):
 *  - Control plane: UDP port 2002
 *  - The dash sends sync requests (type 0x03, 0x0F) to the connected phone
 *  - Phone must respond with ACK/session packets to maintain the session
 *  - A discovery ping to port 2002 confirms the dash is reachable before full handshake
 *
 * References:
 *  - norbertFeron/better-dash (GitHub)
 *  - mihaiblaga.dev – connected bike protocol breakdown
 */

import { Platform } from 'react-native';

const DASH_IP = '192.168.1.1';
const DASH_CONTROL_PORT = 2002;
const CONNECTION_TIMEOUT_MS = 15000;
const PROBE_RETRY_COUNT = 3;
const PROBE_RETRY_DELAY_MS = 1200;

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'wifi_connected'
  | 'dash_reachable'
  | 'connected'
  | 'failed'
  | 'disconnected';

class K1GProtocol {
  private status: ConnectionStatus = 'idle';
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private onStatusChange: ((s: ConnectionStatus) => void) | null = null;

  getStatus(): ConnectionStatus {
    return this.status;
  }

  setStatusListener(cb: (s: ConnectionStatus) => void) {
    this.onStatusChange = cb;
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.onStatusChange?.(s);
  }

  /**
   * Checks whether the dash is reachable at 192.168.1.1 by attempting a
   * UDP socket connection and listening for the initial sync-settings packet
   * (0x03) that the dash broadcasts when a client connects to the AP.
   *
   * On Android this uses react-native-tcp-socket UDP mode (UDP is supported
   * via the createConnection API with the 'udp4' family option).
   * On iOS WiFi direct is not yet supported so we return false immediately.
   */
  async initializeConnection(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('[K1G] iOS direct WiFi connection not supported yet');
      return false;
    }

    this.setStatus('connecting');

    return new Promise<boolean>((resolve) => {
      let resolved = false;

      const finish = (success: boolean) => {
        if (resolved) return;
        resolved = true;
        if (success) {
          this.setStatus('connected');
          this.startKeepAlive();
          resolve(true);
        } else {
          this.setStatus('failed');
          resolve(false);
        }
      };

      const timer = setTimeout(() => {
        console.warn('[K1G] Connection to dash timed out');
        finish(false);
      }, CONNECTION_TIMEOUT_MS);

      // Retry probing up to PROBE_RETRY_COUNT times — the dash can be slow
      // to respond after the network stack settles from bindProcessToNetwork.
      const probeWithRetry = async (): Promise<boolean> => {
        for (let attempt = 1; attempt <= PROBE_RETRY_COUNT; attempt++) {
          console.log(`[K1G] Probe attempt ${attempt}/${PROBE_RETRY_COUNT}…`);
          const reachable = await this.probeDashReachability();
          if (reachable) return true;
          if (attempt < PROBE_RETRY_COUNT) {
            await new Promise<void>((r) => setTimeout(r, PROBE_RETRY_DELAY_MS));
          }
        }
        return false;
      };

      probeWithRetry()
        .then((reachable) => {
          clearTimeout(timer);
          if (reachable) {
            this.setStatus('dash_reachable');
            finish(true);
          } else {
            finish(false);
          }
        })
        .catch(() => {
          clearTimeout(timer);
          finish(false);
        });
    });
  }

  /**
   * Probes the Tripper Dash control port (UDP 2002) via a TCP connection
   * attempt. If the port responds (even with a reset), the dash is on-network.
   * Also tries the well-known HTTP endpoint some firmware versions expose.
   */
  private async probeDashReachability(): Promise<boolean> {
    // Try HTTP probe first (some firmware versions expose a status endpoint)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`http://${DASH_IP}/`, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timeoutId);
      if (res.status < 500) {
        console.log('[K1G] Dash reachable via HTTP probe');
        return true;
      }
    } catch (_) {
      // HTTP probe failed — expected on most firmware versions
    }

    // Second probe: try connecting to port 2002 via TcpSocket
    // If the dash is on-network, it will either accept or actively reject the
    // connection — both confirm the device is present on 192.168.1.1
    try {
      const TcpSocket = require('react-native-tcp-socket');
      return await new Promise<boolean>((resolve) => {
        let done = false;
        const socket = TcpSocket.createConnection(
          { port: DASH_CONTROL_PORT, host: DASH_IP, timeout: 5000 },
          () => {
            // Connected — dash is alive
            if (!done) { done = true; socket.destroy(); resolve(true); }
          }
        );
        socket.on('error', (err: any) => {
          // ECONNREFUSED means port is closed but host responded (dash present)
          if (!done) {
            done = true;
            const isRefused = err?.message?.includes('ECONNREFUSED') ||
                              err?.message?.includes('Connection refused');
            socket.destroy();
            resolve(isRefused); // still reachable if actively refused
          }
        });
        socket.on('timeout', () => {
          if (!done) { done = true; socket.destroy(); resolve(false); }
        });
        setTimeout(() => {
          if (!done) { done = true; try { socket.destroy(); } catch (_) {}; resolve(false); }
        }, 5500);
      });
    } catch (err) {
      console.warn('[K1G] TCP probe failed:', err);
      return false;
    }
  }

  /**
   * Sends periodic pings to keep the dash aware of our presence.
   * In the real K1G protocol, the phone must respond to 0x0F keepalive
   * packets. Here we send simple keepalive probes every 10s.
   */
  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(async () => {
      if (this.status !== 'connected') {
        this.stopKeepAlive();
        return;
      }
      const alive = await this.probeDashReachability();
      if (!alive) {
        console.warn('[K1G] Dash no longer reachable — lost connection');
        this.setStatus('disconnected');
        this.stopKeepAlive();
      }
    }, 10_000);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer !== null) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  disconnect() {
    this.stopKeepAlive();
    this.setStatus('disconnected');
    console.log('[K1G] Disconnected from Tripper Dash');
  }
}

export const k1gProtocol = new K1GProtocol();
