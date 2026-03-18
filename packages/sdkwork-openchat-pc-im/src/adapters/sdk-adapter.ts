

import {
  OpenChatClient,
  createOpenChatClient,
  ResourceBuilder,
  Message as SDKMessage,
  Conversation as SDKConversation,
  Group as SDKGroup,
  GroupMember as SDKGroupMember,
  MessageType,
  MessageStatus as SDKMessageStatus,
  OpenChatEvent,
} from '@openchat/typescript-sdk';
import { formatDate as formatAppDate, translate } from "@sdkwork/openchat-pc-i18n";

import type { Message, MessageStatus } from '../entities/message.entity';
import type { Conversation } from '../entities/conversation.entity';
import type { Group, GroupMember } from '../entities/group.entity';

export interface SDKAdapterConfig {
  apiBaseUrl: string;
  imWsUrl: string;
  uid: string;
  token: string;
  deviceId?: string;
}

let sdkClient: OpenChatClient | null = null;
let sdkInitializing: Promise<OpenChatClient> | null = null;

interface SDKState {
  initialized: boolean;
  connecting: boolean;
  connected: boolean;
  error: string | null;
}

let sdkState: SDKState = {
  initialized: false,
  connecting: false,
  connected: false,
  error: null,
};

let stateChangeCallbacks: Array<(state: SDKState) => void> = [];


export function getSDKClient(throwIfNotInitialized: boolean = true): OpenChatClient | null {
  if (!sdkClient && throwIfNotInitialized) {
    throw new Error('SDK client not initialized. Call initializeSDK first.');
  }
  return sdkClient;
}


export async function initializeSDK(config: SDKAdapterConfig): Promise<OpenChatClient> {
  if (sdkClient) {
    console.warn('SDK already initialized');
    return sdkClient;
  }

  if (sdkInitializing) {
    console.warn('SDK initialization in progress');
    return sdkInitializing;
  }

  sdkInitializing = (async () => {
    try {
      updateSDKState({ connecting: true, error: null });

      const sdkConfig: any = {
        server: {
          baseUrl: config.apiBaseUrl,
        },
        im: {
          wsUrl: config.imWsUrl,
          deviceId: config.deviceId || `web-${Date.now()}`,
        },
        auth: {
          uid: config.uid,
          token: config.token,
        },
        debug: import.meta.env.MODE === 'development',
      };

      sdkClient = createOpenChatClient(sdkConfig);
      
      sdkClient.on(OpenChatEvent.CONNECTED, () => {
        updateSDKState({ connected: true, error: null });
      });
      
      sdkClient.on(OpenChatEvent.DISCONNECTED, () => {
        updateSDKState({ connected: false });
      });
      
      sdkClient.on(OpenChatEvent.ERROR, (error: any) => {
        updateSDKState({ error: error.message || 'Unknown error' });
      });

      await sdkClient.init();
      updateSDKState({ initialized: true, connecting: false, connected: true });

      return sdkClient;
    } catch (error: any) {
      console.error('SDK initialization failed:', error);
      updateSDKState({ 
        initialized: false, 
        connecting: false, 
        error: error.message || 'Initialization failed' 
      });
      throw error;
    } finally {
      sdkInitializing = null;
    }
  })();

  return sdkInitializing;
}


export function destroySDK(): void {
  if (sdkClient) {
    sdkClient.destroy();
    sdkClient = null;
  }
  updateSDKState({ 
    initialized: false, 
    connecting: false, 
    connected: false, 
    error: null 
  });
  stateChangeCallbacks = [];
}


export function isSDKInitialized(): boolean {
  return sdkState.initialized;
}


export function getSDKState(): SDKState {
  return { ...sdkState };
}


export function subscribeToSDKState(callback: (state: SDKState) => void): () => void {
  stateChangeCallbacks.push(callback);
  
  callback(getSDKState());
  
  return () => {
    stateChangeCallbacks = stateChangeCallbacks.filter(cb => cb !== callback);
  };
}


function updateSDKState(updates: Partial<SDKState>): void {
  sdkState = { ...sdkState, ...updates };
  stateChangeCallbacks.forEach(callback => callback(getSDKState()));
}



