import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const registerSDKEvents = vi.fn(() => unsubscribe);

  return {
    registerSDKEvents,
    unsubscribe,
  };
});

vi.mock("../../packages/sdkwork-openchat-pc-im/src/adapters/sdk-adapter", () => ({
  convertFrontendContentToSDK: vi.fn(),
  deleteMessage: vi.fn(),
  getMessageList: vi.fn(),
  getUnreadCount: vi.fn(),
  markMessageAsRead: vi.fn(),
  markMessagesAsRead: vi.fn(),
  recallMessage: vi.fn(),
  registerSDKEvents: mocks.registerSDKEvents,
  searchMessageList: vi.fn(),
  sendCustomMessage: vi.fn(),
  sendImageMessage: vi.fn(),
  sendTextMessage: vi.fn(),
}));

describe("im sdk message listener registration", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.registerSDKEvents.mockClear();
    mocks.unsubscribe.mockClear();
  });

  it("registers sdk message listeners only once until explicitly destroyed", async () => {
    const {
      destroyMessageEventListeners,
      registerMessageEventListeners,
    } = await import("../../packages/sdkwork-openchat-pc-im/src/services/message.service");

    const firstDisposer = registerMessageEventListeners();
    const secondDisposer = registerMessageEventListeners();

    expect(mocks.registerSDKEvents).toHaveBeenCalledTimes(1);
    expect(secondDisposer).toBe(firstDisposer);

    destroyMessageEventListeners();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);

    registerMessageEventListeners();
    expect(mocks.registerSDKEvents).toHaveBeenCalledTimes(2);
  });
});
