export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video",
  FILE = "file",
  LOCATION = "location",
  CARD = "card",
}

export enum MessageStatus {
  SENDING = "sending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

export enum OpenChatEvent {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
  MESSAGE_RECEIVED = "message_received",
  MESSAGE_SENT = "message_sent",
}

export interface MessageContent {
  text?: string;
  html?: string;
  url?: string;
  width?: number | string;
  height?: number | string;
  size?: number | string;
  name?: string;
  duration?: number | string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  channelId?: string;
  fromUid?: string;
  timestamp?: number;
  type: MessageType;
  status?: MessageStatus;
  content: MessageContent;
}

export interface Conversation {
  id: string;
  name?: string;
  avatar?: string;
  targetId: string;
  type?: "group" | "customer" | "user" | string;
  updatedAt: number;
  unreadCount?: number;
  lastMessage?: Message;
  [key: string]: unknown;
}

export interface Group {
  id: string;
  name: string;
  avatar?: string;
  memberCount?: number;
  maxMembers?: number;
  notice?: string;
  ownerUid?: string;
  createdAt?: number;
}

export interface GroupMember {
  uid: string;
  groupNickname?: string;
  role?: number;
  joinedAt?: number;
  user?: {
    avatar?: string;
  };
}

export interface OpenChatClientConfig {
  server?: {
    baseUrl?: string;
  };
  im?: {
    wsUrl?: string;
    deviceId?: string;
  };
  auth?: {
    uid?: string;
    token?: string;
  };
  debug?: boolean;
}

export interface BuiltResource {
  type: MessageType;
  content: MessageContent;
}

type EventPayload = Message | Conversation | Group | GroupMember | Error | undefined;
type EventHandler = (...args: any[]) => void;

class SimpleEmitter {
  private listeners = new Map<OpenChatEvent, Set<EventHandler>>();

  on(event: OpenChatEvent, handler: EventHandler): void {
    const handlers = this.listeners.get(event) ?? new Set<EventHandler>();
    handlers.add(handler);
    this.listeners.set(event, handlers);
  }

  off(event: OpenChatEvent, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit(event: OpenChatEvent, payload?: EventPayload): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => handler(payload));
  }
}

let messageSeed = 0;

