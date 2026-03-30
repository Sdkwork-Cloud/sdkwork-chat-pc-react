import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("app shell alignment", () => {
  it("moves app composition to claw-style managers and providers", () => {
    const providerPath = "src/app/providers/AppProviders.tsx";
    const themeManagerPath = "src/app/providers/ThemeManager.tsx";
    const languageManagerPath = "src/app/providers/LanguageManager.tsx";

    expect(existsSync(path.join(APP_ROOT, "app/providers/AppProviders.tsx"))).toBe(true);
    expect(existsSync(path.join(APP_ROOT, "app/providers/ThemeManager.tsx"))).toBe(true);
    expect(existsSync(path.join(APP_ROOT, "app/providers/LanguageManager.tsx"))).toBe(true);

    const providerSource = readSource(providerPath);
    expect(providerSource).toContain("ThemeManager");
    expect(providerSource).toContain("LanguageManager");
    expect(providerSource).toContain("BrowserRouter");

    const themeManagerSource = readSource(themeManagerPath);
    expect(themeManagerSource).toContain("useAppStore");
    expect(themeManagerSource).toContain("root.classList.add('dark')");
    expect(themeManagerSource).toContain('--theme-primary-50');
    expect(themeManagerSource).toContain('--theme-primary-600');
    expect(themeManagerSource).toContain('--theme-primary-950');
    expect(themeManagerSource).toContain('--scrollbar-thumb');
    expect(themeManagerSource).toContain('--scrollbar-track');
    expect(themeManagerSource).toContain('--text-on-accent');
    expect(themeManagerSource).toContain('--shell-sidebar-badge-bg');
    expect(themeManagerSource).toContain('--shell-danger-border-hover');

    const languageManagerSource = readSource(languageManagerPath);
    expect(languageManagerSource).toContain("useAppStore");
    expect(languageManagerSource).toContain("setAppLanguage");
  });

  it("switches tailwind dark mode and desktop bootstrap to claw-style contracts", () => {
    const tailwindSource = readSource("tailwind.config.js");
    expect(tailwindSource).toContain("darkMode: 'class'");

    expect(existsSync(path.join(APP_ROOT, "app/desktop/bootstrap/createDesktopApp.tsx"))).toBe(true);
    expect(existsSync(path.join(APP_ROOT, "app/desktop/bootstrap/DesktopBootstrapApp.tsx"))).toBe(true);
    expect(existsSync(path.join(APP_ROOT, "app/desktop/tauriBridge.ts"))).toBe(true);

    const mainSource = readSource("src/main.tsx");
    expect(mainSource).toContain("createDesktopApp");

    const desktopBootstrapSource = readSource("src/app/desktop/bootstrap/createDesktopApp.tsx");
    expect(desktopBootstrapSource).toContain("configureDesktopPlatformBridge");
    expect(desktopBootstrapSource).toContain("DesktopBootstrapApp");
  });

  it("aligns the shell and global theme sources to claw-studio surface contracts", () => {
    const globalCssSource = readSource("src/index.css");
    const shellSource = readSource("packages/sdkwork-openchat-pc-commons/src/shell/MainLayout.tsx");
    const sidebarSource = readSource("packages/sdkwork-openchat-pc-commons/src/shell/Sidebar.tsx");

    expect(globalCssSource).toContain("--theme-primary-600");
    expect(globalCssSource).toContain("--scrollbar-thumb");
    expect(globalCssSource).toContain("--scrollbar-track");
    expect(globalCssSource).toContain("--text-on-accent");
    expect(globalCssSource).toContain("--shell-sidebar-badge-bg");
    expect(globalCssSource).toContain("--shell-danger-border-hover");

    expect(shellSource).toContain("bg-[var(--bg-primary)]");
    expect(shellSource).toContain("text-[var(--text-primary)]");
    expect(shellSource).toContain("var(--ai-primary-glow)");
    expect(shellSource).toContain("bg-[var(--bg-secondary)]");

    expect(sidebarSource).toContain("bg-[linear-gradient(180deg,_#13151a_0%,_#0b0c10_100%)]");
    expect(sidebarSource).toContain("shadow-[18px_0_50px_rgba(9,9,11,0.16)]");
    expect(sidebarSource).toContain("var(--shell-sidebar-badge-bg)");
    expect(sidebarSource).toContain("var(--shell-sidebar-brand-fg)");
  });
});
