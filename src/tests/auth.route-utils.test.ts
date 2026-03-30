import { describe, expect, it } from "vitest";
import { buildOAuthCallbackUri, resolveRedirectTarget } from "../../packages/sdkwork-openchat-pc-auth/src/pages/authRouteUtils";

describe("auth route utils", () => {
  it("sanitizes guest and oauth callback redirects back to chat", () => {
    expect(resolveRedirectTarget(null)).toBe("/chat");
    expect(resolveRedirectTarget("https://example.com/outside")).toBe("/chat");
    expect(resolveRedirectTarget("/login")).toBe("/chat");
    expect(resolveRedirectTarget("/register")).toBe("/chat");
    expect(resolveRedirectTarget("/forgot-password")).toBe("/chat");
    expect(resolveRedirectTarget("/login/oauth/callback/github")).toBe("/chat");
    expect(resolveRedirectTarget("/settings")).toBe("/settings");
  });

  it("builds provider-specific oauth callback urls with optional redirect state", () => {
    expect(buildOAuthCallbackUri("github", "/chat")).toBe(
      `${window.location.origin}/login/oauth/callback/github`,
    );
    expect(buildOAuthCallbackUri("wechat", "/settings")).toBe(
      `${window.location.origin}/login/oauth/callback/wechat?redirect=%2Fsettings`,
    );
  });
});
