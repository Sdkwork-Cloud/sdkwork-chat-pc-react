import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function readSource(relativePath: string) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("desktop tray runtime contract", () => {
  it("keeps the main window alive in the tray through the modular desktop shell", () => {
    const mainSource = readSource("src-tauri/src/main.rs");
    const desktopModuleSource = readSource("src-tauri/src/desktop/mod.rs");
    const pluginsSource = readSource("src-tauri/src/desktop/plugins.rs");
    const traySource = readSource("src-tauri/src/desktop/tray.rs");
    const windowSource = readSource("src-tauri/src/desktop/window.rs");
    const stateSource = readSource("src-tauri/src/desktop/state.rs");

    expect(mainSource).toContain("mod desktop;");
    expect(mainSource).toContain("desktop::build()");
    expect(mainSource).toContain("commands::set_app_language");
    expect(mainSource).not.toContain("commands::greet");
    expect(mainSource).not.toContain("commands::minimize_window");
    expect(mainSource).not.toContain("commands::maximize_window");
    expect(mainSource).not.toContain("commands::close_window");

    expect(desktopModuleSource).toContain("mod plugins;");
    expect(desktopModuleSource).toContain("plugins::register(tauri::Builder::default())");
    expect(desktopModuleSource).toContain(".manage(state::ShutdownState::default())");
    expect(desktopModuleSource).toContain(".on_window_event(window::handle_window_event)");
    expect(desktopModuleSource).toContain(".on_system_tray_event(tray::handle_system_tray_event)");
    expect(pluginsSource).toContain("tauri_plugin_single_instance::init");
    expect(pluginsSource).toContain("super::tray::show_main_window(app)");

    expect(traySource).toContain("show_main_window");
    expect(traySource).toContain("tray_action_for_menu_id");
    expect(traySource).toContain("build_tray_menu_spec");
    expect(traySource).toContain("request_explicit_quit");
    expect(traySource).toContain('with_tooltip(APP_TRAY_TOOLTIP)');
    expect(traySource).toContain("ok_or(tauri::Error::WebviewNotFound)");
    expect(traySource).toContain('"Open Window"');
    expect(traySource).toContain('"Quit OpenChat"');
    expect(traySource).toContain("app.exit(0)");

    expect(windowSource).toContain("CloseRequested");
    expect(windowSource).toContain("should_prevent_main_window_close");
    expect(windowSource).toContain("prevent_close()");
    expect(windowSource).toContain("window.hide()");

    expect(stateSource).toContain("shutdown_requested");
  });
});
