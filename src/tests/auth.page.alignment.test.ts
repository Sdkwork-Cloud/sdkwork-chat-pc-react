import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("auth page alignment", () => {
  it("keeps auth flows on the claw-style single AuthPage implementation", () => {
    const authPageSource = readSource("packages/sdkwork-openchat-pc-auth/src/pages/AuthPage.tsx");

    expect(authPageSource).toContain("QRCode.toDataURL");
    expect(authPageSource).toContain("qrImageSrc");

    const legacyPages = [
      "packages/sdkwork-openchat-pc-auth/src/pages/LoginPage.tsx",
      "packages/sdkwork-openchat-pc-auth/src/pages/RegisterPage.tsx",
      "packages/sdkwork-openchat-pc-auth/src/pages/ForgotPasswordPage.tsx",
    ];

    expect(
      legacyPages.filter((relativePath) => existsSync(path.join(REPO_ROOT, relativePath))),
    ).toEqual([]);
  });

  it("declares the same QR rendering dependency pattern as claw auth", () => {
    const packageJsonSource = readSource("packages/sdkwork-openchat-pc-auth/package.json");

    expect(packageJsonSource).toContain('"qrcode"');
    expect(packageJsonSource).toContain('"@types/qrcode"');
  });
});
