import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWebSocketBaseUrl } from './config';

const { websocketUrl: WEBSOCKET_URL, sockJsUrl: SOCKJS_URL } = getWebSocketBaseUrl('ws-ping');
const WS_DEBUG_LOGS = false;
const RECONNECT_DELAY_MS = 5000;
const CONNECTION_COOLDOWN_MS = 1500;

const wsDebug = (...args: unknown[]) => {
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

export interface WebSocketCallbacks {
  onPingReceived?: (notification: PingNotification) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: unknown) => void;
}

class WebSocketService {
  private client: Client | null = null;
  private listeners = new Map<string, WebSocketCallbacks>();
  private userId: string | null = null;
  private isConnecting = false;
  private intentionalDisconnect = false;
  private pingSubscription: StompSubscription | null = null;
  private pendingDeactivate: Promise<void> | null = null;
  private pendingActivate: {
    promise: Promise<void>;
    resolve: () => void;
    reject: (error?: unknown) => void;
  } | null = null;
  private lastConnectionActivityAt = 0;
  private connectDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debouncedUserId: string | null = null;

  private touchConnectionActivity(): void {
    this.lastConnectionActivityAt = Date.now();
  }

  private isWithinConnectionCooldown(): boolean {
    return Date.now() - this.lastConnectionActivityAt < CONNECTION_COOLDOWN_MS;
  }

  private clearConnectDebounce(): void {
    if (this.connectDebounceTimer !== null) {
      clearTimeout(this.connectDebounceTimer);
      this.connectDebounceTimer = null;
    }
    this.debouncedUserId = null;
  }

  private scheduleDebouncedConnect(userId: string): void {
    this.debouncedUserId = userId;
    if (this.connectDebounceTimer !== null) {
      return;
    }

    const elapsed = Date.now() - this.lastConnectionActivityAt;
    const delay = Math.max(0, CONNECTION_COOLDOWN_MS - elapsed);

    this.connectDebounceTimer = setTimeout(() => {
      this.connectDebounceTimer = null;
      const uid = this.debouncedUserId;
      this.debouncedUserId = null;

      if (!uid || this.intentionalDisconnect) {
        return;
      }
      if (this.client?.connected || this.client?.active || this.isConnecting || this.pendingActivate) {
        return;
      }

      void this.startClient(uid);
    }, delay);
  }

  private async awaitPendingActivate(): Promise<void> {
    if (!this.pendingActivate) {
      return;
    }

    try {
      await this.pendingActivate.promise;
    } catch {
      /* activation may fail; disconnect can still proceed */
    }
  }

  private settlePendingActivate(outcome: 'resolve' | 'reject', error?: unknown): void {
    if (!this.pendingActivate) {
      return;
    }

    const { resolve, reject } = this.pendingActivate;
    this.pendingActivate = null;

    if (outcome === 'resolve') {
      resolve();
      return;
    }

    reject(error ?? new Error('WebSocket activation failed'));
  }

