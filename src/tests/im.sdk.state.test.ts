import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getPcImSdkConnectionState = vi.fn(() => "idle");
  const getPcImSessionIdentity = vi.fn(() => null);

  return {
    clearPcImSdkSession: vi.fn(async () => undefined),
    getPcImSdk: vi.fn(() => ({
      realtime: {},
      rtc: {},
      messages: {},
      conversations: {},
      groups: {},
      contacts: {},
      friends: {},
    })),
    getPcImSdkClient: vi.fn(() => ({
      conversations: {
        conversationControllerGetById: vi.fn(),
      },
    })),
    getPcImSdkConnectionState,
    getPcImSessionIdentity,
    initPcImSdk: vi.fn(),
    subscribePcImSdkConnectionState: vi.fn(() => () => undefined),
    syncPcImSdkSession: vi.fn(async () => ({
      userId: "user-1",
      username: "neo",
      displayName: "Neo",
      authToken: "auth-token",
    })),
  };
});

vi.mock("@sdkwork/openchat-pc-kernel", () => mocks);

describe("im sdk adapter state", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.clearPcImSdkSession.mockClear();
    mocks.getPcImSdk.mockClear();
    mocks.getPcImSdkClient.mockClear();
    mocks.getPcImSdkConnectionState.mockReset().mockReturnValue("idle");
    mocks.getPcImSessionIdentity.mockReset().mockReturnValue(null);
    mocks.initPcImSdk.mockClear();
    mocks.subscribePcImSdkConnectionState.mockClear();
    mocks.syncPcImSdkSession.mockClear();
  });

  it("keeps sdk state disconnected until the kernel reports a realtime connection", async () => {
    const { destroySDK, getSDKState, initializeSDK } = await import(
      "../../packages/sdkwork-openchat-pc-im/src/adapters/sdk-adapter"
    );

    destroySDK();
    await initializeSDK({
      apiBaseUrl: "https://api.example.com",
      imWsUrl: "wss://im.example.com/ws",
      uid: "user-1",
      token: "auth-token",
      accessToken: "access-token",
    });

    expect(getSDKState()).toMatchObject({
      initialized: true,
      connecting: false,
      connected: false,
      error: null,
    });
  });
});
