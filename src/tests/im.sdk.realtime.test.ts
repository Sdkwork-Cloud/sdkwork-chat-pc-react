import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let messageListener: ((frame: Record<string, unknown>) => void) | null = null;

  return {
    getMessageListener: () => messageListener,
    realtime: {
      onMessage: vi.fn((listener: (frame: Record<string, unknown>) => void) => {
        messageListener = listener;
        return () => {
          messageListener = null;
        };
      }),
      onEvent: vi.fn(() => () => undefined),
      onConnectionStateChange: vi.fn(() => () => undefined),
    },
  };
});

vi.mock("@sdkwork/openchat-pc-kernel", async () => {
  const actual = await vi.importActual<typeof import("@sdkwork/openchat-pc-kernel")>(
    "@sdkwork/openchat-pc-kernel",
  );

  return {
    ...actual,
    getPcImSdk: vi.fn(() => ({
      realtime: mocks.realtime,
      rtc: {
        signaling: {
          subscribe: vi.fn(() => () => undefined),
        },
      },
      messages: {},
      conversations: {},
      groups: {},
      contacts: {},
      friends: {},
    })),
    getPcImSdkClient: vi.fn(() => ({
      conversations: {},
      messages: {},
    })),
    getPcImSessionIdentity: vi.fn(() => ({
      userId: "user-1",
      username: "neo",
      displayName: "Neo",
      authToken: "auth-token",
    })),
  };
});

describe("im sdk realtime bridge", () => {
  beforeEach(() => {
    mocks.realtime.onMessage.mockClear();
    mocks.realtime.onEvent.mockClear();
    mocks.realtime.onConnectionStateChange.mockClear();
  });

  it("maps realtime message frames into app messages and normalizes current-user sends", async () => {
    const onMessageReceived = vi.fn();
    const onMessageSent = vi.fn();

    const { registerSDKEvents } = await import(
      "../../packages/sdkwork-openchat-pc-im/src/adapters/sdk-adapter"
    );

    const dispose = registerSDKEvents({
      onMessageReceived,
      onMessageSent,
    });

    const listener = mocks.getMessageListener();
    expect(listener).toBeTypeOf("function");

    listener?.({
      messageId: "msg-1",
      channelId: "conv-1",
      senderId: "user-2",
      conversation: {
        type: "SINGLE",
        targetId: "user-2",
      },
      message: {
        type: "TEXT",
        text: {
          text: "hello from realtime",
        },
      },
      timestamp: Date.parse("2026-03-30T10:00:00.000Z"),
      raw: {},
    });

    listener?.({
      messageId: "msg-2",
      channelId: "conv-1",
      senderId: "user-1",
      conversation: {
        type: "SINGLE",
        targetId: "user-2",
      },
      message: {
        type: "TEXT",
        text: {
          text: "hello from current user",
        },
      },
      timestamp: Date.parse("2026-03-30T10:01:00.000Z"),
      raw: {},
    });

    expect(onMessageReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-2",
        content: {
          type: "text",
          text: "hello from realtime",
        },
      }),
    );
    expect(onMessageSent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "msg-2",
        senderId: "current-user",
        content: {
          type: "text",
          text: "hello from current user",
        },
      }),
    );

    dispose();
  });
});