function createMessageId(): string {
  messageSeed += 1;
  return `openchat-local-${Date.now()}-${messageSeed}`;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.length > 0 && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function normalizeContent(content: MessageContent): MessageContent {
  const normalized: MessageContent = { ...content };
  normalized.width = toNumber(content.width);
  normalized.height = toNumber(content.height);
  normalized.size = toNumber(content.size);
  normalized.duration = toNumber(content.duration);
  return normalized;
}

function toMessageType(value: unknown): MessageType {
  switch (String(value ?? "").toLowerCase()) {
    case "image":
      return MessageType.IMAGE;
    case "audio":
    case "voice":
      return MessageType.AUDIO;
    case "video":
      return MessageType.VIDEO;
    case "file":
      return MessageType.FILE;
    case "location":
      return MessageType.LOCATION;
    case "card":
      return MessageType.CARD;
    case "text":
    default:
      return MessageType.TEXT;
  }
}

function toMessageContent(data: unknown): MessageContent {
  if (typeof data === "object" && data !== null) {
    const maybeResource = data as BuiltResource;
    if (
      "content" in maybeResource &&
      typeof maybeResource.content === "object" &&
      maybeResource.content !== null
    ) {
      return normalizeContent(maybeResource.content);
    }
    return normalizeContent(data as MessageContent);
  }
  return {
    text: data == null ? "" : String(data),
  };
}

export class ResourceBuilder {
  static text(text: string, html?: string): BuiltResource {
    return {
      type: MessageType.TEXT,
      content: { text, html },
    };
  }

  static image(
    url: string,
    options?: { width?: number | string; height?: number | string; size?: number | string },
  ): BuiltResource {
    return {
      type: MessageType.IMAGE,
      content: normalizeContent({
        url,
        width: options?.width,
        height: options?.height,
        size: options?.size,
      }),
    };
  }

  static audio(url: string, duration?: number | string): BuiltResource {
    return {
      type: MessageType.AUDIO,
      content: normalizeContent({
        url,
        duration,
      }),
    };
  }

  static video(
    url: string,
    duration?: number | string,
    options?: { coverUrl?: string; width?: number | string; height?: number | string },
  ): BuiltResource {
    return {
      type: MessageType.VIDEO,
      content: normalizeContent({
        url,
        duration,
        thumbnail: options?.coverUrl,
        width: options?.width,
        height: options?.height,
      }),
    };
  }

  static file(
    url: string,
    name: string,
    options?: { size?: number | string },
  ): BuiltResource {
    return {
      type: MessageType.FILE,
      content: normalizeContent({
        url,
        name,
        size: options?.size,
      }),
    };
  }
}

interface SendTextParams {
  toUserId?: string;
  groupId?: string;
  text: string;
}

interface SendImageParams {
  toUserId?: string;
  groupId?: string;
  resource: BuiltResource;
}

interface SendCustomParams {
  toUserId?: string;
  groupId?: string;
  customType?: string;
  data?: unknown;
}

interface MessageListParams {
  startMessageId?: string;
  limit?: number;
}

interface GroupCreateParams {
  avatar?: string;
  notice?: string;
}

export class OpenChatClient {
  private readonly emitter = new SimpleEmitter();
  private readonly config: OpenChatClientConfig;
  private connected = false;
  private readonly conversations = new Map<string, Conversation>();

  readonly im = {
    messages: {
      sendText: async (params: SendTextParams): Promise<Message> => {
        const message = this.createMessage(
          MessageType.TEXT,
          { text: params.text },
          params.groupId ?? params.toUserId,
        );
        this.upsertConversation(message);
        this.emitter.emit(OpenChatEvent.MESSAGE_SENT, message);
        return message;
      },
      sendImage: async (params: SendImageParams): Promise<Message> => {
        const message = this.createMessage(
          params.resource.type,
          params.resource.content,
          params.groupId ?? params.toUserId,
        );
        this.upsertConversation(message);
        this.emitter.emit(OpenChatEvent.MESSAGE_SENT, message);
        return message;
      },
      sendCustom: async (params: SendCustomParams): Promise<Message> => {
        const message = this.createMessage(
          toMessageType(params.customType),
          toMessageContent(params.data),
          params.groupId ?? params.toUserId,
        );
        this.upsertConversation(message);
        this.emitter.emit(OpenChatEvent.MESSAGE_SENT, message);
        return message;
      },
      getMessageList: async (_conversationId: string, _options?: MessageListParams): Promise<Message[]> => {
        return [];
      },
      recallMessage: async (_messageId: string): Promise<boolean> => {
        return true;
      },
      deleteMessage: async (_messageId: string): Promise<boolean> => {
        return true;
      },
      markMessageAsRead: async (_messageId: string): Promise<void> => {},
      markConversationAsRead: async (_conversationId: string): Promise<void> => {},
      searchMessages: async (_keyword: string, _conversationId?: string): Promise<Message[]> => {
        return [];
      },
    },
    conversations: {
      getConversationList: async (): Promise<Conversation[]> => {
        return [...this.conversations.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      },
      getConversation: async (conversationId: string): Promise<Conversation | undefined> => {
        return this.conversations.get(conversationId);
      },
      deleteConversation: async (conversationId: string): Promise<void> => {
        this.conversations.delete(conversationId);
      },
      pinConversation: async (conversationId: string, isPinned: boolean): Promise<void> => {
        const conversation = this.getOrCreateConversation(conversationId);
        conversation.pinned = isPinned;
      },
      muteConversation: async (conversationId: string, isMuted: boolean): Promise<void> => {
        const conversation = this.getOrCreateConversation(conversationId);
        conversation.muted = isMuted;
      },
      setConversationDraft: async (conversationId: string, draft: string): Promise<void> => {
        const conversation = this.getOrCreateConversation(conversationId);
        conversation.draft = draft;
      },
    },
    groups: {
      getMyGroups: async (): Promise<Group[]> => {
        return [];
      },
      getGroup: async (groupId: string): Promise<Group> => {
        return {
          id: groupId,
          name: "Local Group",
        };
      },
      createGroup: async (
        name: string,
        memberIds: string[],
        options?: GroupCreateParams,
      ): Promise<Group> => {
        return {
          id: createMessageId(),
          name,
          avatar: options?.avatar,
          memberCount: memberIds.length,
          notice: options?.notice,
          createdAt: Date.now(),
        };
      },
      addGroupMember: async (_groupId: string, _memberId: string): Promise<void> => {},
      removeGroupMember: async (_groupId: string, _memberId: string): Promise<void> => {},
      quitGroup: async (_groupId: string): Promise<void> => {},
      dissolveGroup: async (_groupId: string): Promise<void> => {},
    },
  };

  constructor(config: OpenChatClientConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    this.connected = true;
    this.emitter.emit(OpenChatEvent.CONNECTED);
  }

  destroy(): void {
    if (this.connected) {
      this.connected = false;
      this.emitter.emit(OpenChatEvent.DISCONNECTED);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  on(event: OpenChatEvent, handler: EventHandler): void {
    this.emitter.on(event, handler);
  }

  off(event: OpenChatEvent, handler: EventHandler): void {
    this.emitter.off(event, handler);
  }

  private createMessage(type: MessageType, content: MessageContent, channelId?: string): Message {
    return {
      id: createMessageId(),
      channelId,
      fromUid: this.config.auth?.uid ?? "local-user",
      timestamp: Date.now(),
      type,
      status: MessageStatus.SENT,
      content: normalizeContent(content),
    };
  }

  private getOrCreateConversation(conversationId: string): Conversation {
    const existing = this.conversations.get(conversationId);
    if (existing) {
      return existing;
    }

    const created: Conversation = {
      id: conversationId,
      targetId: conversationId,
      name: conversationId,
      updatedAt: Date.now(),
      unreadCount: 0,
      type: "user",
    };
    this.conversations.set(conversationId, created);
    return created;
  }

  private upsertConversation(message: Message): void {
    const conversationId = message.channelId ?? "unknown";
    const conversation = this.getOrCreateConversation(conversationId);
    conversation.lastMessage = message;
    conversation.updatedAt = message.timestamp ?? Date.now();
    this.conversations.set(conversationId, conversation);
  }
}

export function createOpenChatClient(config: OpenChatClientConfig): OpenChatClient {
  return new OpenChatClient(config);
}
