import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(__dirname, "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), "utf8");
}

describe("app providers desktop alignment", () => {
  it("keeps app providers and app composition consistent with the claw shell pattern", () => {
    const appProvidersSource = readSource("app/providers/AppProviders.tsx");
    const appRootSource = readSource("app/AppRoot.tsx");
    const appProviderSource = readSource("app/AppProvider.tsx");
    const appSource = readSource("app/App.tsx");

    expect(existsSync(path.join(APP_ROOT, "app/AppRoot.tsx"))).toBe(true);
    expect(appProvidersSource).toContain("initializeI18n");
    expect(appProvidersSource).toContain("QueryClientProvider");
    expect(appProvidersSource).toContain("new QueryClient");
    expect(appProvidersSource).toContain('themeMode === "system" ? "system"');
    expect(appProvidersSource).toContain('position="bottom-right"');
    expect(appProvidersSource).not.toContain("QueryProvider");

    expect(appRootSource).toContain("AppRouter");
    expect(appRootSource).toContain("useAuthContext");
    expect(appProviderSource).toContain("onLanguagePreferenceChange");
    expect(appSource).toContain("onLanguagePreferenceChange");
    expect(appSource).toContain("AppRoot");
  });
});
