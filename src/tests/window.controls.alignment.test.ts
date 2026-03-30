import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("window controls alignment", () => {
  it("uses the claw-style desktop window control structure instead of the legacy macos/windows split", () => {
    const source = readSource(
      "packages/sdkwork-openchat-pc-commons/src/shell/WindowControls.tsx",
    );

    expect(source).toContain("lucide-react");
    expect(source).toContain("useDesktopWindowMaximized");
    expect(source).toContain("WindowSizeGlyph");
    expect(source).toContain('variant === "header"');
    expect(source).toContain("hover:bg-rose-500 hover:text-white");
    expect(source).toContain("controller?: WindowControlsController | null");
    expect(source).toContain("controller.restoreWindow()");
    expect(source).toContain("controller.subscribeWindowMaximized");
    expect(source).toContain('title={tr("Close")}');
    expect(source).toContain('aria-label={tr("Close")}');

    expect(source).not.toContain('style?: "macos" | "windows"');
    expect(source).not.toContain("MacOSControls");
    expect(source).not.toContain("WindowsControls");
    expect(source).not.toContain('@tauri-apps/api/window');
    expect(source).not.toContain('title={tr("Hide to tray")}');
  });
});
