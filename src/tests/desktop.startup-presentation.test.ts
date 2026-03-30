import { describe, expect, it } from "vitest";
import {
  getStartupMinimumWaitMs,
  getStartupProgressModel,
  readStartupAppearanceSnapshot,
  resolveStartupBootstrapStage,
} from "../app/desktop/bootstrap/startupPresentation";

describe("desktop startup presentation", () => {
  it("reads persisted openchat appearance from the app store snapshot", () => {
    const appearance = readStartupAppearanceSnapshot({
      storageValue: JSON.stringify({
        state: {
          language: "zh-CN",
          themeColor: "rose",
          themeMode: "dark",
        },
      }),
      browserLanguage: "en-US",
      prefersDark: false,
    });

    expect(appearance).toEqual({
      language: "zh",
      themeColor: "rose",
      themeMode: "dark",
      isDark: true,
    });
  });

  it("falls back to browser settings when persisted state is unavailable", () => {
    const appearance = readStartupAppearanceSnapshot({
      storageValue: "{",
      browserLanguage: "en-US",
      prefersDark: true,
    });

    expect(appearance).toEqual({
      language: "en",
      themeColor: "lobster",
      themeMode: "system",
      isDark: true,
    });
  });

  it("derives staged startup progress like the claw desktop bootstrap", () => {
    expect(
      resolveStartupBootstrapStage({
        hasWindowPresented: true,
        hasRuntimeConnected: true,
        hasShellBootstrapped: false,
        hasShellMounted: false,
      }),
    ).toBe("loading-workspace");

    const progress = getStartupProgressModel({
      milestones: {
        hasWindowPresented: true,
        hasRuntimeConnected: true,
        hasShellBootstrapped: true,
        hasShellMounted: false,
      },
      language: "en",
      appName: "OpenChat Desktop",
    });

    expect(progress).toMatchObject({
      phase: "mounting-shell",
      statusLabel: "Opening workspace",
    });
    expect(progress.progress).toBeGreaterThan(80);

    expect(
      getStartupMinimumWaitMs({
        currentTimeMs: 420,
        startedAtMs: 300,
        minimumVisibleMs: 220,
      }),
    ).toBe(100);
  });
});
