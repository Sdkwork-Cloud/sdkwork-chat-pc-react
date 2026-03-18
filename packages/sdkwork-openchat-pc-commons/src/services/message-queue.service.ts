import { v4 as uuidv4 } from "uuid";

export enum MessageStatus {
  PENDING = "pending",
  SENDING = "sending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
  RETRYING = "retrying",
}

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  type: "text" | "image" | "video" | "file";
  status: MessageStatus;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  attachments?: Array<{
    id: string;
    type: string;
    url: string;
    name?: string;
  }>;
}

export enum ConnectionState {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
}

interface ReconnectConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

export class MessageQueueService {
  private queue = new Map<string, QueuedMessage>();
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private config: ReconnectConfig;
  private listeners = new Set<(state: ConnectionState) => void>();
  private messageListeners = new Set<(message: QueuedMessage) => void>();
  private isProcessingQueue = false;

  constructor(config: Partial<ReconnectConfig> = {}) {
    this.config = { ...DEFAULT_RECONNECT_CONFIG, ...config };
    this.startFlushTimer();
  }

  enqueue(
    conversationId: string,
    content: string,
    type: QueuedMessage["type"] = "text",
    attachments?: QueuedMessage["attachments"],
  ): QueuedMessage {
    const message: QueuedMessage = {
      id: uuidv4(),
      conversationId,
      content,
      type,
      status: MessageStatus.PENDING,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      attachments,
    };

    this.queue.set(message.id, message);
    this.notifyMessageUpdate(message);

    if (this.connectionState === ConnectionState.CONNECTED) {
      void this.processQueue();
    }

    return message;
  }

  updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    error?: string,
  ): void {
    const message = this.queue.get(messageId);
    if (!message) {
      return;
    }

    message.status = status;
    if (error) {
      message.error = error;
    }

    if (
      status === MessageStatus.SENT ||
      status === MessageStatus.DELIVERED ||
      status === MessageStatus.READ
    ) {
      this.queue.delete(messageId);
    } else if (
      status === MessageStatus.FAILED &&
      message.retryCount < message.maxRetries
    ) {
      message.status = MessageStatus.RETRYING;
      message.retryCount += 1;
      setTimeout(() => {
        message.status = MessageStatus.PENDING;
        this.notifyMessageUpdate(message);
        if (this.connectionState === ConnectionState.CONNECTED) {
          void this.processQueue();
        }
      }, 1000 * message.retryCount);
    }

    this.notifyMessageUpdate(message);
  }

  getPendingMessages(): QueuedMessage[] {
    return Array.from(this.queue.values()).filter(
      (message) =>
        message.status === MessageStatus.PENDING ||
        message.status === MessageStatus.RETRYING,
    );
  }

  getAllMessages(): QueuedMessage[] {
    return Array.from(this.queue.values());
  }

  setConnectionState(state: ConnectionState): void {
    const prev = this.connectionState;
    this.connectionState = state;
    this.notifyConnectionState(state);

    if (prev !== ConnectionState.CONNECTED && state === ConnectionState.CONNECTED) {
      this.reconnectAttempts = 0;
      void this.processQueue();
      return;
    }

    if (state === ConnectionState.DISCONNECTED) {
      this.scheduleReconnect();
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private async processQueue(): Promise<void> {
    if (this.connectionState !== ConnectionState.CONNECTED || this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    try {
      const pendingMessages = this.getPendingMessages();
      for (const message of pendingMessages) {
        try {
          this.updateMessageStatus(message.id, MessageStatus.SENDING);
          await this.sendMessage(message);
        } catch (error) {
          this.updateMessageStatus(
            message.id,
            MessageStatus.FAILED,
            error instanceof Error ? error.message : "Message send failed.",
          );
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async sendMessage(message: QueuedMessage): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          this.updateMessageStatus(message.id, MessageStatus.SENT);
          resolve();
        } else {
          reject(new Error("Network error"));
        }
      }, 100);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.config.maxRetries) {
      this.setConnectionState(ConnectionState.FAILED);
      return;
    }

    this.connectionState = ConnectionState.RECONNECTING;
    this.notifyConnectionState(this.connectionState);

    const delay = Math.min(
      this.config.initialDelay *
        Math.pow(this.config.backoffMultiplier, this.reconnectAttempts),
      this.config.maxDelay,
    );

    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  private attemptReconnect(): void {
    this.connectionState = ConnectionState.CONNECTING;
    this.notifyConnectionState(this.connectionState);

    setTimeout(() => {
      if (Math.random() > 0.3) {
        this.setConnectionState(ConnectionState.CONNECTED);
      } else {
        this.setConnectionState(ConnectionState.DISCONNECTED);
      }
    }, 1000);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        void this.processQueue();
      }
    }, 5000);
  }

  flush(): void {
    void this.processQueue();
  }

  clear(): void {
    this.queue.clear();
  }

  cancel(messageId: string): boolean {
    const message = this.queue.get(messageId);
    if (message && message.status === MessageStatus.PENDING) {
      this.queue.delete(messageId);
      return true;
    }
    return false;
  }

  retry(messageId: string): boolean {
    const message = this.queue.get(messageId);
    if (!message || message.status !== MessageStatus.FAILED) {
      return false;
    }

    message.status = MessageStatus.PENDING;
    message.retryCount = 0;
    message.error = undefined;
    this.notifyMessageUpdate(message);
    void this.processQueue();
    return true;
  }

  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onMessageUpdate(listener: (message: QueuedMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private notifyConnectionState(state: ConnectionState): void {
    this.listeners.forEach((listener) => listener(state));
  }

  private notifyMessageUpdate(message: QueuedMessage): void {
    this.messageListeners.forEach((listener) => listener(message));
  }

  destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.listeners.clear();
    this.messageListeners.clear();
    this.queue.clear();
  }
}

let messageQueueInstance: MessageQueueService | null = null;

export function getMessageQueueService(): MessageQueueService {
  if (!messageQueueInstance) {
    messageQueueInstance = new MessageQueueService();
  }
  return messageQueueInstance;
}

export function resetMessageQueueService(): void {
  messageQueueInstance?.destroy();
  messageQueueInstance = null;
}
