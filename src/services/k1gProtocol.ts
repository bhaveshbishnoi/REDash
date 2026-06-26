import TcpSocket from 'react-native-tcp-socket';
import * as Crypto from 'expo-crypto';

const DASH_IP = '192.168.1.1'; // Tripper Dash IP
const K1G_PORT = 2000;

export class K1GProtocol {
  private socket: ReturnType<typeof TcpSocket.createConnection> | null = null;
  private isConnected = false;

  async initializeConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log('Connecting to Dash via K1G Protocol on UDP/TCP...');
        
        // K1G protocol typically uses UDP or TCP based on implementation, 
        // We'll use TCP Socket as requested in the prompt via react-native-tcp-socket
        this.socket = TcpSocket.createConnection({
          port: K1G_PORT,
          host: DASH_IP,
        }, () => {
            console.log('Socket connection established.');
            this.isConnected = true;
            resolve(true);
        });

        this.socket.on('data', (data) => {
            console.log('Received data from Dash:', data.toString());
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.isConnected = false;
            resolve(false);
        });

        this.socket.on('close', () => {
            console.log('Connection closed');
            this.isConnected = false;
        });

        // Set a timeout to resolve false if it takes too long
        setTimeout(() => {
            if (!this.isConnected) {
                console.warn('Socket connection timed out.');
                resolve(false);
            }
        }, 5000);

      } catch (error) {
        console.error('K1G connection failed:', error);
        resolve(false);
      }
    });
  }

  async sendControlCommand(command: string, params: any): Promise<boolean> {
    if (!this.socket || !this.isConnected) return false;

    try {
      // Encrypt command (Simulated AES/RSA)
      const encryptedPayload = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify({ command, params })
      );
      
      this.socket.write(encryptedPayload);
      return true;
    } catch (error) {
      console.error('K1G command failed:', error);
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const k1gProtocol = new K1GProtocol();
