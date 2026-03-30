import { describe, expect, it } from "vitest";
import { sidebarNavItems } from "@sdkwork/openchat-pc-commons";
import { ROUTES } from "../router/constants";

function normalizeRoutePattern(route: string): string {
  return route.replace(/\/:[^/]+/g, "");
}

function hasRouteMatch(path: string): boolean {
  return (Object.values(ROUTES) as string[]).some((routePattern) => {
    const normalized = normalizeRoutePattern(routePattern);
    if (!normalized || normalized === "/") {
      return false;
    }
    return path === normalized || path.startsWith(`${normalized}/`);
  });
}

describe("sidebar navigation contract", () => {
  it("keeps unique sidebar ids and paths", () => {
    const ids = sidebarNavItems.map((item) => item.id);
    const paths = sidebarNavItems.map((item) => item.path);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("ensures each sidebar icon path maps to a router route", () => {
    const unmatchedPaths = sidebarNavItems
      .map((item) => item.path)
      .filter((path) => !hasRouteMatch(path));

    expect(unmatchedPaths).toEqual([]);
  });

  it("keeps contacts directly under chat in the default sidebar stack", () => {
    const ids = sidebarNavItems.map((item) => item.id);
    const chatIndex = ids.indexOf("chat");
    const contactsIndex = ids.indexOf("contacts");
    const agentsIndex = ids.indexOf("agents");

    expect(chatIndex).toBeGreaterThanOrEqual(0);
    expect(contactsIndex).toBe(chatIndex + 1);
    expect(contactsIndex).toBeLessThan(agentsIndex);
  });
});
