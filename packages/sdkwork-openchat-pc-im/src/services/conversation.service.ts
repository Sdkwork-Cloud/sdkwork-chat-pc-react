import type { Conversation } from "../entities/conversation.entity";
import {
  deleteConversation as sdkDeleteConversation,
  getConversation as sdkGetConversation,
  getConversationList,
  getTotalUnreadCount as sdkGetTotalUnreadCount,
  markConversationAsRead as sdkMarkConversationAsRead,
  muteConversation as sdkMuteConversation,
  pinConversation as sdkPinConversation,
  registerSDKEvents,
  setConversationDraft as sdkSetConversationDraft,
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
    return await sdkGetConversation(conversationId);
  } catch (error) {
    console.error("Failed to load conversation details:", error);
    return null;
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    await sdkDeleteConversation(conversationId);
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
    await sdkPinConversation(conversationId, isPinned);
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
    await sdkMuteConversation(conversationId, isMuted);
  } catch (error) {
    console.error("Failed to mute conversation:", error);
    throw error;
  }
}

export async function markConversationAsRead(
  conversationId: string,
): Promise<void> {
  try {
    await sdkMarkConversationAsRead(conversationId);
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
    await sdkSetConversationDraft(conversationId, draft);
  } catch (error) {
    console.error("Failed to set conversation draft:", error);
    throw error;
  }
}

export async function getTotalUnreadCount(): Promise<number> {
  try {
    return await sdkGetTotalUnreadCount();
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
