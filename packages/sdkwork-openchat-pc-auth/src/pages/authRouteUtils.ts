import type { AppAuthSocialProvider } from "../services/appAuthService";

export function resolveRedirectTarget(rawTarget: string | null) {
  if (!rawTarget || !rawTarget.startsWith("/")) {
    return "/chat";
  }

  if (
    rawTarget === "/auth" ||
    rawTarget === "/login" ||
    rawTarget === "/register" ||
    rawTarget === "/forgot-password" ||
    rawTarget.startsWith("/login/oauth/callback")
  ) {
    return "/chat";
  }

  return rawTarget;
}

export function buildOAuthCallbackUri(
  provider: AppAuthSocialProvider,
  redirectTarget: string,
): string {
  if (typeof window === "undefined" || !window.location?.origin) {
    throw new Error("OAuth callback URL is unavailable in the current runtime.");
  }

  const callbackUrl = new URL(`/login/oauth/callback/${provider}`, window.location.origin);
  if (redirectTarget !== "/chat") {
    callbackUrl.searchParams.set("redirect", redirectTarget);
  }
  return callbackUrl.toString();
}
