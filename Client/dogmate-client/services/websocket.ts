import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWebSocketBaseUrl } from './config';

const { websocketUrl: WEBSOCKET_URL, sockJsUrl: SOCKJS_URL } = getWebSocketBaseUrl('ws-ping');
const WS_DEBUG_LOGS = false;
const wsDebug = (...args: any[]) => {
  if (__DEV__ && WS_DEBUG_LOGS) {
    console.log(...args);
  }
};


export interface PingNotification {
  kind?: string;
  pingId?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  timestamp: number;
  dogName?: string | null;
  dogBreed?: string | null;
  dogAgeLabel?: string | null;
  dogImageUrl?: string | null;
  accepted?: boolean | null;
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
      if (callbacks.onConnected) callbacks.onConnected();
      return;
    }

    if (this.isConnecting) {
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
          wsDebug('Creating SockJS connection to:', SOCKJS_URL);
          const socket = new SockJS(SOCKJS_URL, null, {
            transports: ['websocket', 'xhr-streaming', 'xhr-polling']
          });
          return socket;
        },
        connectHeaders: {
          login: 'guest',
          passcode: 'guest',
        },
        debug: (msg: string) => {
          // Keep STOMP debug logs fully silent unless explicitly enabled.
          if (WS_DEBUG_LOGS && !msg.includes('HEARTBEAT')) {
            wsDebug('[WebSocket]', msg);
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: (frame: any) => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Subscribe to ping notifications for this user
          this.subscribeToPings(userId);

          if (this.callbacks.onConnected) {
            this.callbacks.onConnected();
          }
        },
        onDisconnect: (frame: any) => {
          wsDebug('WebSocket disconnected');
          if (this.callbacks.onDisconnected) {
            this.callbacks.onDisconnected();
          }
          this.attemptReconnect(userId);
        },
        onStompError: (frame: any) => {
          // This is an actionable error, keep it visible.
          console.error('WebSocket STOMP error:', frame);
          this.isConnecting = false;
          if (this.callbacks.onError) {
            this.callbacks.onError(frame);
          }
        },
        onWebSocketError: (event: any) => {
          // This is an actionable error, keep it visible.
          console.error('WebSocket connection error:', event);
          this.isConnecting = false;
          if (this.callbacks.onError) {
            this.callbacks.onError(event);
          }
        },
      });

      wsDebug('Attempting to activate WebSocket client via', WEBSOCKET_URL);
      this.client.activate();
    } catch (error) {
      console.error('Failed to create WebSocket client:', error);
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
      wsDebug('WebSocket not connected, cannot subscribe');
      return;
    }

    const topicPath = `/topic/ping/${userId}`;
    wsDebug(`Subscribing to: ${topicPath}`);

    try {
      this.client.subscribe(topicPath, (message: any) => {
        try {
          // Parse the message body
          const notification = JSON.parse(message.body);
          wsDebug('Parsed ping notification:', notification);
          
          // Call the callback
          if (this.callbacks.onPingReceived) {
            this.callbacks.onPingReceived(notification);
          }
        } catch (error) {
          console.error('Error parsing ping message:', error);
        }
      });
      wsDebug('Successfully subscribed to ping topic');
    } catch (error) {
      console.error('Error subscribing to ping topic:', error);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(userId: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      wsDebug(`Attempting reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect(userId, this.callbacks);
      }, delay);
    } else {
      console.error(`WebSocket: max reconnection attempts (${this.maxReconnectAttempts}) reached`);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.client && this.client.connected) {
      try {
        this.client.deactivate();
        wsDebug('WebSocket disconnected');
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