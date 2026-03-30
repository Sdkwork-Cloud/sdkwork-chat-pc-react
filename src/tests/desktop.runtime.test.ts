import { afterEach, describe, expect, it, vi } from "vitest";
import { isTauriRuntime, waitForTauriRuntime } from "../app/desktop/runtime";

describe("desktop runtime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false instead of throwing when window is unavailable", async () => {
    vi.stubGlobal("window", undefined);

    await expect(waitForTauriRuntime()).resolves.toBe(false);
  });

  it("treats injected tauri internals as a desktop runtime signal", async () => {
    vi.stubGlobal("window", {
      __TAURI_INTERNALS__: {},
    });

    expect(isTauriRuntime()).toBe(true);
    await expect(waitForTauriRuntime()).resolves.toBe(true);
  });
});
