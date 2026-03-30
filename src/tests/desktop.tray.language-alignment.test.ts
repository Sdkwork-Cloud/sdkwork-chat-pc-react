import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function readSource(relativePath: string) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("desktop tray language alignment", () => {
  it("syncs the host tray language through a native command instead of web-only storage", () => {
    const mainSource = readSource("src-tauri/src/main.rs");
    const desktopModuleSource = readSource("src-tauri/src/desktop/mod.rs");
    const traySource = readSource("src-tauri/src/desktop/tray.rs");
    const stateSource = readSource("src-tauri/src/desktop/state.rs");
    const catalogSource = readSource("src/app/desktop/catalog.ts");
    const bridgeSource = readSource("src/app/desktop/tauriBridge.ts");

    expect(mainSource).toContain("commands::set_app_language");
    expect(desktopModuleSource).toContain("state::LanguagePreferenceState");
    expect(traySource).toContain("refresh_tray_menu");
    expect(traySource).toContain("resolve_tray_language");
    expect(traySource).toContain("app.tray_handle()");
    expect(traySource).toContain(".set_menu(");
    expect(stateSource).toContain("LanguagePreferenceState");
    expect(stateSource).toContain("set_language_preference");
    expect(catalogSource).toContain('setAppLanguage: "set_app_language"');
    expect(bridgeSource).toContain("DESKTOP_COMMANDS.setAppLanguage");
    expect(bridgeSource).toContain('operation: "app.setLanguage"');
    expect(bridgeSource).not.toContain(
      'window.localStorage.setItem(DESKTOP_LANGUAGE_STORAGE_KEY, languagePreference);',
    );
  });
});