export function convertSDKMessageToFrontend(sdkMessage: SDKMessage): Message {
  const content = parseMessageContent(sdkMessage);

  return {
    id: sdkMessage.id,
    conversationId: sdkMessage.channelId || '',
    senderId: sdkMessage.fromUid || '',
    senderName: sdkMessage.fromUid || '', 
    senderAvatar: '', 
    content,
    time: sdkMessage.timestamp ? new Date(sdkMessage.timestamp).toISOString() : new Date().toISOString(),
    status: convertMessageStatus(sdkMessage.status),
  };
}


function parseMessageContent(sdkMessage: SDKMessage): any {
  const { type, content } = sdkMessage;

  switch (type) {
    case MessageType.TEXT:
      return {
        type: 'text',
        text: content.text || '',
        html: content.html,
      };

    case MessageType.IMAGE:
      return {
        type: 'image',
        url: content.url,
        width: content.width,
        height: content.height,
        fileName: content.name,
        fileSize: content.size,
      };

    case MessageType.AUDIO:
      return {
        type: 'voice',
        url: content.url,
        duration: content.duration,
        fileName: content.name,
        fileSize: content.size,
      };

    case MessageType.VIDEO:
      return {
        type: 'video',
        url: content.url,
        thumbUrl: content.thumbnail,
        duration: content.duration,
        width: content.width,
        height: content.height,
        fileName: content.name,
        fileSize: content.size,
      };

    case MessageType.FILE:
      return {
        type: 'file',
        url: content.url,
        fileName: content.name,
        fileSize: content.size,
      };

    case MessageType.LOCATION:
      return {
        type: 'location',
        location: {
          latitude: content.latitude,
          longitude: content.longitude,
          address: content.address,
        },
      };

    case MessageType.CARD:
      return {
        type: 'card',
        card: {
          title: content.title,
          description: content.description,
          url: content.url,
          image: content.imageUrl,
        },
      };

    default:
      return {
        type: 'text',
        text: translate("[Unknown message type]"),
      };
  }
}


export function convertFrontendContentToSDK(content: any): any {
  switch (content.type) {
    case 'text':
      return ResourceBuilder.text(content.text);

    case 'image':
      return ResourceBuilder.image(content.url, {
        width: content.width?.toString(),
        height: content.height?.toString(),
        size: content.fileSize?.toString(),
      });

    case 'voice':
      return ResourceBuilder.audio(content.url, content.duration?.toString() || '0');

    case 'video':
      return ResourceBuilder.video(content.url, content.duration?.toString() || '0', {
        coverUrl: content.thumbUrl,
        width: content.width?.toString(),
        height: content.height?.toString(),
      });

    case 'file':
      return ResourceBuilder.file(content.url, content.fileName, {
        size: content.fileSize,
      } as any);

    case 'location':
      console.warn('Location message type not supported by SDK');
      return ResourceBuilder.text(
        translate("[Location] {{name}}", {
          name: content.location?.name || "",
        }),
      );

    case 'card':
      console.warn('Card message type not supported by SDK');
      return ResourceBuilder.text(
        translate("[Card] {{title}}", {
          title: content.card?.title || "",
        }),
      );

    default:
      throw new Error(`Unsupported message type: ${content.type}`);
  }
}


function convertMessageStatus(status?: SDKMessageStatus): MessageStatus {
  switch (status) {
    case SDKMessageStatus.SENDING:
      return 'sending';
    case SDKMessageStatus.SENT:
      return 'sent';
    case SDKMessageStatus.DELIVERED:
      return 'delivered';
    case SDKMessageStatus.READ:
      return 'read';
    case SDKMessageStatus.FAILED:
      return 'failed';
    default:
      return 'sending';
  }
}



export function convertSDKConversationToFrontend(sdkConversation: SDKConversation): Conversation {
  const lastMessage = sdkConversation.lastMessage
    ? convertSDKMessageToFrontend(sdkConversation.lastMessage)
    : undefined;

  let conversationType: 'ai' | 'group' | 'user' = 'user';
  if (sdkConversation.type === 'group') {
    conversationType = 'group';
  } else if (sdkConversation.type === 'customer') {
    conversationType = 'ai';
  }

  return {
    id: sdkConversation.id,
    name: sdkConversation.name || sdkConversation.targetId,
    avatar: sdkConversation.avatar || '',
    lastMessage: lastMessage?.content?.text || '',
    lastMessageTime: formatTime(sdkConversation.updatedAt),
    unreadCount: sdkConversation.unreadCount || 0,
    isOnline: false, 
    isTyping: false,
    type: conversationType,
  };
}




