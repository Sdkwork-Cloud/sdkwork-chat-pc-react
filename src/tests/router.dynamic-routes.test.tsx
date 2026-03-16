import { render, waitFor } from "@testing-library/react";
import { MainLayout } from "@sdkwork/openchat-pc-commons";
import { saveAuthData } from "../../packages/sdkwork-openchat-pc-auth/src/services/appAuthService";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRouter } from "../router";

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

describe("router dynamic route smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    saveAuthData({
      user: {
        id: "u-1",
        uid: "u-1",
        username: "alice",
        email: "alice@example.com",
        phone: "13800000000",
        nickname: "Alice",
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
  });

  it("renders key dynamic pages without route boundary errors", async () => {
    const paths = [
      "/agents/agent-a",
      "/skills/skill-a",
      "/appstore/app-a",
      "/devices/device-a",
      "/tools/configure/tool-a",
      "/chat?contactId=user-a&contactName=Alice",
      "/chat?agentId=agent-b&agentName=Helper",
    ];

    for (const path of paths) {
      const { container, unmount } = render(
        <MemoryRouter
          initialEntries={[path]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <MainLayout>
            <AppRouter />
          </MainLayout>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="route-shell"]')).toBeTruthy();
      });

      expect(container.textContent).not.toContain("Page failed to render");

      unmount();
    }
  });
});
