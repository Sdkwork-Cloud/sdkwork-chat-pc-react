import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const backendClient = {
    setAuthToken: vi.fn(),
    setAccessToken: vi.fn(),
    http: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
    },
  };

  const sessionSetAccessTokenMock = vi.fn();
  const sessionSetAuthTokenMock = vi.fn();
  const connectRealtimeMock = vi.fn(async (session?: Record<string, unknown>) => ({
    uid: "user-1",
    token: (session?.token as string | undefined) || "realtime-token",
    wsUrl: (session?.wsUrl as string | undefined) || "wss://im.example.com/ws",
  }));
  const disconnectRealtimeMock = vi.fn(async () => undefined);
  const sdkInstances: Array<Record<string, unknown>> = [];
  const adapterInstances: Array<Record<string, unknown>> = [];

  const MockOpenChatImSdk = class {
    public readonly options: Record<string, unknown>;
    public readonly session = {
      setAccessToken: sessionSetAccessTokenMock,
      setAuthToken: sessionSetAuthTokenMock,
      connectRealtime: connectRealtimeMock,
      disconnectRealtime: disconnectRealtimeMock,
    };
    public readonly realtime = {
      onConnectionStateChange: vi.fn(() => () => undefined),
      isConnected: vi.fn(() => false),
      getSession: vi.fn(() => undefined),
    };

    constructor(options: Record<string, unknown>) {
      this.options = options;
      sdkInstances.push(this as unknown as Record<string, unknown>);
    }
  };

  return {
    adapterInstances,
    adapterConstructorMock: class {
      constructor() {
        const instance = { kind: "adapter" };
        adapterInstances.push(instance);
        return instance;
      }
    },
    backendClient,
    connectRealtimeMock,
    createClientMock: vi.fn(() => backendClient),
    disconnectRealtimeMock,
    MockOpenChatImSdk,
    sdkInstances,
    sessionSetAccessTokenMock,
    sessionSetAuthTokenMock,
  };
});

vi.mock("../../packages/sdkwork-openchat-pc-kernel/src/im-sdk/backend-sdk", () => ({
  createClient: mocks.createClientMock,
}));

vi.mock("../../packages/sdkwork-openchat-pc-kernel/src/im-sdk/composed-sdk", () => ({
  OpenChatImSdk: mocks.MockOpenChatImSdk,
}));

vi.mock("../../packages/sdkwork-openchat-pc-kernel/src/im-sdk/wukongim-adapter", () => ({
  OpenChatWukongimAdapter: mocks.adapterConstructorMock,
}));

const ENV_KEYS = [
  "VITE_API_BASE_URL",
  "VITE_APP_API_BASE_URL",
  "VITE_ACCESS_TOKEN",
  "VITE_IM_WS_URL",
  "VITE_APP_IM_WS_URL",
] as const;

const ORIGINAL_ENV_VALUES = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>): void {
  for (const key of ENV_KEYS) {
    const value = values[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV_VALUES[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("openchat im sdk runtime bridge", () => {
  beforeEach(() => {
    setEnv({});
    mocks.createClientMock.mockClear();
    mocks.backendClient.setAuthToken.mockClear();
    mocks.backendClient.setAccessToken.mockClear();
    mocks.sessionSetAccessTokenMock.mockClear();
    mocks.sessionSetAuthTokenMock.mockClear();
    mocks.connectRealtimeMock.mockClear();
    mocks.disconnectRealtimeMock.mockClear();
    mocks.adapterInstances.length = 0;
    mocks.sdkInstances.length = 0;
  });

  afterAll(() => {
    restoreEnv();
  });

  it("builds the runtime from IM env config and syncs auth plus realtime session into the composed sdk", async () => {
    setEnv({
      VITE_API_BASE_URL: "https://api.example.com/",
      VITE_ACCESS_TOKEN: "runtime-access-token",
    });

    const {
      createPcImSdkRuntimeConfig,
      getPcImSessionIdentity,
      resetPcImSdkRuntime,
      syncPcImSdkSession,
    } = await import("../../packages/sdkwork-openchat-pc-kernel/src/foundation/imSdkRuntime");

    resetPcImSdkRuntime();

    expect(createPcImSdkRuntimeConfig()).toMatchObject({
      baseUrl: "https://api.example.com",
      accessToken: "runtime-access-token",
    });

    await syncPcImSdkSession(
      {
        userId: "user-1",
        username: "neo",
        displayName: "Neo",
        authToken: "Bearer auth-token",
        accessToken: "session-access-token",
      },
      {
        realtimeSession: {
          uid: "user-1",
          token: "wk-token",
          wsUrl: "wss://im.example.com/ws",
          deviceId: "device-1",
        },
      },
    );

    expect(mocks.createClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://api.example.com",
      }),
    );
    expect(mocks.adapterInstances).toHaveLength(1);
    expect(mocks.sessionSetAuthTokenMock).toHaveBeenCalledWith("auth-token");
    expect(mocks.sessionSetAccessTokenMock).toHaveBeenCalledWith("auth-token");
    expect(mocks.backendClient.setAuthToken).toHaveBeenCalledWith("auth-token");
    expect(mocks.backendClient.setAccessToken).toHaveBeenLastCalledWith("session-access-token");
    expect(mocks.connectRealtimeMock).toHaveBeenCalledWith({
      uid: "user-1",
      token: "wk-token",
      wsUrl: "wss://im.example.com/ws",
      deviceId: "device-1",
    });
    expect(getPcImSessionIdentity()).toEqual({
      userId: "user-1",
      username: "neo",
      displayName: "Neo",
      authToken: "auth-token",
      accessToken: "session-access-token",
    });
  });

  it("disconnects realtime and clears the stored bridge state", async () => {
    const {
      clearPcImSdkSession,
      getPcImSessionIdentity,
      resetPcImSdkRuntime,
      syncPcImSdkSession,
    } = await import("../../packages/sdkwork-openchat-pc-kernel/src/foundation/imSdkRuntime");

    resetPcImSdkRuntime();
    await syncPcImSdkSession({
      userId: "user-2",
      username: "trinity",
      displayName: "Trinity",
      authToken: "auth-2",
      accessToken: "access-2",
    });

    await clearPcImSdkSession();

    expect(mocks.disconnectRealtimeMock).toHaveBeenCalledTimes(1);
    expect(getPcImSessionIdentity()).toBeNull();
  });
});
