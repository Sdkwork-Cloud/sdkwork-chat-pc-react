import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const roomsCreateMock = vi.fn();
  const roomsEndMock = vi.fn();
  const prepareCallMock = vi.fn();
  const sendCustomMock = vi.fn();
  const createRTCSDKFactoryMock = vi.fn();

  const rtcSdk = {
    init: vi.fn(async () => undefined),
    joinRoom: vi.fn(async () => "joined-room"),
    leaveRoom: vi.fn(async () => undefined),
    publishStream: vi.fn(async () => undefined),
    unpublishStream: vi.fn(async () => undefined),
    subscribeStream: vi.fn(async () => undefined),
    unsubscribeStream: vi.fn(async () => undefined),
    getLocalStream: vi.fn(async () => ({ id: "local-stream" } as unknown as MediaStream)),
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
    createRTCSDKFactoryMock,
    prepareCallMock,
    roomsCreateMock,
    roomsEndMock,
    rtcSdk,
    sendCustomMock,
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
          create: mocks.roomsCreateMock,
          end: mocks.roomsEndMock,
        },
        connection: {
          prepareCall: mocks.prepareCallMock,
        },
        signaling: {
          sendCustom: mocks.sendCustomMock,
          subscribe: vi.fn(() => () => undefined),
        },
      },
    })),
  };
});