  private createPendingActivate(): {
    promise: Promise<void>;
    resolve: () => void;
    reject: (error?: unknown) => void;
  } {
    let resolve!: () => void;
    let reject!: (error?: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  /**
   * Register screen-level callbacks without tearing down the shared connection.
   * Returns an unsubscribe function for useEffect cleanup.
   */
  addListener(listenerId: string, callbacks: WebSocketCallbacks): () => void {
    this.listeners.set(listenerId, callbacks);
    if (this.client?.connected && callbacks.onConnected) {
      callbacks.onConnected();
    }
    return () => {
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Idempotent connect for the signed-in owner session (one global STOMP client).
   */
  async ensureConnected(userId: string): Promise<void> {
    if (this.pendingDeactivate) {
      await this.pendingDeactivate;
    }

    this.intentionalDisconnect = false;
    this.debouncedUserId = userId;

    if (this.userId && this.userId !== userId) {
      await this.disconnectInternal();
    }

    this.userId = userId;

    if (this.client?.connected) {
      return;
    }

    if (this.client?.active || this.isConnecting || this.pendingActivate) {
      return;
    }

    if (this.isWithinConnectionCooldown()) {
      this.scheduleDebouncedConnect(userId);
      return;
    }

    await this.startClient(userId);
  }

  /** @deprecated Prefer ensureConnected + addListener */
  connect(userId: string, callbacks: WebSocketCallbacks) {
    this.addListener(`legacy-${userId}`, callbacks);
    void this.ensureConnected(userId);
  }

  /**
   * Disconnect the global session (e.g. owner tab navigator unmount / logout).
   */
  disconnect() {
    this.intentionalDisconnect = true;
    this.listeners.clear();
    this.clearConnectDebounce();
    void this.disconnectInternal();
  }

  isConnected(): boolean {
    return this.client !== null && this.client.connected;
  }

  private async startClient(userId: string): Promise<void> {
    if (this.intentionalDisconnect) {
      return;
    }
    if (this.isConnecting || this.pendingActivate || this.client?.active) {
      return;
    }

    this.touchConnectionActivity();
    this.isConnecting = true;

    try {
      this.client = new Client({
        brokerURL: WEBSOCKET_URL,
        webSocketFactory: () => {
          wsDebug('Creating SockJS connection to:', SOCKJS_URL);
          return new SockJS(SOCKJS_URL, null, {
            transports: ['websocket'],
          });
        },
        connectHeaders: {
          login: 'guest',
          passcode: 'guest',
        },
        debug: (msg: string) => {
          if (WS_DEBUG_LOGS && !msg.includes('HEARTBEAT')) {
            wsDebug('[WebSocket]', msg);
          }
        },
        reconnectDelay: RECONNECT_DELAY_MS,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          this.isConnecting = false;
          this.settlePendingActivate('resolve');
          this.subscribeToPings(userId);
          this.notifyConnected();
        },
        onDisconnect: () => {
          wsDebug('WebSocket disconnected');
          this.isConnecting = false;
          this.settlePendingActivate('reject', new Error('WebSocket disconnected during activation'));
          this.unsubscribePings();
          this.notifyDisconnected();
          if (!this.intentionalDisconnect && this.userId) {
            wsDebug('WebSocket will auto-reconnect via STOMP reconnectDelay');
          }
        },
        onStompError: (frame: unknown) => {
          console.error('WebSocket STOMP error:', frame);
          this.isConnecting = false;
          this.settlePendingActivate('reject', frame);
          this.notifyError(frame);
        },
        onWebSocketError: (event: unknown) => {
          console.error('WebSocket connection error:', event);
          this.isConnecting = false;
          this.settlePendingActivate('reject', event);
          this.notifyError(event);
        },
      });

      wsDebug('Activating WebSocket client via', WEBSOCKET_URL);
      this.client.reconnectDelay = RECONNECT_DELAY_MS;
      this.pendingActivate = this.createPendingActivate();
      this.client.activate();
    } catch (error) {
      console.error('Failed to create WebSocket client:', error);
      this.isConnecting = false;
      this.settlePendingActivate('reject', error);
      this.notifyError(error);
    }
  }

  private subscribeToPings(userId: string) {
    if (!this.client?.connected) {
      return;
    }

    this.unsubscribePings();

    const topicPath = `/topic/ping/${userId}`;
    wsDebug(`Subscribing to: ${topicPath}`);

    try {
      this.pingSubscription = this.client.subscribe(topicPath, (message) => {
        try {
          const notification = JSON.parse(message.body) as PingNotification;
          wsDebug('Parsed ping notification:', notification);
          this.notifyPing(notification);
        } catch (error) {
          console.error('Error parsing ping message:', error);
        }
      });
    } catch (error) {
      console.error('Error subscribing to ping topic:', error);
    }
  }

  private unsubscribePings() {
    try {
      this.pingSubscription?.unsubscribe();
    } catch {
      /* ignore stale subscription */
    }
    this.pingSubscription = null;
  }

  private async disconnectInternal(): Promise<void> {
    this.clearConnectDebounce();
    this.unsubscribePings();

    await this.awaitPendingActivate();

    const client = this.client;
    this.client = null;
    this.isConnecting = false;
    this.pendingActivate = null;
    this.userId = null;
    this.touchConnectionActivity();

    if (!client) {
      return;
    }

    if (client.active) {
      try {
        client.reconnectDelay = 0;
        this.pendingDeactivate = client.deactivate();
        await this.pendingDeactivate;
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
      } finally {
        this.pendingDeactivate = null;
      }
    }

    this.notifyDisconnected();
  }

  private notifyPing(notification: PingNotification) {
    for (const callbacks of this.listeners.values()) {
      callbacks.onPingReceived?.(notification);
    }
  }

  private notifyConnected() {
    for (const callbacks of this.listeners.values()) {
      callbacks.onConnected?.();
    }
  }

  private notifyDisconnected() {
    for (const callbacks of this.listeners.values()) {
      callbacks.onDisconnected?.();
    }
  }

  private notifyError(error: unknown) {
    for (const callbacks of this.listeners.values()) {
      callbacks.onError?.(error);
    }
  }
}

export default new WebSocketService();
