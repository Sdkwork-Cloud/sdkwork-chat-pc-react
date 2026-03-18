

import { IM_WS_URL } from '../config/env';

class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (listeners) {
      this.events.set(event, listeners.filter(l => l !== listener));
    }
  }

  once(event: string, listener: Function): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }
}

export interface WebSocketConfig {
  url: string;
  token: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  messageQueueSize?: number;
  messageExpiryTime?: number;
}

export interface WebSocketMessage {
  event: string;
  payload: any;
  messageId?: string;
  timestamp?: number;
  priority?: 'low' | 'normal' | 'high';
  expiryTime?: number;
}

export interface MessageAck {
  messageId: string;
  status: 'delivered' | 'read';
  timestamp: number;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface ConnectionInfo {
  state: ConnectionState;
  reconnectAttempts: number;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  heartbeatStatus: 'healthy' | 'warning' | 'error';
  messageQueueSize: number;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: number | null = null;
  private heartbeatTimeoutTimer: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private pendingAcks: Map<string, { resolve: () => void; reject: () => void; timeout: number }> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private lastConnectedAt?: number;
  private lastDisconnectedAt?: number;
  private heartbeatStatus: 'healthy' | 'warning' | 'error' = 'healthy';
  private lastHeartbeatTime = 0;

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
      messageQueueSize: 1000,
      messageExpiryTime: 300000,
      ...config,
    };
  }

  
  get state(): ConnectionState {
    return this.connectionState;
  }

  
  get isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  
  get connectionInfo(): ConnectionInfo {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      heartbeatStatus: this.heartbeatStatus,
      messageQueueSize: this.messageQueue.length,
    };
  }

  
  connect(): void {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.emit('stateChange', this.connectionState, this.connectionInfo);

    try {
      const url = `${this.config.url}?token=${this.config.token}&timestamp=${Date.now()}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      this.handleError(error);
    }
  }

  
  disconnect(): void {
    this.stopHeartbeat();
    this.reconnectAttempts = this.config.reconnectAttempts; 

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.lastDisconnectedAt = Date.now();
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('disconnected', this.connectionInfo);
  }

  
  send(event: string, payload: any, options?: {
    requireAck?: boolean;
    priority?: 'low' | 'normal' | 'high';
    expiryTime?: number;
  }): Promise<void> {
    const {
      requireAck = false,
      priority = 'normal',
      expiryTime = this.config.messageExpiryTime,
    } = options || {};

    const message: WebSocketMessage = {
      event,
      payload,
      messageId: requireAck ? this.generateMessageId() : undefined,
      timestamp: Date.now(),
      priority,
      expiryTime: Date.now() + expiryTime,
    };

    if (this.isConnected) {
      this.doSend(message);

      if (requireAck && message.messageId) {
        return this.waitForAck(message.messageId);
      }

      return Promise.resolve();
    } else {
      this.emit('messageQueued', message, this.messageQueue.length);

      if (requireAck && message.messageId) {
        return this.waitForAck(message.messageId);
      }

      return Promise.resolve();
    }
  }

  
  async sendWithAck(event: string, payload: any, options?: {
    timeout?: number;
    priority?: 'low' | 'normal' | 'high';
    expiryTime?: number;
  }): Promise<void> {
    const {
      timeout = 30000,
      priority = 'high',
      expiryTime = this.config.messageExpiryTime,
    } = options || {};

    const messageId = this.generateMessageId();
    const message: WebSocketMessage = {
      event,
      payload,
      messageId,
      timestamp: Date.now(),
      priority,
      expiryTime: Date.now() + expiryTime,
    };

    return new Promise((resolve, reject) => {
      const timeoutTimer = window.setTimeout(() => {
        this.pendingAcks.delete(messageId);
        const error = new Error('Message acknowledgment timeout');
        this.emit('ackTimeout', messageId, error);
        reject(error);
      }, timeout);

      this.pendingAcks.set(messageId, {
        resolve: () => {
          clearTimeout(timeoutTimer);
          resolve();
        },
        reject: (error?: Error) => {
          clearTimeout(timeoutTimer);
          reject(error || new Error('Message acknowledgment failed'));
        },
        timeout: timeoutTimer,
      });

        this.doSend(message);
      } else {
        this.enqueueMessage(message);
      }
    });
  }

  
  ack(messageId: string, status: 'delivered' | 'read' = 'delivered'): void {
    this.send('message:ack', {
      messageId,
      status,
      timestamp: Date.now(),
    }, {
      priority: 'low',
    });
  }

  
  cleanupExpiredMessages(): number {
    const now = Date.now();
    const initialSize = this.messageQueue.length;
    
    this.messageQueue = this.messageQueue.filter(message => {
      const isExpired = message.expiryTime && message.expiryTime < now;
      if (isExpired) {
        this.emit('messageExpired', message);
      }
      return !isExpired;
    });
    
    return initialSize - this.messageQueue.length;
  }

  
  clearMessageQueue(): void {
    const clearedMessages = [...this.messageQueue];
    this.messageQueue = [];
    this.emit('messageQueueCleared', clearedMessages.length);
  }

  
  getMessageQueueStatus() {
    const now = Date.now();
    const expiredCount = this.messageQueue.filter(message => 
      message.expiryTime && message.expiryTime < now
    ).length;
    
    return {
      total: this.messageQueue.length,
      expired: expiredCount,
      healthy: this.messageQueue.length < this.config.messageQueueSize * 0.8,
      byPriority: {
        high: this.messageQueue.filter(m => m.priority === 'high').length,
        normal: this.messageQueue.filter(m => m.priority === 'normal').length,
        low: this.messageQueue.filter(m => m.priority === 'low').length,
      },
    };
  }


  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.connectionState = 'connected';
    this.lastConnectedAt = Date.now();
    this.heartbeatStatus = 'healthy';
    this.lastHeartbeatTime = Date.now();
    
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('connected', this.connectionInfo);

    this.startHeartbeat();

    const expiredCount = this.cleanupExpiredMessages();
    if (expiredCount > 0) {
      this.emit('expiredMessagesCleaned', expiredCount);
    }

    this.flushMessageQueue();

    this.emit('syncRequired');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;

      if (data.event === 'pong') {
        this.handlePong();
        return;
      }

      if (data.event === 'message:ack' && data.payload?.messageId) {
        this.handleAck(data.payload as MessageAck);
        return;
      }

      this.emit(data.event, data.payload, data);
      this.emit('message', data);
    } catch (error: any) {
      const parseError = new Error(`Failed to parse message: ${error.message}`);
      this.emit('error', parseError);
      this.emit('messageParseError', parseError, event.data);
    }
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this.connectionState = 'disconnected';
    this.lastDisconnectedAt = Date.now();
    this.heartbeatStatus = 'error';
    
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('disconnected', event.code, event.reason);

    this.attemptReconnect();
  }

  private handleError(error: any): void {
    this.connectionState = 'error';
    this.heartbeatStatus = 'error';
    
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('error', error);
    this.emit('connectionError', error);

    this.attemptReconnect();
  }

  private handlePong(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    this.heartbeatStatus = 'healthy';
    this.emit('heartbeatHealthy');
  }

  private handleAck(ack: MessageAck): void {
    const pending = this.pendingAcks.get(ack.messageId);
    if (pending) {
      pending.resolve();
      this.pendingAcks.delete(ack.messageId);
    }

    this.emit('ack', ack);
  }

  private doSend(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.emit('messageSent', message);
      } catch (error) {
        this.emit('sendError', error, message);
        this.enqueueMessage(message);
      }
    } else {
      this.enqueueMessage(message);
    }
  }

  private enqueueMessage(message: WebSocketMessage): void {
      const lowPriorityIndex = this.messageQueue.findIndex(m => m.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        this.messageQueue.shift();
      }
      this.emit('messageQueueFull', this.config.messageQueueSize);
    }

    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const messagePriority = priorityOrder[message.priority || 'normal'];
    
    let insertIndex = this.messageQueue.length;
    for (let i = 0; i < this.messageQueue.length; i++) {
      const queuePriority = priorityOrder[this.messageQueue[i].priority || 'normal'];
      if (messagePriority < queuePriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.messageQueue.splice(insertIndex, 0, message);
  }

  private flushMessageQueue(): void {
    this.cleanupExpiredMessages();
    
    this.messageQueue.sort((a, b) => {
      const priorityA = priorityOrder[a.priority || 'normal'];
      const priorityB = priorityOrder[b.priority || 'normal'];
      return priorityA - priorityB;
    });

    this.messageQueue = [];
    
    messagesToSend.forEach(message => {
        this.doSend(message);
      } else {
        this.emit('messageExpired', message);
      }
    });

    this.emit('messageQueueFlushed', messagesToSend.length);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;
      
        this.heartbeatStatus = 'warning';
        this.emit('heartbeatWarning', timeSinceLastHeartbeat);
      }

        timestamp: now,
        sequence: Math.floor(now / this.config.heartbeatInterval)
      }, {
        priority: 'low',
        requireAck: false,
      });

      this.heartbeatTimeoutTimer = window.setTimeout(() => {
        this.heartbeatStatus = 'error';
        this.emit('heartbeatTimeout');
        this.emit('connectionError', new Error('Heartbeat timeout'));
        
          this.ws.close(4000, 'Heartbeat timeout');
        }
      }, this.config.heartbeatTimeout);
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.emit('reconnectFailed', this.reconnectAttempts);
      this.connectionState = 'disconnected';
      this.emit('stateChange', this.connectionState, this.connectionInfo);
      return;
    }

    this.reconnectAttempts++;
    this.connectionState = 'reconnecting';
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('reconnecting', this.reconnectAttempts, this.config.reconnectAttempts);

      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    const finalDelay = Math.max(this.config.reconnectDelay, delay + jitter);

    setTimeout(() => {
      this.connect();
    }, finalDelay);
  }

  private waitForAck(messageId: string, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutTimer = window.setTimeout(() => {
        this.pendingAcks.delete(messageId);
        const error = new Error('Message acknowledgment timeout');
        this.emit('ackTimeout', messageId, error);
        reject(error);
      }, timeout);

      this.pendingAcks.set(messageId, {
        resolve,
        reject,
        timeout: timeoutTimer,
      });
    });
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default WebSocketClient;

export const websocketClient = new WebSocketClient({
  url: IM_WS_URL || 'ws://localhost:5200',
  token: localStorage.getItem('token') || '',
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
  messageQueueSize: 1000,
  messageExpiryTime: 300000
});


