import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(__dirname, "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), "utf8");
}

describe("desktop bridge architecture alignment", () => {
  it("centralizes runtime detection and window behavior behind a claw-style desktop bridge", () => {
    expect(existsSync(path.join(APP_ROOT, "app/desktop/runtime.ts"))).toBe(true);
    expect(existsSync(path.join(APP_ROOT, "app/desktop/catalog.ts"))).toBe(true);

    const tauriBridgeSource = readSource("app/desktop/tauriBridge.ts");
    const desktopRuntimeSource = readSource("app/desktop/runtime.ts");
    const desktopCatalogSource = readSource("app/desktop/catalog.ts");
    const desktopPlatformSource = readSource("platform-impl/desktop/index.ts");
    const platformSource = readSource("platform/index.ts");
    const appAuthServiceSource = readSource("../packages/sdkwork-openchat-pc-auth/src/services/appAuthService.ts");
    const authCallbackSource = readSource("../packages/sdkwork-openchat-pc-auth/src/pages/AuthOAuthCallbackPage.tsx");
    const terminalServiceSource = readSource("../packages/sdkwork-openchat-pc-terminal/src/services/terminal.service.ts");
    const mainSource = readSource("main.tsx");

    expect(desktopRuntimeSource).toContain("DesktopBridgeError");
    expect(desktopRuntimeSource).toContain("waitForTauriRuntime");
    expect(desktopRuntimeSource).toContain("runDesktopOrFallback");

    expect(desktopCatalogSource).toContain("createPty");
    expect(desktopCatalogSource).toContain("trayNavigate");

    expect(tauriBridgeSource).toContain('from "./runtime"');
    expect(tauriBridgeSource).toContain("runDesktopOrFallback");
    expect(tauriBridgeSource).toContain("getDesktopWindow");
    expect(tauriBridgeSource).toContain("desktopTemplateApi");
    expect(tauriBridgeSource).toContain("getDesktopWindow,");
    expect(tauriBridgeSource).toContain("copyText");
    expect(tauriBridgeSource).toContain("readClipboardText");
    expect(tauriBridgeSource).toContain("openExternalUrl");
    expect(tauriBridgeSource).toContain("showDesktopNotification");
    expect(tauriBridgeSource).toContain("selectDesktopFiles");
    expect(tauriBridgeSource).toContain("saveDesktopFile");
    expect(tauriBridgeSource).toContain("readDesktopTextFile");
    expect(tauriBridgeSource).toContain("writeDesktopTextFile");
    expect(tauriBridgeSource).toContain("setDesktopFullscreen");

    expect(desktopPlatformSource).toContain('from "../../app/desktop/tauriBridge"');
    expect(desktopPlatformSource).toContain("copyText");
    expect(desktopPlatformSource).toContain("readClipboardText");
    expect(desktopPlatformSource).toContain("openExternalUrl");
    expect(desktopPlatformSource).toContain("showDesktopNotification");
    expect(desktopPlatformSource).toContain("selectDesktopFiles");
    expect(desktopPlatformSource).toContain("saveDesktopFile");
    expect(desktopPlatformSource).toContain("readDesktopTextFile");
    expect(desktopPlatformSource).toContain("writeDesktopTextFile");
    expect(desktopPlatformSource).toContain("setDesktopFullscreen");
    expect(desktopPlatformSource).toContain("restoreWindow");
    expect(desktopPlatformSource).toContain("isWindowMaximized");
    expect(desktopPlatformSource).not.toContain('from "../../app/desktop/runtime"');
    expect(desktopPlatformSource).not.toContain("DESKTOP_COMMANDS");
    expect(desktopPlatformSource).not.toContain("invokeDesktopCommand");
    expect(desktopPlatformSource).not.toContain('@tauri-apps/api/clipboard');
    expect(desktopPlatformSource).not.toContain('@tauri-apps/api/shell');
    expect(desktopPlatformSource).not.toContain('@tauri-apps/api/notification');
    expect(desktopPlatformSource).not.toContain('@tauri-apps/api/dialog');
    expect(desktopPlatformSource).not.toContain('@tauri-apps/api/fs');
    expect(desktopPlatformSource).not.toContain('@tauri-apps/api/window');
    expect(desktopPlatformSource).not.toContain('invoke("create_pty"');

    expect(platformSource).toContain("restoreWindow(): Promise<void>");
    expect(platformSource).toContain("isWindowMaximized(): Promise<boolean>");
    expect(platformSource).toContain("subscribeWindowMaximized");

    expect(appAuthServiceSource).not.toContain("__TAURI__");
    expect(authCallbackSource).not.toContain("__TAURI__");
    expect(terminalServiceSource).not.toContain("__TAURI__");

    expect(mainSource).toContain('from "./app/desktop/runtime"');
    expect(mainSource).not.toContain("function isTauriRuntime()");
  });
});
