import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(__dirname, "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), "utf8");
}

describe("desktop bootstrap alignment", () => {
  it("adds claw-style desktop startup scaffolding and richer bridge contracts", () => {
    const expectedFiles = [
      "app/desktop/providers/DesktopProviders.tsx",
      "app/desktop/bootstrap/startupPresentation.ts",
      "app/desktop/bootstrap/DesktopStartupScreen.tsx",
      "app/desktop/bootstrap/DesktopBootstrapApp.tsx",
      "app/desktop/bootstrap/createDesktopApp.tsx",
      "app/desktop/tauriBridge.ts",
    ];

    expect(expectedFiles.filter((relativePath) => !existsSync(path.join(APP_ROOT, relativePath)))).toEqual([]);

    const createDesktopAppSource = readSource("app/desktop/bootstrap/createDesktopApp.tsx");
    expect(createDesktopAppSource).toContain("applyStartupAppearanceHints");
    expect(createDesktopAppSource).toContain("resolveDesktopBootstrapContext");
    expect(createDesktopAppSource).not.toContain("StrictMode");

    const desktopBootstrapSource = readSource("app/desktop/bootstrap/DesktopBootstrapApp.tsx");
    expect(desktopBootstrapSource).toContain("DesktopStartupScreen");
    expect(desktopBootstrapSource).toContain("retrySeed");
    expect(desktopBootstrapSource).toContain("getStartupProgressModel");
    expect(desktopBootstrapSource).toContain("onLanguagePreferenceChange");
    expect(desktopBootstrapSource).toContain("setFullscreen(false)");
    expect(desktopBootstrapSource).toContain("isMaximized()");
    expect(desktopBootstrapSource).toContain("unmaximize()");
    expect(desktopBootstrapSource).toContain("attempts < 6");
    expect(desktopBootstrapSource).toContain("--text-on-accent");
    expect(desktopBootstrapSource).toContain("--shell-danger-border-hover");

    const startupScreenSource = readSource("app/desktop/bootstrap/DesktopStartupScreen.tsx");
    expect(startupScreenSource).toContain("--text-on-accent");
    expect(startupScreenSource).toContain("--shell-danger-border-hover");

    const tauriBridgeSource = readSource("app/desktop/tauriBridge.ts");
    expect(tauriBridgeSource).toContain("restoreWindow");
    expect(tauriBridgeSource).toContain("closeWindow");
    expect(tauriBridgeSource).toContain("subscribeWindowMaximized");
  });
});
