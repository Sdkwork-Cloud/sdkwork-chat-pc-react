import { translate } from "@sdkwork/openchat-pc-i18n";
import type { Message, MessageStatus } from "../entities/message.entity";
import {
  convertFrontendContentToSDK,
  deleteMessage as sdkDeleteMessage,
  getMessageList,
  getUnreadCount as sdkGetUnreadCount,
  markMessageAsRead as sdkMarkMessageAsRead,
  markMessagesAsRead as sdkMarkMessagesAsRead,
  recallMessage as sdkRecallMessage,
  registerSDKEvents,
  searchMessageList,
  sendCustomMessage,
  sendImageMessage,
  sendTextMessage,
} from "../adapters/sdk-adapter";

export type MessageContentType =
  | "text"
  | "image"
  | "file"
  | "voice"
  | "video"
  | "location"
  | "card";

export interface MessageContent {
  type: MessageContentType;
  text?: string;
  html?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  card?: {
    title: string;
    description: string;
    url: string;
    image?: string;
  };
}

export interface SendMessageParams {
  conversationId: string;
  content: MessageContent;
  replyToMessageId?: string;
  mentions?: string[];
  isGroup?: boolean;
}

export interface MessageQueryParams {
  conversationId: string;
  beforeMessageId?: string;
  afterMessageId?: string;
  limit?: number;
  keyword?: string;
}

class MessageQueue {
  private queue: Array<{
    id: string;
    params: SendMessageParams;
    resolve: (message: Message) => void;
    reject: (error: Error) => void;
  }> = [];

  private processing = false;

  async add(params: SendMessageParams): Promise<Message> {
    return new Promise((resolve, reject) => {
      const id = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      this.queue.push({ id, params, resolve, reject });
      void this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        continue;
      }

      try {
        const message = await this.sendMessageInternal(item.params);
        item.resolve(message);
      } catch (error) {
        item.reject(error as Error);
      }
    }
    this.processing = false;
  }

  private async sendMessageInternal(params: SendMessageParams): Promise<Message> {
    const { conversationId, content, isGroup = false } = params;

    switch (content.type) {
      case "text":
        return sendTextMessage(conversationId, content.text || "", isGroup);
      case "image":
        return sendImageMessage(
          conversationId,
          content.url || "",
          {
            width: content.width,
            height: content.height,
            fileSize: content.fileSize,
          },
          isGroup,
        );
      default:
        return this.sendCustomMessage(conversationId, content, isGroup);
    }
  }

  private async sendCustomMessage(
    conversationId: string,
    content: MessageContent,
    isGroup: boolean,
  ): Promise<Message> {
    const sdkContent = convertFrontendContentToSDK(content as unknown as Record<string, unknown>);
    return sendCustomMessage(
      conversationId,
      {
        ...(sdkContent as Record<string, unknown>),
        type: content.type,
        ...(content as unknown as Record<string, unknown>),
      },
      { isGroup },
    );
  }
}

const messageQueue = new MessageQueue();
const messageStatusCache = new Map<string, MessageStatus>();
let messageEventsDisposer: (() => void) | null = null;

export function registerMessageEventListeners() {
  if (messageEventsDisposer) {
    return messageEventsDisposer;
  }

  try {
    messageEventsDisposer = registerSDKEvents({
      onMessageSent: (message) => {
        messageStatusCache.set(message.id, message.status);
      },
      onMessageReceived: (message) => {
        messageStatusCache.set(message.id, message.status);
      },
    });
    return messageEventsDisposer;
  } catch (error) {
    console.warn("Failed to register message event listeners:", error);
    messageEventsDisposer = null;
  }
}

export function destroyMessageEventListeners(): void {
  messageEventsDisposer?.();
  messageEventsDisposer = null;
}

export async function sendMessage(params: SendMessageParams): Promise<Message> {
  try {
    return await messageQueue.add(params);
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
}

export async function sendBatchMessages(
  paramsList: SendMessageParams[],
): Promise<Message[]> {
  try {
    return await Promise.all(paramsList.map((params) => messageQueue.add(params)));
  } catch (error) {
    console.error("Failed to send messages in batch:", error);
    throw error;
  }
}

export function getMessageStatus(messageId: string): MessageStatus | undefined {
  return messageStatusCache.get(messageId);
}

export function clearMessageStatusCache(): void {
  messageStatusCache.clear();
}

export async function getMessages(
  params: MessageQueryParams,
): Promise<Message[]> {
  const { conversationId, beforeMessageId, limit = 50 } = params;

  try {
    return await getMessageList(conversationId, {
      beforeMessageId,
      limit,
    });
  } catch (error) {
    console.error("Failed to load messages:", error);
    throw error;
  }
}

export async function updateMessageStatus(
  _conversationId: string,
  messageId: string,
  status: MessageStatus,
): Promise<void> {
  try {
    switch (status) {
      case "read":
        await sdkMarkMessageAsRead(messageId);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Failed to update message status:", error);
    throw error;
  }
}

export async function recallMessage(
  _conversationId: string,
  messageId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await sdkRecallMessage(messageId);
    if (!success) {
      return {
        success: false,
        error: translate(
          "Failed to recall message because the recall window may have expired.",
        ),
      };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to recall message:", error);
    return {
      success: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : translate("Failed to recall message."),
    };
  }
}

export async function deleteMessage(
  _conversationId: string,
  messageId: string,
): Promise<void> {
  try {
    await sdkDeleteMessage(messageId);
  } catch (error) {
    console.error("Failed to delete message:", error);
    throw error;
  }
}

export async function searchMessages(
  conversationId: string,
  keyword: string,
  limit = 20,
): Promise<Message[]> {
  try {
    const messages = await searchMessageList(conversationId, keyword);
    return messages.slice(0, limit);
  } catch (error) {
    console.error("Failed to search messages:", error);
    throw error;
  }
}

export async function markMessagesAsRead(
  conversationId: string,
  messageIds?: string[],
): Promise<void> {
  try {
    if (messageIds && messageIds.length > 0) {
      await sdkMarkMessagesAsRead(conversationId, messageIds);
    } else {
      const messages = await getMessages({
        conversationId,
        limit: 100,
      });
      const unreadIds = messages
        .filter((item) => item.senderId !== "current-user" && item.status !== "read")
        .map((item) => item.id);
      if (unreadIds.length > 0) {
        await sdkMarkMessagesAsRead(conversationId, unreadIds);
      }
    }
  } catch (error) {
    console.error("Failed to mark messages as read:", error);
    throw error;
  }
}

export async function getUnreadCount(conversationId: string): Promise<number> {
  try {
    return await sdkGetUnreadCount(conversationId);
  } catch (error) {
    console.error("Failed to load unread count:", error);
    return 0;
  }
}