function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return translate("Just now");
  }

  if (diff < 3600000) {
    return translate("{{count}} minutes ago", {
      count: Math.floor(diff / 60000),
    });
  }

  if (diff < 86400000) {
    return translate("{{count}} hours ago", {
      count: Math.floor(diff / 3600000),
    });
  }

  if (diff < 604800000) {
    return translate("{{count}} days ago", {
      count: Math.floor(diff / 86400000),
    });
  }

  return formatAppDate(date, { dateStyle: "short" });
}



export function convertSDKGroupToFrontend(sdkGroup: SDKGroup): Group {
  return {
    id: sdkGroup.id,
    name: sdkGroup.name,
    avatar: sdkGroup.avatar || sdkGroup.name[0]?.toUpperCase() || 'G',
    memberCount: sdkGroup.memberCount || 0,
    maxMembers: sdkGroup.maxMembers || 500,
    description: sdkGroup.notice || '',
    creatorId: '', 
    ownerId: sdkGroup.ownerUid || '',
    members: [], 
    createdAt: typeof sdkGroup.createdAt === 'number' ? new Date(sdkGroup.createdAt).toISOString() : new Date().toISOString(),
    settings: {
      allowInvite: true,
      allowMemberModify: false,
      needVerify: true,
      showMemberCount: true,
    },
    notices: [], 
  };
}


export function convertSDKGroupMemberToFrontend(sdkMember: SDKGroupMember): GroupMember {
  return {
    id: sdkMember.uid,
    name: sdkMember.groupNickname || sdkMember.uid,
    avatar: sdkMember.user?.avatar || '',
    role: convertMemberRole(sdkMember.role),
    isOnline: false, 
    joinTime: typeof sdkMember.joinedAt === 'number' ? new Date(sdkMember.joinedAt).toISOString() : new Date().toISOString(),
  };
}


function convertMemberRole(role?: number): 'owner' | 'admin' | 'member' {
  switch (role) {
    case 2:
      return 'owner';
    case 1:
      return 'admin';
    case 0:
    default:
      return 'member';
  }
}



export function registerSDKEvents(callbacks: {
  onMessageReceived?: (message: Message) => void;
  onMessageSent?: (message: Message) => void;
  onMessageRecalled?: (messageId: string) => void;
  onMessageDeleted?: (messageId: string) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}): () => void {
  if (!sdkClient) {
    console.warn('SDK not initialized, skipping event registration');
    return () => {}; 
  }
  
  const client = sdkClient;

  const handlers: Array<{ event: OpenChatEvent; handler: any }> = [];

  if (callbacks.onMessageReceived) {
    const handler = (sdkMessage: SDKMessage) => {
      callbacks.onMessageReceived!(convertSDKMessageToFrontend(sdkMessage));
    };
    client.on(OpenChatEvent.MESSAGE_RECEIVED, handler);
    handlers.push({ event: OpenChatEvent.MESSAGE_RECEIVED, handler });
  }

  if (callbacks.onMessageSent) {
    const handler = (sdkMessage: SDKMessage) => {
      callbacks.onMessageSent!(convertSDKMessageToFrontend(sdkMessage));
    };
    client.on(OpenChatEvent.MESSAGE_SENT, handler);
    handlers.push({ event: OpenChatEvent.MESSAGE_SENT, handler });
  }

  if (callbacks.onConnected) {
    client.on(OpenChatEvent.CONNECTED, callbacks.onConnected);
    handlers.push({ event: OpenChatEvent.CONNECTED, handler: callbacks.onConnected });
  }

  if (callbacks.onDisconnected) {
    client.on(OpenChatEvent.DISCONNECTED, callbacks.onDisconnected);
    handlers.push({ event: OpenChatEvent.DISCONNECTED, handler: callbacks.onDisconnected });
  }

  if (callbacks.onError) {
    client.on(OpenChatEvent.ERROR, callbacks.onError);
    handlers.push({ event: OpenChatEvent.ERROR, handler: callbacks.onError });
  }

  return () => {
    handlers.forEach(({ event, handler }) => {
      client.off(event, handler);
    });
  };
}



