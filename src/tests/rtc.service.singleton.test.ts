import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rtcSdk = {
    init: vi.fn(async () => undefined),
    joinRoom: vi.fn(async () => "room-id"),
    leaveRoom: vi.fn(async () => undefined),
    publishStream: vi.fn(async () => undefined),
    unpublishStream: vi.fn(async () => undefined),
    subscribeStream: vi.fn(async () => undefined),
    unsubscribeStream: vi.fn(async () => undefined),
    getLocalStream: vi.fn(async () => null),
    stopLocalStream: vi.fn(async () => undefined),
    switchDevice: vi.fn(async () => undefined),
    getDevices: vi.fn(async () => []),
    setLocalStreamEnabled: vi.fn(async () => undefined),
    setRemoteStreamEnabled: vi.fn(async () => undefined),
    sendSignal: vi.fn(async () => undefined),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(async () => undefined),
  };

  return {
    rtcSdk,
  };
});

vi.mock("@sdkwork/openchat-pc-kernel", async () => {
  const actual = await vi.importActual<typeof import("@sdkwork/openchat-pc-kernel")>(
    "@sdkwork/openchat-pc-kernel",
  );

  return {
    ...actual,
    generateUUID: vi.fn(() => "call-1"),
    getPcImSessionIdentity: vi.fn(() => ({
      userId: "user-1",
      username: "neo",
      displayName: "Neo",
      authToken: "auth-token",
      accessToken: "access-token",
    })),
    getPcImSdk: vi.fn(() => ({
      rtc: {
        rooms: {
          create: vi.fn(),
          end: vi.fn(),
        },
        connection: {
          prepareCall: vi.fn(),
        },
        signaling: {
          sendCustom: vi.fn(),
          subscribe: vi.fn(() => () => undefined),
        },
      },
    })),
  };
});

vi.mock("../../packages/sdkwork-openchat-pc-rtc/src/services/sdk-adapter", () => ({
  createRTCSDK: vi.fn(() => mocks.rtcSdk),
  DEFAULT_RTC_CONFIG: {
    provider: "volcengine",
    appId: "rtc-app",
  },
}));

describe("rtc service singleton callbacks", () => {
  beforeEach(async () => {
    vi.resetModules();
    mocks.rtcSdk.init.mockClear();
    mocks.rtcSdk.leaveRoom.mockClear();
    mocks.rtcSdk.on.mockClear();
    mocks.rtcSdk.destroy.mockClear();

    const { destroyRTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );
    destroyRTCService();
  });

  it("rebinds session callbacks when getRTCService is called again with a new consumer", async () => {
    const firstConsumer = vi.fn();
    const secondConsumer = vi.fn();

    const { getRTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const firstInstance = getRTCService({
      onSessionChange: firstConsumer,
    });
    const secondInstance = getRTCService({
      onSessionChange: secondConsumer,
    });

    expect(firstInstance).toBe(secondInstance);

    secondInstance.handleIncomingCall("call-1", "user-2", "Alice", "A", "room-1", "audio");

    expect(secondConsumer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "call-1",
        roomId: "room-1",
      }),
    );
    expect(firstConsumer).not.toHaveBeenCalled();
  });

  it("releases active rtc resources when the singleton is destroyed", async () => {
    const { destroyRTCService, getRTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = getRTCService();
    (service as any).rtcSdk = mocks.rtcSdk;
    (service as any).activeMediaRoomId = "provider-room-destroy";

    destroyRTCService();

    await vi.waitFor(() => {
      expect(mocks.rtcSdk.leaveRoom).toHaveBeenCalledWith("provider-room-destroy");
      expect(mocks.rtcSdk.destroy).toHaveBeenCalled();
    });
  });
});
