import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getOauthUrlMock,
  oauthLoginMock,
  getUserProfileMock,
  initializeSDKMock,
  destroySDKMock,
  isSDKInitializedMock,
  getAppSdkClientWithSessionMock,
  persistAppSdkSessionTokensMock,
  readAppSdkSessionTokensMock,
  resolveAppSdkAccessTokenMock,
  clearAppSdkSessionTokensMock,
} = vi.hoisted(() => ({
  getOauthUrlMock: vi.fn(),
  oauthLoginMock: vi.fn(),
  getUserProfileMock: vi.fn(),
  initializeSDKMock: vi.fn(),
  destroySDKMock: vi.fn(),
  isSDKInitializedMock: vi.fn(() => false),
  getAppSdkClientWithSessionMock: vi.fn(),
  persistAppSdkSessionTokensMock: vi.fn(),
  readAppSdkSessionTokensMock: vi.fn(() => ({})),
  resolveAppSdkAccessTokenMock: vi.fn(() => "app-access-token"),
  clearAppSdkSessionTokensMock: vi.fn(),
}));

vi.mock("@sdkwork/openchat-pc-kernel", () => ({
  isTauriRuntime: vi.fn(() => true),
}));

vi.mock("../../packages/sdkwork-openchat-pc-auth/src/services/sdk-adapter", () => ({
  initializeSDK: initializeSDKMock,
  destroySDK: destroySDKMock,
  isSDKInitialized: isSDKInitializedMock,
}));

vi.mock("../../packages/sdkwork-openchat-pc-auth/src/services/useAppSdkClient", () => ({
  getAppSdkClientWithSession: getAppSdkClientWithSessionMock,
  persistAppSdkSessionTokens: persistAppSdkSessionTokensMock,
  readAppSdkSessionTokens: readAppSdkSessionTokensMock,
  resolveAppSdkAccessToken: resolveAppSdkAccessTokenMock,
  clearAppSdkSessionTokens: clearAppSdkSessionTokensMock,
}));

import {
  appAuthService,
  resolveOAuthRedirectUri,
} from "../../packages/sdkwork-openchat-pc-auth/src/services/appAuthService";

describe("auth service oauth defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    getAppSdkClientWithSessionMock.mockReturnValue({
      auth: {
        getOauthUrl: getOauthUrlMock,
        oauthLogin: oauthLoginMock,
      },
      user: {
        getUserProfile: getUserProfileMock,
      },
    });

    getOauthUrlMock.mockResolvedValue({
      data: {
        authUrl: `${window.location.origin}/oauth/provider`,
      },
    });

    oauthLoginMock.mockResolvedValue({
      data: {
        authToken: "desktop-auth-token",
        refreshToken: "desktop-refresh-token",
        userInfo: {
          id: "user-1",
          username: "desktop-user",
          email: "desktop-user@example.com",
          nickname: "Desktop User",
        },
      },
    });

    getUserProfileMock.mockResolvedValue({
      data: {
        id: "user-1",
        username: "desktop-user",
        email: "desktop-user@example.com",
        nickname: "Desktop User",
      },
    });
  });

  it("resolves provider-specific desktop oauth callback routes by default", () => {
    expect(resolveOAuthRedirectUri("github")).toBe(
      `${window.location.origin}/login/oauth/callback/github`,
    );
    expect(resolveOAuthRedirectUri("wechat")).toBe(
      `${window.location.origin}/login/oauth/callback/wechat`,
    );
  });

  it("uses the provider-specific callback route when social login omits redirectUri", async () => {
    const popupWindow = {
      closed: false,
      location: {
        href: `${window.location.origin}/login/oauth/callback/github?code=oauth-code&state=%2Fchat`,
      },
      close: vi.fn(function close() {
        popupWindow.closed = true;
      }),
    };

    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(popupWindow as unknown as Window);

    vi.useFakeTimers();

    const loginPromise = appAuthService.loginWithSocial({
      provider: "github",
    });

    await vi.advanceTimersByTimeAsync(450);
    await loginPromise;

    expect(getOauthUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "GITHUB",
        redirectUri: `${window.location.origin}/login/oauth/callback/github`,
      }),
    );
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(oauthLoginMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "GITHUB",
        code: "oauth-code",
      }),
    );

    vi.useRealTimers();
    windowOpenSpy.mockRestore();
  });
});