export async function sendTextMessage(
  conversationId: string,
  text: string,
  isGroup: boolean = false
): Promise<Message> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');

  const params = isGroup
    ? { groupId: conversationId, text }
    : { toUserId: conversationId, text };

  const sdkMessage = await client.im.messages.sendText(params);
  return convertSDKMessageToFrontend(sdkMessage);
}


export async function sendImageMessage(
  conversationId: string,
  imageUrl: string,
  options?: { width?: number; height?: number; fileSize?: number },
  isGroup: boolean = false
): Promise<Message> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');

  const resource = ResourceBuilder.image(imageUrl, {
    width: options?.width,
    height: options?.height,
    size: options?.fileSize,
  } as any);

  const params = isGroup
    ? { groupId: conversationId, resource }
    : { toUserId: conversationId, resource };

  const sdkMessage = await client.im.messages.sendImage(params);
  return convertSDKMessageToFrontend(sdkMessage);
}


export async function getMessageList(
  conversationId: string,
  options?: { beforeMessageId?: string; limit?: number }
): Promise<Message[]> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');

  const sdkMessages = await client.im.messages.getMessageList(conversationId, {
    startMessageId: options?.beforeMessageId,
    limit: options?.limit || 50,
  });

  return sdkMessages.map(convertSDKMessageToFrontend);
}


export async function getConversationList(): Promise<Conversation[]> {
  if (!sdkClient) {
    console.warn('SDK not initialized, returning empty conversation list');
    return [];
  }

  const sdkConversations = await sdkClient.im.conversations.getConversationList();
  return sdkConversations.map(convertSDKConversationToFrontend);
}


export async function recallMessage(messageId: string): Promise<boolean> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');
  return client.im.messages.recallMessage(messageId);
}


export async function deleteMessage(messageId: string): Promise<boolean> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');
  return client.im.messages.deleteMessage(messageId);
}


export async function markMessageAsRead(messageId: string): Promise<void> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');
  return client.im.messages.markMessageAsRead(messageId);
}


export async function markConversationAsRead(conversationId: string): Promise<void> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');
  return client.im.messages.markConversationAsRead(conversationId);
}


export async function searchMessageList(
  conversationId: string,
  keyword: string
): Promise<Message[]> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');

  const sdkMessages = await client.im.messages.searchMessages(keyword, conversationId);
  return sdkMessages.map(convertSDKMessageToFrontend);
}


export async function getGroupList(): Promise<Group[]> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');

  const sdkGroups = await client.im.groups.getMyGroups();
  return sdkGroups.map(convertSDKGroupToFrontend);
}


export async function getGroupDetail(groupId: string): Promise<Group | null> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');

  try {
    const sdkGroup = await client.im.groups.getGroup(groupId);
    return convertSDKGroupToFrontend(sdkGroup);
  } catch (error) {
    return null;
  }
}


export async function createGroup(
  name: string,
  memberIds: string[],
  options?: { description?: string; avatar?: string }
): Promise<Group> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');

  const sdkGroup = await client.im.groups.createGroup(name, memberIds, {
    avatar: options?.avatar,
    notice: options?.description,
  });

  return convertSDKGroupToFrontend(sdkGroup);
}


export async function addGroupMembers(groupId: string, memberIds: string[]): Promise<void> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');

  for (const memberId of memberIds) {
    await client.im.groups.addGroupMember(groupId, memberId);
  }
}


export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');
  await client.im.groups.removeGroupMember(groupId, memberId);
}


export async function quitGroup(groupId: string): Promise<void> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');
  await client.im.groups.quitGroup(groupId);
}


export async function dissolveGroup(groupId: string): Promise<void> {
  const client = getSDKClient(false);
  if (!client) throw new Error('SDK not initialized');
  await client.im.groups.dissolveGroup(groupId);
}

export type { OpenChatClient };
