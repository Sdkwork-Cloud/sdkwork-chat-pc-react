import { beforeEach, describe, expect, it, vi } from "vitest";

const setAuthTokenSpy = vi.fn();
const setAccessTokenSpy = vi.fn();

vi.mock("@sdkwork/app-sdk", () => {
  return {
    createClient: vi.fn(() => ({
      setAuthToken: setAuthTokenSpy,
      setAccessToken: setAccessTokenSpy,
    })),
  };
});

import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";

describe("Kernel SDK auth header restore", () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthTokenSpy.mockReset();
    setAccessTokenSpy.mockReset();
  });

  it("prefers sdkwork auth token over legacy openchat_auth_data token", async () => {
    localStorage.setItem(
      "openchat_auth_data",
      JSON.stringify({
        token: "legacy_im_token_should_not_be_used",
        imToken: "legacy_im_token_should_not_be_used",
        imConfig: {
          token: "legacy_im_token_should_not_be_used",
        },
      }),
    );
    localStorage.setItem("sdkwork_token", "auth_token_from_latest_login");

    getAppSdkClientWithSession();

    expect(setAuthTokenSpy).toHaveBeenCalledWith("auth_token_from_latest_login");
  });
});