vi.mock("../../packages/sdkwork-openchat-pc-rtc/src/services/sdk-adapter", () => ({
  createRTCSDK: mocks.createRTCSDKFactoryMock.mockImplementation(() => mocks.rtcSdk),
  DEFAULT_RTC_CONFIG: {
    provider: "volcengine",
    appId: "rtc-app",
  },
}));

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("rtc sdk-backed service", () => {
  beforeEach(() => {
    mocks.roomsCreateMock.mockReset();
    mocks.roomsEndMock.mockReset();
    mocks.prepareCallMock.mockReset();
    mocks.sendCustomMock.mockReset();
    mocks.createRTCSDKFactoryMock.mockClear();
    mocks.rtcSdk.init.mockClear();
    mocks.rtcSdk.joinRoom.mockClear();
    mocks.rtcSdk.leaveRoom.mockClear();
    mocks.rtcSdk.publishStream.mockClear();
    mocks.rtcSdk.subscribeStream.mockClear();
    mocks.rtcSdk.getLocalStream.mockClear();
    mocks.rtcSdk.on.mockClear();
    mocks.rtcSdk.destroy.mockClear();
  });

  it("fails outgoing calls when rtc media bootstrap fails and does not send signaling", async () => {
    mocks.roomsCreateMock.mockResolvedValue({
      id: "room-boot-fail",
      type: "p2p",
      participants: ["user-1", "user-2"],
    });
    mocks.prepareCallMock.mockResolvedValue({
      providerConfig: {
        provider: "tencent",
        appId: "tx-app-fail",
        providerRoomId: "provider-room-fail",
        businessRoomId: "biz-room-fail",
        token: "rtc-provider-token-fail",
      },
      signaling: {
        roomId: "room-boot-fail",
      },
      realtime: {
        uid: "user-1",
        token: "wk-token-fail",
        wsUrl: "wss://im.example.com/ws",
      },
    });
    mocks.rtcSdk.joinRoom.mockRejectedValueOnce(new Error("TRTC SDK missing"));

    const { RTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = new RTCService();
    await flushAsyncWork();

    const success = await service.initiateCall("user-2", "Alice", "A", "audio");

    expect(success).toBe(false);
    expect(mocks.sendCustomMock).not.toHaveBeenCalled();
    expect(service.getSession()).toMatchObject({
      status: "failed",
      error: "TRTC SDK missing",
    });
  });

  it("initiates calls through the IM rtc sdk room bootstrap and signaling flow", async () => {
    mocks.roomsCreateMock.mockResolvedValue({
      id: "room-1",
      type: "p2p",
      participants: ["user-1", "user-2"],
    });
    mocks.prepareCallMock.mockResolvedValue({
      providerConfig: {
        provider: "tencent",
        appId: "tx-app-1",
        providerRoomId: "provider-room-1",
        businessRoomId: "biz-room-1",
        token: "rtc-provider-token",
      },
      signaling: {
        roomId: "room-1",
      },
      realtime: {
        uid: "user-1",
        token: "wk-token",
        wsUrl: "wss://im.example.com/ws",
      },
    });

    const { RTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = new RTCService();
    await flushAsyncWork();

    const success = await service.initiateCall("user-2", "Alice", "A", "audio");

    expect(success).toBe(true);
    expect(mocks.roomsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "p2p",
        participants: ["user-1", "user-2"],
      }),
    );
    expect(mocks.prepareCallMock).toHaveBeenCalledWith(
      "room-1",
      expect.objectContaining({
        channelId: "user-2",
      }),
    );
    expect(mocks.createRTCSDKFactoryMock.mock.calls.at(-1)?.[0]).toMatchObject({
      provider: "tencentcloud",
      appId: "tx-app-1",
      token: "rtc-provider-token",
    });
    expect(mocks.sendCustomMock).toHaveBeenCalledWith(
      "rtc.call",
      expect.objectContaining({
        roomId: "biz-room-1",
        toUserId: "user-2",
      }),
    );
    expect(mocks.rtcSdk.joinRoom).toHaveBeenCalledWith(
      "provider-room-1",
      "user-1",
      "rtc-provider-token",
      "audio",
    );
  });

  it("falls back to the default volcengine provider when prepareCall omits provider metadata", async () => {
    mocks.roomsCreateMock.mockResolvedValue({
      id: "room-volc-default",
      type: "p2p",
      participants: ["user-1", "user-2"],
    });
    mocks.prepareCallMock.mockResolvedValue({
      providerConfig: {
        appId: "volc-app-1",
        providerRoomId: "volc-provider-room-1",
        businessRoomId: "biz-volc-room-1",
        token: "volc-token-1",
      },
      signaling: {
        roomId: "room-volc-default",
      },
      realtime: {
        uid: "user-1",
        token: "wk-token-volc",
        wsUrl: "wss://im.example.com/ws",
      },
    });

    const { RTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = new RTCService();
    await flushAsyncWork();

    const success = await service.initiateCall("user-2", "Alice", "A", "audio");

    expect(success).toBe(true);
    expect(mocks.createRTCSDKFactoryMock.mock.calls.at(-1)?.[0]).toMatchObject({
      provider: "volcengine",
      appId: "volc-app-1",
      token: "volc-token-1",
    });
    expect(mocks.rtcSdk.joinRoom).toHaveBeenCalledWith(
      "volc-provider-room-1",
      "user-1",
      "volc-token-1",
      "audio",
    );
  });

  it("cleans up rtc resources with the provider media room when media bootstrap fails after joining", async () => {
    mocks.roomsCreateMock.mockResolvedValue({
      id: "room-cleanup-1",
      type: "p2p",
      participants: ["user-1", "user-2"],
    });
    mocks.prepareCallMock.mockResolvedValue({
      providerConfig: {
        provider: "volcengine",
        appId: "rtc-app",
        providerRoomId: "provider-room-cleanup-1",
        businessRoomId: "biz-room-cleanup-1",
        token: "volc-token-cleanup-1",
      },
      signaling: {
        roomId: "room-cleanup-1",
      },
      realtime: {
        uid: "user-1",
        token: "wk-token-cleanup-1",
        wsUrl: "wss://im.example.com/ws",
      },
    });
    mocks.rtcSdk.getLocalStream.mockRejectedValueOnce(new Error("Media denied"));

    const { RTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = new RTCService();
    await flushAsyncWork();

    const success = await service.initiateCall("user-2", "Alice", "A", "video");

    expect(success).toBe(false);
    expect(mocks.sendCustomMock).not.toHaveBeenCalled();
    expect(mocks.rtcSdk.joinRoom).toHaveBeenCalledWith(
      "provider-room-cleanup-1",
      "user-1",
      "volc-token-cleanup-1",
      "video",
    );
    expect(mocks.rtcSdk.leaveRoom).toHaveBeenCalledWith("provider-room-cleanup-1");
    expect(mocks.rtcSdk.destroy).toHaveBeenCalledTimes(1);
    expect(service.getSession()).toMatchObject({
      status: "failed",
      error: "Media denied",
      roomId: "biz-room-cleanup-1",
    });
  });

  it("forwards subscribed remote media streams to the rtc callback", async () => {
    const remoteStream = { id: "remote-stream-1" } as unknown as MediaStream;

    mocks.roomsCreateMock.mockResolvedValue({
      id: "room-remote-1",
      type: "p2p",
      participants: ["user-1", "user-2"],
    });
    mocks.prepareCallMock.mockResolvedValue({
      providerConfig: {
        provider: "tencent",
        appId: "tx-app-remote",
        providerRoomId: "provider-room-remote",
        businessRoomId: "biz-room-remote",
        token: "rtc-provider-token-remote",
      },
      signaling: {
        roomId: "room-remote-1",
      },
      realtime: {
        uid: "user-1",
        token: "wk-token-remote",
        wsUrl: "wss://im.example.com/ws",
      },
    });
    mocks.rtcSdk.subscribeStream.mockResolvedValueOnce(remoteStream);

    const onRemoteStream = vi.fn();
    const { RTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = new RTCService({
      onRemoteStream,
    });
    await flushAsyncWork();

    const success = await service.initiateCall("user-2", "Alice", "A", "video");

    expect(success).toBe(true);
    expect(onRemoteStream).toHaveBeenCalledWith(remoteStream);
  });

  it("hangs up by ending the business room and leaving the provider media room", async () => {
    mocks.roomsCreateMock.mockResolvedValue({
      id: "room-hangup-1",
      type: "p2p",
      participants: ["user-1", "user-2"],
    });
    mocks.prepareCallMock.mockResolvedValue({
      providerConfig: {
        provider: "volcengine",
        appId: "rtc-app",
        providerRoomId: "provider-room-hangup-1",
        businessRoomId: "biz-room-hangup-1",
        token: "volc-token-hangup-1",
      },
      signaling: {
        roomId: "room-hangup-1",
      },
      realtime: {
        uid: "user-1",
        token: "wk-token-hangup-1",
        wsUrl: "wss://im.example.com/ws",
      },
    });

    const { RTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = new RTCService();
    await flushAsyncWork();

    const initiated = await service.initiateCall("user-2", "Alice", "A", "audio");
    const hungUp = await service.hangup();

    expect(initiated).toBe(true);
    expect(hungUp).toBe(true);
    expect(mocks.roomsEndMock).toHaveBeenCalledWith("biz-room-hangup-1");
    expect(mocks.rtcSdk.leaveRoom).toHaveBeenCalledWith("provider-room-hangup-1");
    expect(mocks.rtcSdk.leaveRoom).not.toHaveBeenCalledWith("biz-room-hangup-1");
    expect(mocks.rtcSdk.destroy).toHaveBeenCalledTimes(1);
  });

  it("marks outgoing calls as connected when the remote side accepts", async () => {
    mocks.roomsCreateMock.mockResolvedValue({
      id: "room-accept-signal-1",
      type: "p2p",
      participants: ["user-1", "user-2"],
    });
    mocks.prepareCallMock.mockResolvedValue({
      providerConfig: {
        provider: "volcengine",
        appId: "rtc-app",
        providerRoomId: "provider-room-accept-signal-1",
        businessRoomId: "biz-room-accept-signal-1",
        token: "volc-token-accept-signal-1",
      },
      signaling: {
        roomId: "room-accept-signal-1",
      },
      realtime: {
        uid: "user-1",
        token: "wk-token-accept-signal-1",
        wsUrl: "wss://im.example.com/ws",
      },
    });

    const { RTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = new RTCService();
    await flushAsyncWork();

    const initiated = await service.initiateCall("user-2", "Alice", "A", "audio");
    const sessionBeforeAccept = service.getSession();

    expect(initiated).toBe(true);
    expect(sessionBeforeAccept).toMatchObject({
      status: "ringing",
      roomId: "biz-room-accept-signal-1",
    });

    await service.handleSignal({
      type: "accept",
      callId: sessionBeforeAccept?.id || "call-1",
      from: "user-2",
      to: "user-1",
      timestamp: "2026-03-30T00:00:00.000Z",
    });

    expect(service.getSession()).toMatchObject({
      status: "connected",
    });
    expect(service.getSession()?.connectTime).toBeTruthy();
  });

  it("accepts calls through the IM rtc sdk connection bootstrap and signaling flow", async () => {
    mocks.prepareCallMock.mockResolvedValue({
      providerConfig: {
        provider: "tencent",
        appId: "tx-app-2",
        providerRoomId: "provider-room-2",
        businessRoomId: "biz-room-2",
        token: "rtc-provider-token-2",
      },
      signaling: {
        roomId: "room-2",
      },
      realtime: {
        uid: "user-1",
        token: "wk-token-2",
        wsUrl: "wss://im.example.com/ws",
      },
    });

    const { RTCService } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/services/rtc.service"
    );

    const service = new RTCService();
    await flushAsyncWork();
    service.handleIncomingCall("call-2", "user-2", "Alice", "A", "room-2", "video");

    const success = await service.acceptCall("call-2", "room-2", "video");

    expect(success).toBe(true);
    expect(mocks.prepareCallMock).toHaveBeenCalledWith(
      "room-2",
      expect.objectContaining({
        channelId: "user-2",
      }),
    );
    expect(mocks.createRTCSDKFactoryMock.mock.calls.at(-1)?.[0]).toMatchObject({
      provider: "tencentcloud",
      appId: "tx-app-2",
      token: "rtc-provider-token-2",
    });
    expect(mocks.sendCustomMock).toHaveBeenCalledWith(
      "rtc.accept",
      expect.objectContaining({
        roomId: "biz-room-2",
        toUserId: "user-2",
      }),
    );
    expect(mocks.rtcSdk.joinRoom).toHaveBeenCalledWith(
      "provider-room-2",
      "user-1",
      "rtc-provider-token-2",
      "video",
    );
    expect(service.getSession()).toMatchObject({
      status: "connected",
      roomId: "room-2",
    });
    expect(service.getSession()?.connectTime).toBeTruthy();
  });
});
