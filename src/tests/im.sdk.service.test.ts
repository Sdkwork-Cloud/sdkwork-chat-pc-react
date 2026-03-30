import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const conversationListMock = vi.fn();
  const conversationGetMock = vi.fn();
  const totalUnreadMock = vi.fn();
  const sendMessageMock = vi.fn();
  const getUserMessagesMock = vi.fn();
  const getGroupMessagesMock = vi.fn();
  const recallMessageMock = vi.fn();
  const deleteMessageMock = vi.fn();
  const markAsReadMock = vi.fn();

  const backendClient = {
    conversations: {
      conversationControllerGetByUserId: conversationListMock,
      conversationControllerGetById: conversationGetMock,
      conversationControllerGetTotalUnreadCount: totalUnreadMock,
      conversationControllerDelete: vi.fn(),
      conversationControllerPin: vi.fn(),
      conversationControllerMute: vi.fn(),
      conversationControllerClearUnreadCount: vi.fn(),
      conversationControllerUpdate: vi.fn(),
    },
    messages: {
      messageControllerSend: sendMessageMock,
      messageControllerGetByUserId: getUserMessagesMock,
      messageControllerGetByGroupId: getGroupMessagesMock,
      messageControllerRecall: recallMessageMock,
      messageControllerDelete: deleteMessageMock,
      messageControllerMarkAsRead: markAsReadMock,
      messageControllerMarkGroupAsRead: markAsReadMock,
    },
  };

  const realtime = {
    onMessage: vi.fn(() => () => undefined),
    onEvent: vi.fn(() => () => undefined),
    onRaw: vi.fn(() => () => undefined),
    onConnectionStateChange: vi.fn(() => () => undefined),
    isConnected: vi.fn(() => true),
    getSession: vi.fn(() => undefined),
  };

  return {
    backendClient,
    conversationGetMock,
    conversationListMock,
    deleteMessageMock,
    getGroupMessagesMock,
    getUserMessagesMock,
    markAsReadMock,
    recallMessageMock,
    realtime,
    sendMessageMock,
    totalUnreadMock,
  };
});

vi.mock("@sdkwork/openchat-pc-kernel", async () => {
  const actual = await vi.importActual<typeof import("@sdkwork/openchat-pc-kernel")>(
    "@sdkwork/openchat-pc-kernel",
  );

  return {
    ...actual,
    getPcImSdkClient: vi.fn(() => mocks.backendClient),
    getPcImSdk: vi.fn(() => ({
      realtime: mocks.realtime,
      rtc: {
        signaling: {
          subscribe: vi.fn(() => () => undefined),
        },
      },
    })),
    getPcImSessionIdentity: vi.fn(() => ({
      userId: "user-1",
      username: "neo",
      displayName: "Neo",
      authToken: "auth-token",
      accessToken: "access-token",
    })),
  };
});

describe("im sdk-backed services", () => {
  beforeEach(() => {
    mocks.conversationListMock.mockReset();
    mocks.conversationGetMock.mockReset();
    mocks.totalUnreadMock.mockReset();
    mocks.sendMessageMock.mockReset();
    mocks.getUserMessagesMock.mockReset();
    mocks.getGroupMessagesMock.mockReset();
    mocks.recallMessageMock.mockReset();
    mocks.deleteMessageMock.mockReset();
    mocks.markAsReadMock.mockReset();
  });

  it("maps sdk conversation payloads into the app conversation model with target identity preserved", async () => {
    mocks.conversationListMock.mockResolvedValue([
      {
        id: "conv-1",
        targetId: "user-2",
        type: "SINGLE",
        name: "Alice",
        avatar: "https://example.com/alice.png",
        unreadCount: 3,
        updatedAt: "2026-03-30T10:00:00.000Z",
        lastMessage: {
          type: "TEXT",
          text: {
            text: "Hello from sdk",
          },
        },
      },
    ]);

    const { getConversations } = await import(
      "../../packages/sdkwork-openchat-pc-im/src/services/conversation.service"
    );

    const conversations = await getConversations();

    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({
      id: "conv-1",
      targetId: "user-2",
      name: "Alice",
      lastMessage: "Hello from sdk",
      unreadCount: 3,
      type: "single",
    });
  });

  it("sends text messages through the IM backend sdk using conversation target metadata and normalizes the current sender", async () => {
    mocks.conversationListMock.mockResolvedValue([
      {
        id: "conv-1",
        targetId: "user-2",
        type: "SINGLE",
        name: "Alice",
        updatedAt: "2026-03-30T10:00:00.000Z",
      },
    ]);
    mocks.sendMessageMock.mockResolvedValue({
      success: true,
      message: {
        id: "msg-1",
        type: "TEXT",
        status: "SENT",
        fromUserId: "user-1",
        createdAt: "2026-03-30T10:01:00.000Z",
        conversation: {
          type: "SINGLE",
          targetId: "user-2",
        },
        content: {
          text: {
            text: "Hello via IM backend sdk",
          },
        },
      },
    });

    const { getConversations } = await import(
      "../../packages/sdkwork-openchat-pc-im/src/services/conversation.service"
    );
    const { sendMessage } = await import(
      "../../packages/sdkwork-openchat-pc-im/src/services/message.service"
    );

    await getConversations();
    const message = await sendMessage({
      conversationId: "conv-1",
      content: {
        type: "text",
        text: "Hello via IM backend sdk",
      },
    });

    expect(mocks.sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation: {
          type: "SINGLE",
          targetId: "user-2",
        },
        message: {
          type: "TEXT",
          text: {
            text: "Hello via IM backend sdk",
          },
        },
      }),
    );
    expect(message).toMatchObject({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "current-user",
      content: {
        type: "text",
        text: "Hello via IM backend sdk",
      },
      status: "sent",
    });
  });
});
