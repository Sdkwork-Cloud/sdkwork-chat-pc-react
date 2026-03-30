import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveAuthData } from "../../packages/sdkwork-openchat-pc-auth/src/services/appAuthService";
import { AppRouter } from "../router";
import { ROUTES } from "../router/constants";
import { authGuard, executeGuards, permissionGuard } from "../router/guards";

vi.mock("@sdkwork/openchat-pc-rtc", async () => {
  const actual = await vi.importActual<typeof import("@sdkwork/openchat-pc-rtc")>(
    "@sdkwork/openchat-pc-rtc",
  );

  return {
    ...actual,
    useRTC: () => ({
      session: null,
      localStream: null,
      remoteStream: null,
      isInCall: false,
      isCalling: false,
      isRinging: false,
      isConnected: false,
      initiateCall: async () => false,
      acceptCall: async () => false,
      rejectCall: async () => false,
      hangup: async () => false,
      toggleMute: async () => undefined,
      toggleCamera: async () => undefined,
      toggleSpeaker: async () => undefined,
      handleIncomingCall: () => undefined,
      handleSignal: async () => undefined,
    }),
  };
});

function persistAuthSession() {
  saveAuthData({
    user: {
      id: "u-1",
      uid: "u-1",
      username: "alice",
      email: "alice@example.com",
      phone: "13800000000",
      nickname: "Alice",
      status: "online",
    },
    token: "auth-token",
    authToken: "auth-token",
    accessToken: "access-token",
    imToken: "im-token",
    refreshToken: "refresh-token",
    imConfig: {
      wsUrl: "ws://localhost:5200",
      uid: "u-1",
      token: "im-token",
    },
    timestamp: Date.now(),
  });
}

describe("router auth hardening", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects unauthenticated private routes to login", async () => {
    const { container } = render(
      <MemoryRouter
        initialEntries={[ROUTES.CHAT]}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRouter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Login");
    });
  });

  it("redirects authenticated guest routes back to chat", async () => {
    persistAuthSession();

    const { container } = render(
      <MemoryRouter
        initialEntries={[ROUTES.LOGIN]}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRouter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="route-shell"]')).toBeTruthy();
    });

    expect(container.textContent).not.toContain("Login");
  });

  it("returns redirect decisions from route guard chain", async () => {
    const unauthenticatedResult = await authGuard({
      location: {
        pathname: ROUTES.SETTINGS,
        search: "",
        hash: "",
        state: null,
        key: "test",
      },
      navigate: vi.fn(),
    });

    expect(unauthenticatedResult).toBe(`${ROUTES.LOGIN}?redirect=%2Fsettings`);

    persistAuthSession();

    const authenticatedGuestResult = await authGuard({
      location: {
        pathname: ROUTES.LOGIN,
        search: "",
        hash: "",
        state: null,
        key: "login",
      },
      navigate: vi.fn(),
    });

    expect(authenticatedGuestResult).toBe(ROUTES.CHAT);

    localStorage.setItem("openchat_permissions", JSON.stringify(["settings:read"]));
    const permissionResult = await executeGuards(
      [permissionGuard("settings:write")],
      {
        location: {
          pathname: ROUTES.SETTINGS,
          search: "",
          hash: "",
          state: null,
          key: "permission",
        },
        navigate: vi.fn(),
      },
    );

    expect(permissionResult).toBe(ROUTES.CHAT);
  });
});
