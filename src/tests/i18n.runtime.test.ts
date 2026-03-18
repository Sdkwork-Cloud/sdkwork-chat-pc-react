import { afterEach, describe, expect, it, vi } from "vitest";

type RuntimeModule = typeof import("@sdkwork/openchat-pc-i18n");

async function loadRuntime(): Promise<RuntimeModule> {
  vi.resetModules();
  return import("@sdkwork/openchat-pc-i18n");
}

describe("shared i18n runtime", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    localStorage.removeItem("openchat.locale");
    window.history.replaceState({}, "", "/");
    document.documentElement.lang = "";

    const runtime = await loadRuntime();
    await runtime.setAppLanguage(runtime.DEFAULT_LOCALE);
    localStorage.removeItem("openchat.locale");
  });

  it("prefers the request locale from the URL when provided", async () => {
    window.history.replaceState({}, "", "/?lang=en-US");
    document.documentElement.lang = "zh-CN";
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("zh-CN");
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["zh-CN"]);

    const runtime = await loadRuntime();
    expect(runtime.detectAppLanguage()).toBe("en-US");
    await runtime.initializeI18n();

    expect(runtime.getAppLanguage()).toBe("en-US");
    expect(runtime.translate("Login")).toBe("Login");
  });

  it("falls back to the configured default locale when request signals are unavailable", async () => {
    document.documentElement.lang = "";
    localStorage.removeItem("openchat.locale");
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("fr-FR");
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["fr-FR"]);

    const runtime = await loadRuntime();
    expect(runtime.detectAppLanguage()).toBe(runtime.DEFAULT_LOCALE);
  });

  it("switches language and persists the current locale", async () => {
    const runtime = await loadRuntime();
    await runtime.initializeI18n();
    await runtime.setAppLanguage("zh-CN");

    expect(runtime.getAppLanguage()).toBe("zh-CN");
    expect(localStorage.getItem("openchat.locale")).toBe("zh-CN");
    expect(runtime.translate("Login")).not.toBe("Login");
  });

  it("formats date time values using the active locale", async () => {
    const runtime = await loadRuntime();
    await runtime.initializeI18n();
    const english = runtime.formatDateTime(
      "2026-03-08T10:15:00+08:00",
      { dateStyle: "full", timeStyle: "short", timeZone: "UTC" },
      "en-US",
    );
    const chinese = runtime.formatDateTime(
      "2026-03-08T10:15:00+08:00",
      { dateStyle: "full", timeStyle: "short", timeZone: "UTC" },
      "zh-CN",
    );

    expect(english).not.toBe(chinese);
  });
});
