import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StateStorage } from "zustand/middleware";
import type { AppAuthSession } from "../../packages/sdkwork-openchat-pc-auth/src/services/appAuthService";
import { createAuthStore } from "../../packages/sdkwork-openchat-pc-auth/src/stores/useAuthStore";

const {
  loginMock,
  registerMock,
  logoutMock,
  requestPasswordResetMock,
  readSessionTokensMock,
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
  logoutMock: vi.fn(),
  requestPasswordResetMock: vi.fn(),
  readSessionTokensMock: vi.fn(() => ({})),
}));

vi.mock("../../packages/sdkwork-openchat-pc-auth/src/services/appAuthService", () => ({
  appAuthService: {
    login: loginMock,
    register: registerMock,
    logout: logoutMock,
    requestPasswordReset: requestPasswordResetMock,
  },
}));

vi.mock("../../packages/sdkwork-openchat-pc-auth/src/services/useAppSdkClient", () => ({
  readAppSdkSessionTokens: readSessionTokensMock,
}));

function createMemoryStorage(): StateStorage {
  const store = new Map<string, string>();

  return {
    getItem(name) {
      return store.get(name) ?? null;
    },
    setItem(name, value) {
      store.set(name, value);
    },
    removeItem(name) {
      store.delete(name);
    },
  };
}

function createSession(overrides: Partial<AppAuthSession> = {}): AppAuthSession {
  return {
    authToken: "auth-token",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    userInfo: {
      username: "night-operator@example.com",
      email: "night-operator@example.com",
      nickname: "Night Operator",
      avatar: "https://cdn.example.com/night-operator.png",
    },
    ...overrides,
  };
}

describe("auth store contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readSessionTokensMock.mockReturnValue({});
  });

  it("signs in and persists the returned identity", async () => {
    loginMock.mockResolvedValue(createSession());
    const storage = createMemoryStorage();
    const store = createAuthStore(storage);

    const user = await store.getState().signIn({
      email: "night-operator@example.com",
      password: "secret",
    });

    expect(loginMock).toHaveBeenCalledWith({
      username: "night-operator@example.com",
      password: "secret",
    });
    expect(store.getState().isAuthenticated).toBe(true);
    expect(user.email).toBe("night-operator@example.com");
    expect(user.displayName).toBe("Night Operator");
    expect(user.initials).toBe("NO");
    expect(storage.getItem("openchat-pc-auth-storage")).toContain("Night Operator");
  });

  it("registers and signs out cleanly", async () => {
    registerMock.mockResolvedValue(
      createSession({
        userInfo: {
          username: "new-user@example.com",
          email: "new-user@example.com",
          nickname: "New User",
        },
      }),
    );
    logoutMock.mockResolvedValue(undefined);

    const storage = createMemoryStorage();
    const store = createAuthStore(storage);

    await store.getState().register({
      name: "New User",
      email: "new-user@example.com",
      password: "secret",
    });

    expect(store.getState().isAuthenticated).toBe(true);
    expect(store.getState().user?.displayName).toBe("New User");

    await store.getState().signOut();

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().user).toBeNull();
  });

  it("delegates password reset requests", async () => {
    requestPasswordResetMock.mockResolvedValue(undefined);
    const store = createAuthStore(createMemoryStorage());

    await store.getState().sendPasswordReset(" night-operator@example.com ");

    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      account: "night-operator@example.com",
      channel: "EMAIL",
    });
  });

  it("applies confirmed sessions into auth state", () => {
    const store = createAuthStore(createMemoryStorage());

    const user = store.getState().applySession(
      createSession({
        userInfo: {
          username: "wechat-user",
          email: "wechat-user@example.com",
          nickname: "WeChat User",
        },
      }),
    );

    expect(store.getState().isAuthenticated).toBe(true);
    expect(user.email).toBe("wechat-user@example.com");
    expect(user.initials).toBe("WU");
  });

  it("clears stale persisted auth state when app sdk token is unavailable", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "openchat-pc-auth-storage",
      JSON.stringify({
        state: {
          isAuthenticated: true,
          user: {
            firstName: "Night",
            lastName: "Operator",
            email: "night-operator@example.com",
            displayName: "Night Operator",
            initials: "NO",
          },
        },
        version: 0,
      }),
    );

    const store = createAuthStore(storage);

    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().user).toBeNull();
  });
});
