import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BASE_URL } from './config';


// Use ws:// protocol for WebSocket instead of http://
const WEBSOCKET_URL = 'ws://192.168.1.164:8080/ws-ping';
// Fallback SockJS endpoint
const SOCKJS_URL = 'http://192.168.1.164:8080/ws-ping';


interface PingNotification {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  timestamp: number;
}

interface WebSocketCallbacks {
  onPingReceived?: (notification: PingNotification) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}

class WebSocketService {
  private client: Client | null = null;
  private callbacks: WebSocketCallbacks = {};
  private isConnecting = false;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server using STOMP protocol
   */
  connect(userId: string, callbacks: WebSocketCallbacks) {
    if (this.client?.connected) {
      console.log('Already connected to WebSocket');
      if (callbacks.onConnected) callbacks.onConnected();
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection in progress...');
      return;
    }

    this.userId = userId;
    this.callbacks = callbacks;
    this.isConnecting = true;
    this.reconnectAttempts = 0;

    try {
      // Create STOMP client with SockJS fallback for better compatibility
      this.client = new Client({
        // Use SockJS with HTTP transport option for better cross-platform support
        webSocketFactory: () => {
          console.log('Creating SockJS connection to:', SOCKJS_URL);
          const socket = new SockJS(SOCKJS_URL, null, {
            transport: ['websocket', 'xhr-streaming', 'xhr-polling']
          });
          return socket;
        },
        connectHeaders: {
          login: 'guest',
          passcode: 'guest',
        },
        debug: (msg: string) => {
          // Only log important messages, not every heartbeat
          if (!msg.includes('HEARTBEAT')) {
            console.log('[WebSocket]', msg);
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: (frame: any) => {
          console.log('✅ WebSocket Connected Successfully');
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Subscribe to ping notifications for this user
          this.subscribeToPings(userId);

          if (this.callbacks.onConnected) {
            this.callbacks.onConnected();
          }
        },
        onDisconnect: (frame: any) => {
          console.log('❌ WebSocket Disconnected');
          if (this.callbacks.onDisconnected) {
            this.callbacks.onDisconnected();
          }
          this.attemptReconnect(userId);
        },
        onStompError: (frame: any) => {
          console.error('⚠️ WebSocket STOMP Error:', frame);
          this.isConnecting = false;
          if (this.callbacks.onError) {
            this.callbacks.onError(frame);
          }
        },
        onWebSocketError: (event: any) => {
          console.error('⚠️ WebSocket Connection Error:', event);
          this.isConnecting = false;
          if (this.callbacks.onError) {
            this.callbacks.onError(event);
          }
        },
      });

      console.log('Attempting to activate WebSocket client...');
      this.client.activate();
    } catch (error) {
      console.error('❌ Failed to create WebSocket client:', error);
      this.isConnecting = false;
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    }
  }

  /**
   * Subscribe to ping notifications
   */
  private subscribeToPings(userId: string) {
    if (!this.client || !this.client.connected) {
      console.error('❌ WebSocket not connected, cannot subscribe');
      return;
    }

    const topicPath = `/topic/ping/${userId}`;
    console.log(`📩 Subscribing to: ${topicPath}`);

    try {
      this.client.subscribe(topicPath, (message: any) => {
        console.log('📨 Raw message received:', message);
        try {
          // Parse the message body
          const notification = JSON.parse(message.body);
          console.log('✅ Successfully parsed ping notification:', notification);
          
          // Call the callback
          if (this.callbacks.onPingReceived) {
            console.log('🔔 Invoking onPingReceived callback');
            this.callbacks.onPingReceived(notification);
          } else {
            console.warn('⚠️ No onPingReceived callback set');
          }
        } catch (error) {
          console.error('❌ Error parsing ping message:', error, 'Body:', message.body);
        }
      });
      console.log('✅ Successfully subscribed to ping topic');
    } catch (error) {
      console.error('❌ Error subscribing to pings:', error);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(userId: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect(userId, this.callbacks);
      }, delay);
    } else {
      console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.client && this.client.connected) {
      try {
        this.client.deactivate();
        console.log('WebSocket disconnected');
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
      }
    }
    this.client = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client !== null && this.client.connected;
  }
}

export default new WebSocketService();