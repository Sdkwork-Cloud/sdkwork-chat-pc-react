import type { ComponentType } from "react";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  useAppTranslation,
} from "@sdkwork/openchat-pc-i18n";
import { useAppStore, type LanguagePreference, type ThemeColor } from "@sdkwork/openchat-pc-core";
import { Button, Checkbox, Select } from "@sdkwork/openchat-pc-ui";
import { PanelHeading, Section } from "./Shared";

const THEME_COLORS: Array<{ id: ThemeColor; labelKey: string; colorClass: string }> = [
  { id: "tech-blue", labelKey: "settings.general.themeColors.tech-blue", colorClass: "bg-blue-500" },
  { id: "lobster", labelKey: "settings.general.themeColors.lobster", colorClass: "bg-red-500" },
  { id: "green-tech", labelKey: "settings.general.themeColors.green-tech", colorClass: "bg-emerald-500" },
  { id: "zinc", labelKey: "settings.general.themeColors.zinc", colorClass: "bg-zinc-500" },
  { id: "violet", labelKey: "settings.general.themeColors.violet", colorClass: "bg-violet-500" },
  { id: "rose", labelKey: "settings.general.themeColors.rose", colorClass: "bg-rose-500" },
];

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  "zh-CN": "settings.language.zh-CN",
  "en-US": "settings.language.en-US",
};

const SETTINGS_SIDEBAR_ITEMS = [
  { id: "chat", label: "Chat" },
  { id: "contacts", label: "Contacts" },
  { id: "drive", label: "Drive" },
  { id: "agents", label: "Agents" },
  { id: "skills", label: "Skills" },
  { id: "appstore", label: "App Store" },
  { id: "me", label: "Me" },
  { id: "app", label: "App Center" },
  { id: "notifications", label: "Notifications" },
  { id: "commerce", label: "Commerce" },
  { id: "shopping", label: "Shopping" },
  { id: "order-center", label: "Order Center" },
  { id: "moments", label: "Moments" },
  { id: "discover", label: "Discover" },
  { id: "content", label: "Content" },
  { id: "look", label: "Look" },
  { id: "media", label: "Media" },
  { id: "nearby", label: "Nearby" },
  { id: "appointments", label: "Appointments" },
  { id: "communication", label: "Communication" },
  { id: "wallet", label: "Wallet" },
  { id: "vip", label: "VIP" },
  { id: "creation", label: "Creation" },
  { id: "short-video", label: "Short Video" },
  { id: "tools", label: "Tools" },
  { id: "terminal", label: "Terminal" },
  { id: "openclaw-installer", label: "OpenClaw Installer" },
  { id: "openclaw-settings", label: "OpenClaw Settings" },
] as const;

export function GeneralSettings() {
  const { tr } = useAppTranslation();
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const themeColor = useAppStore((state) => state.themeColor);
  const setThemeColor = useAppStore((state) => state.setThemeColor);
  const languagePreference = useAppStore((state) => state.languagePreference);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const hiddenSidebarItems = useAppStore((state) => state.hiddenSidebarItems);
  const toggleSidebarItem = useAppStore((state) => state.toggleSidebarItem);

  const configurableSidebarItems = SETTINGS_SIDEBAR_ITEMS;

  return (
    <div className="space-y-8">
      <PanelHeading title={tr("settings.tabs.general")} description={tr("settings.description")} />

      <div className="space-y-6">
        <Section title={tr("settings.general.appearance.title")}>
          <div className="space-y-6">
            <div>
              <div className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {tr("settings.general.appearance.theme")}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ThemeOption
                  icon={Sun}
                  label={tr("settings.general.appearance.theme.light")}
                  active={themeMode === "light"}
                  onClick={() => setThemeMode("light")}
                />
                <ThemeOption
                  icon={Moon}
                  label={tr("settings.general.appearance.theme.dark")}
                  active={themeMode === "dark"}
                  onClick={() => setThemeMode("dark")}
                />
                <ThemeOption
                  icon={Laptop}
                  label={tr("settings.general.appearance.theme.system")}
                  active={themeMode === "system"}
                  onClick={() => setThemeMode("system")}
                />
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {tr("settings.general.accentColor")}
              </div>
              <div className="flex flex-wrap gap-4">
                {THEME_COLORS.map((color) => (
                  <Button
                    key={color.id}
                    variant="unstyled"
                    type="button"
                    onClick={() => setThemeColor(color.id)}
                    className="group relative flex flex-col items-center gap-2"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${color.colorClass} shadow-sm ring-2 ring-offset-2 transition-all dark:ring-offset-zinc-950 ${
                        themeColor === color.id
                          ? "scale-110 ring-zinc-900 dark:ring-zinc-100"
                          : "ring-transparent hover:scale-105"
                      }`}
                    >
                      {themeColor === color.id ? <Check className="h-5 w-5 text-white" /> : null}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        themeColor === color.id
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-300"
                      }`}
                    >
                      {tr(color.labelKey)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title={tr("settings.account.userSettings.language")}>
          <div className="max-w-sm">
            <Select
              value={languagePreference}
              onValueChange={(value) => setLanguage(value as LanguagePreference)}
            >
              <option value="system">{tr("settings.general.appearance.theme.system")}</option>
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {tr(LANGUAGE_LABELS[language])}
                </option>
              ))}
            </Select>
          </div>
        </Section>

        <Section
          title={tr("settings.general.sidebar.title")}
          description={tr("settings.general.sidebar.description")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {configurableSidebarItems.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <Checkbox
                  checked={!hiddenSidebarItems.includes(item.id)}
                  onChange={() => toggleSidebarItem(item.id)}
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {tr(item.label)}
                </span>
              </label>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function ThemeOption({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="unstyled"
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all ${
        active
          ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      }`}
    >
      <Icon
        className={`h-6 w-6 ${
          active ? "text-primary-500 dark:text-primary-400" : "text-zinc-500 dark:text-zinc-400"
        }`}
      />
      <span
        className={`text-sm font-medium ${
          active ? "text-primary-700 dark:text-primary-300" : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {label}
      </span>
    </Button>
  );
}
