import { loadAuthData } from "@sdkwork/openchat-pc-auth";
import type { Location, NavigateFunction } from "react-router-dom";
import { ROUTES } from "../constants";

export interface RouteGuardContext {
  location: Location;
  navigate: NavigateFunction;
}

export type RouteGuardResult = true | string;

export type RouteGuard = (context: RouteGuardContext) => RouteGuardResult | Promise<RouteGuardResult>;

const GUEST_ROUTE_PATHS: ReadonlySet<string> = new Set([
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
]);

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function hasPersistedAuthSession(): boolean {
  const authData = loadAuthData();
  if (!authData?.user?.id) {
    return false;
  }

  const authToken = (authData.authToken || authData.token || "").trim();
  return authToken.length > 0;
}

function buildLoginRedirect(location: Location): string {
  const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
  return `${ROUTES.LOGIN}?redirect=${encodeURIComponent(redirectTarget)}`;
}

export const authGuard: RouteGuard = ({ location }) => {
  const pathname = normalizePathname(location.pathname);
  const isAuthenticated = hasPersistedAuthSession();

  if (GUEST_ROUTE_PATHS.has(pathname)) {
    return isAuthenticated ? ROUTES.CHAT : true;
  }

  if (!isAuthenticated) {
    return buildLoginRedirect(location);
  }

  return true;
};

export const permissionGuard = (requiredPermission: string): RouteGuard => {
  const normalizedPermission = requiredPermission.trim();

  return ({ location }) => {
    if (!hasPersistedAuthSession()) {
      return buildLoginRedirect(location);
    }

    if (!normalizedPermission) {
      return true;
    }

    try {
      const rawPermissions = localStorage.getItem("openchat_permissions");
      const permissions = rawPermissions ? JSON.parse(rawPermissions) : [];
      if (Array.isArray(permissions)) {
        if (permissions.includes(normalizedPermission) || permissions.includes("*")) {
          return true;
        }
      }
    } catch {
      // Ignore malformed cached permissions and deny access.
    }

    return ROUTES.CHAT;
  };
};

export async function executeGuards(
  guards: RouteGuard[],
  context: RouteGuardContext,
): Promise<RouteGuardResult> {
  for (const guard of guards) {
    const result = await guard(context);
    if (result !== true) {
      return result;
    }
  }

  return true;
}

export default {
  authGuard,
  permissionGuard,
  executeGuards,
};
