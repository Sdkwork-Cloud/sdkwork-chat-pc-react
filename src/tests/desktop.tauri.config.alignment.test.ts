import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

describe("desktop tauri config alignment", () => {
  it("matches the claw-style hidden bootstrap window and grants only the window permissions the bridge uses", () => {
    const tauriConfig = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "src-tauri/tauri.conf.json"), "utf8"),
    ) as {
      package: {
        productName: string;
        version: string;
      };
      build: {
        beforeBuildCommand: string;
        beforeDevCommand: string;
        devPath: string;
      };
      tauri: {
        bundle: {
          appimage: {
            bundleMediaFramework: boolean;
          };
        };
        allowlist: {
          window: {
            hide?: boolean;
            show?: boolean;
            maximize?: boolean;
            minimize?: boolean;
            unmaximize?: boolean;
            unminimize?: boolean;
            setFocus?: boolean;
            setFullscreen?: boolean;
            startDragging?: boolean;
            close?: boolean;
          };
        };
        windows: Array<{
          label: string;
          visible: boolean;
          decorations: boolean;
          width: number;
          height: number;
        }>;
      };
    };
    const cargoToml = readFileSync(path.join(REPO_ROOT, "src-tauri/Cargo.toml"), "utf8");
    const tauriBridgeSource = readFileSync(
      path.join(REPO_ROOT, "src/app/desktop/tauriBridge.ts"),
      "utf8",
    );

    expect(tauriConfig.package.productName).toBe("OpenChat");
    expect(tauriConfig.package.version).toBe("0.0.1");
    expect(tauriConfig.build.beforeBuildCommand).toBe("node scripts/run-tauri-host.mjs build");
    expect(tauriConfig.build.beforeDevCommand).toBe("node scripts/run-tauri-host.mjs dev");
    expect(tauriConfig.build.devPath).toBe("http://127.0.0.1:5173");

    expect(tauriBridgeSource).toContain("desktopWindow.minimize()");
    expect(tauriBridgeSource).toContain("desktopWindow.maximize()");
    expect(tauriBridgeSource).toContain("desktopWindow.unmaximize()");
    expect(tauriBridgeSource).toContain("desktopWindow.unminimize()");
    expect(tauriBridgeSource).toContain("desktopWindow.show()");
    expect(tauriBridgeSource).toContain("desktopWindow.hide()");
    expect(tauriBridgeSource).toContain("desktopWindow.setFocus()");
    expect(tauriBridgeSource).toContain("desktopWindow.setFullscreen(");

    expect(tauriConfig.tauri.allowlist.window.hide).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.show).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.maximize).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.minimize).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.unmaximize).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.unminimize).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.setFocus).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.setFullscreen).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.startDragging).toBe(true);
    expect(tauriConfig.tauri.allowlist.window.close).not.toBe(true);
    expect(tauriConfig.tauri.bundle.appimage.bundleMediaFramework).toBe(true);

    expect(tauriConfig.tauri.windows[0]).toMatchObject({
      label: "main",
      visible: false,
      decorations: false,
      width: 1440,
      height: 900,
    });

    expect(cargoToml).toContain('"window-show"');
    expect(cargoToml).toContain('"window-hide"');
    expect(cargoToml).toContain('"window-maximize"');
    expect(cargoToml).toContain('"window-minimize"');
    expect(cargoToml).toContain('"window-unmaximize"');
    expect(cargoToml).toContain('"window-unminimize"');
    expect(cargoToml).toContain('"window-set-focus"');
    expect(cargoToml).toContain('"window-set-fullscreen"');
    expect(cargoToml).toContain('"window-start-dragging"');
    expect(cargoToml).not.toContain('"window-close"');
  });
});
