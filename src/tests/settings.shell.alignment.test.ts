import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");
const SETTINGS_ROOT = path.join(
  REPO_ROOT,
  "packages/sdkwork-openchat-pc-settings/src",
);

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("settings shell alignment", () => {
  it("splits sdkwork-chat-pc-react settings into claw-style shell and focused panels", () => {
    const expectedFiles = [
      "packages/sdkwork-openchat-pc-settings/src/Settings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/Shared.tsx",
      "packages/sdkwork-openchat-pc-settings/src/GeneralSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/AccountSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/NotificationSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/SecuritySettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/FeedbackSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/DataPrivacySettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/ImConfigSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/InstallerSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/DesktopSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/OpenClawSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/AboutSettings.tsx",
      "packages/sdkwork-openchat-pc-settings/src/settingsTabs.ts",
    ];

    expect(
      expectedFiles.filter((relativePath) => !existsSync(path.join(REPO_ROOT, relativePath))),
    ).toEqual([]);
  });

  it("uses claw-style search-parameter navigation and a full-width page wrapper", () => {
    const settingsSource = readSource("packages/sdkwork-openchat-pc-settings/src/Settings.tsx");
    const tabsSource = readSource("packages/sdkwork-openchat-pc-settings/src/settingsTabs.ts");
    const pageSource = readSource("packages/sdkwork-openchat-pc-settings/src/pages/SettingsPage.tsx");

    expect(settingsSource).toContain("useSearchParams");
    expect(settingsSource).toContain("searchQuery");
    expect(settingsSource).toContain("filteredTabs");
    expect(settingsSource).toContain("setSearchParams");
    expect(settingsSource).toContain("Search");
    expect(settingsSource).toContain("motion.div");
    expect(settingsSource).toContain("key={activeTab}");
    expect(settingsSource).toContain("max-w-none");
    expect(settingsSource).not.toContain("max-w-5xl");
    expect(settingsSource).toContain('className="flex h-full min-w-0 w-full flex-1');
    expect(settingsSource).toContain('className="scrollbar-hide min-w-0 flex-1 overflow-x-hidden overflow-y-auto"');

    expect(tabsSource).toContain("resolveSettingsTabFromPath");
    expect(tabsSource).toContain("buildSettingsSearchParams");
    expect(tabsSource).toContain("settingsTabs");

    expect(pageSource).toContain('export { SettingsPage } from "../Settings"');
  });
});
