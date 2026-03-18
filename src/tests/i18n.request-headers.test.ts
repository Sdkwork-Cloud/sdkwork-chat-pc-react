import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientSpy = vi.fn(() => ({
  setAuthToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

vi.mock("@sdkwork/app-sdk", () => ({
  createClient: createClientSpy,
}));

describe("locale-aware sdk request headers", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    window.history.replaceState({}, "", "/");
    createClientSpy.mockClear();
    vi.resetModules();
  });

  it("rebuilds the kernel sdk client when the active locale changes", async () => {
    const i18nRuntime = await import("@sdkwork/openchat-pc-i18n");
    await i18nRuntime.initializeI18n();
    await i18nRuntime.setAppLanguage("en-US");

    const kernelApiClient = await import("../../packages/sdkwork-openchat-pc-kernel/src/foundation/apiClient");
    kernelApiClient.getAppSdkClientWithSession();

    await i18nRuntime.setAppLanguage("zh-CN");
    kernelApiClient.getAppSdkClientWithSession();

    expect(createClientSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Accept-Language": "en-US",
        }),
      }),
    );
    expect(createClientSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Accept-Language": "zh-CN",
        }),
      }),
    );
  });

  it("rebuilds the auth sdk client config when the active locale changes", async () => {
    const i18nRuntime = await import("@sdkwork/openchat-pc-i18n");
    await i18nRuntime.initializeI18n();
    await i18nRuntime.setAppLanguage("en-US");

    const authSdk = await import("../../packages/sdkwork-openchat-pc-auth/src/services/useAppSdkClient");
    authSdk.getAppSdkClientWithSession();

    await i18nRuntime.setAppLanguage("zh-CN");
    authSdk.resetAppSdkClient();
    authSdk.getAppSdkClientWithSession();

    expect(createClientSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Accept-Language": "en-US",
        }),
      }),
    );
    expect(createClientSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Accept-Language": "zh-CN",
        }),
      }),
    );
  });
});
