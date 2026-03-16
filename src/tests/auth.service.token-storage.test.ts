import { beforeEach, describe, expect, it } from "vitest";
import type { StoredAuthData } from "../../packages/sdkwork-openchat-pc-auth/src/entities/auth.entity";
import { loadAuthData, saveAuthData } from "../../packages/sdkwork-openchat-pc-auth/src/services/appAuthService";

describe("Auth service token persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores auth token and keeps access token independent", () => {
    const authToken = "auth_test_token";
    const imToken = "im_test_token";
    const payload: StoredAuthData = {
      user: {
        id: "u-1",
        uid: "u-1",
        username: "testuser",
        email: "test@example.com",
        phone: "13800000000",
        nickname: "testuser",
      },
      token: authToken,
      authToken,
      accessToken: "legacy_access_token_should_not_win",
      imToken,
      refreshToken: "refresh_test_token",
      imConfig: {
        wsUrl: "ws://localhost:5200",
        uid: "u-1",
        token: imToken,
      },
      timestamp: Date.now(),
    };

    saveAuthData(payload);
    const stored = loadAuthData();
    expect(stored?.token).toBe(authToken);
    expect(stored?.authToken).toBe(authToken);
    expect(localStorage.getItem("sdkwork_token")).toBe(authToken);
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("token")).toBe(imToken);
    expect(localStorage.getItem("sdkwork_access_token")).not.toBe(authToken);
    expect(localStorage.getItem("access_token")).not.toBe(authToken);
  });
});
