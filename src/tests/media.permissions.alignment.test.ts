import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMediaAccessError } from "../../packages/sdkwork-openchat-pc-rtc/src/services/media-permissions";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function readSource(relativePath: string) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("desktop media permission alignment", () => {
  it("keeps browser security headers compatible with camera, microphone, and screen capture", () => {
    const indexHtmlSource = readSource("index.html");
    const securityServiceSource = readSource(
      "packages/sdkwork-openchat-pc-commons/src/services/security.service.ts",
    );

    expect(indexHtmlSource).toContain("camera=(self)");
    expect(indexHtmlSource).toContain("microphone=(self)");
    expect(indexHtmlSource).toContain("display-capture=(self)");
    expect(indexHtmlSource).toContain("speaker-selection=(self)");
    expect(securityServiceSource).toContain("camera=(self)");
    expect(securityServiceSource).toContain("microphone=(self)");
    expect(securityServiceSource).toContain("display-capture=(self)");
    expect(securityServiceSource).toContain("speaker-selection=(self)");
  });

  it("declares native macOS media usage descriptions for desktop bundles", () => {
    const infoPlistSource = readSource("src-tauri/Info.plist");
    const tauriConfig = JSON.parse(readSource("src-tauri/tauri.conf.json")) as {
      tauri: {
        bundle: {
          appimage: {
            bundleMediaFramework: boolean;
          };
          macOS: {
            entitlements: string | null;
          };
        };
      };
    };
    const entitlementsSource = readSource("src-tauri/Entitlements.plist");

    expect(infoPlistSource).toContain("NSCameraUsageDescription");
    expect(infoPlistSource).toContain("video calls");
    expect(infoPlistSource).toContain("NSMicrophoneUsageDescription");
    expect(infoPlistSource).toContain("voice messages");
    expect(tauriConfig.tauri.bundle.appimage.bundleMediaFramework).toBe(true);
    expect(tauriConfig.tauri.bundle.macOS.entitlements).toBe("Entitlements.plist");
    expect(entitlementsSource).toContain("com.apple.security.device.audio-input");
    expect(entitlementsSource).toContain("com.apple.security.device.camera");
  });

  it("maps browser media permission failures to user-facing error copy", () => {
    expect(
      resolveMediaAccessError(new DOMException("denied", "NotAllowedError"), {
        audio: true,
        video: true,
      }).message,
    ).toBe("Please allow camera and microphone permissions.");

    expect(
      resolveMediaAccessError(new DOMException("denied", "NotAllowedError"), {
        video: true,
      }).message,
    ).toBe("Unable to access the camera. Check your device permissions.");

    expect(
      resolveMediaAccessError(new DOMException("denied", "AbortError"), {
        displayCapture: true,
      }).message,
    ).toBe("Screen capture was cancelled or denied.");
  });
});
