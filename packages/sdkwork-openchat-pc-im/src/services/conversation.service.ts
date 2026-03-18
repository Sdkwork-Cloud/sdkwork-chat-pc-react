import type { Conversation } from "../entities/conversation.entity";
import {
  convertSDKConversationToFrontend,
  getConversationList,
  getSDKClient,
  registerSDKEvents,
} from "../adapters/sdk-adapter";

export interface ConversationQueryParams {
  type?: "single" | "group" | "ai" | "customer" | "user";
  keyword?: string;
  limit?: number;
}

export async function getConversations(
  params?: ConversationQueryParams,
): Promise<Conversation[]> {
  try {
    let conversations = await getConversationList();

    if (params?.type) {
      conversations = conversations.filter((item) => item.type === params.type);
    }

    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase();
      conversations = conversations.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.lastMessage.toLowerCase().includes(keyword),
      );
    }

    if (params?.limit) {
      conversations = conversations.slice(0, params.limit);
    }

    return conversations;
  } catch (error) {
    console.error("Failed to load conversations:", error);
    throw error;
  }
}

export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  try {
    const client = getSDKClient(false);
    if (!client) {
      throw new Error("SDK not initialized");
    }

    const sdkConversation = await client.im.conversations.getConversation(
      conversationId,
    );
    if (!sdkConversation) {
      return null;
    }

    return convertSDKConversationToFrontend(sdkConversation);
  } catch (error) {
    console.error("Failed to load conversation details:", error);
    return null;
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const client = getSDKClient(false);
    if (!client) {
      throw new Error("SDK not initialized");
    }
    await client.im.conversations.deleteConversation(conversationId);
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    throw error;
  }
}

export async function pinConversation(
  conversationId: string,
  isPinned: boolean,
): Promise<void> {
  try {
    const client = getSDKClient(false);
    if (!client) {
      throw new Error("SDK not initialized");
    }
    await client.im.conversations.pinConversation(conversationId, isPinned);
  } catch (error) {
    console.error("Failed to pin conversation:", error);
    throw error;
  }
}

export async function muteConversation(
  conversationId: string,
  isMuted: boolean,
): Promise<void> {
  try {
    const client = getSDKClient(false);
    if (!client) {
      throw new Error("SDK not initialized");
    }
    await client.im.conversations.muteConversation(conversationId, isMuted);
  } catch (error) {
    console.error("Failed to mute conversation:", error);
    throw error;
  }
}

export async function markConversationAsRead(
  conversationId: string,
): Promise<void> {
  try {
    const client = getSDKClient(false);
    if (!client) {
      throw new Error("SDK not initialized");
    }
    await client.im.messages.markConversationAsRead(conversationId);
  } catch (error) {
    console.error("Failed to mark conversation as read:", error);
    throw error;
  }
}

export async function setConversationDraft(
  conversationId: string,
  draft: string,
): Promise<void> {
  try {
    const client = getSDKClient(false);
    if (!client) {
      throw new Error("SDK not initialized");
    }
    await client.im.conversations.setConversationDraft(conversationId, draft);
  } catch (error) {
    console.error("Failed to set conversation draft:", error);
    throw error;
  }
}

export async function getTotalUnreadCount(): Promise<number> {
  try {
    const conversations = await getConversationList();
    return conversations.reduce(
      (total, item) => total + (item.unreadCount || 0),
      0,
    );
  } catch (error) {
    console.error("Failed to load unread count:", error);
    return 0;
  }
}

export function onConversationUpdated(
  callback: (conversation: Conversation) => void,
): () => void {
  return registerSDKEvents({
    onConversationUpdated: callback,
  });
}
