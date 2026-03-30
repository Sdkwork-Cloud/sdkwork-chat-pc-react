import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Database,
  Download,
  Info,
  KeyRound,
  Laptop,
  MessageSquare,
  Monitor,
  PackageOpen,
  Shield,
  UserRound,
} from "lucide-react";

export type SettingsTabId =
  | "general"
  | "account"
  | "notifications"
  | "security"
  | "feedback"
  | "privacy"
  | "imconfig"
  | "installer"
  | "desktop"
  | "openclaw"
  | "about";

export interface SettingsTabDefinition {
  id: SettingsTabId;
  labelKey: string;
  icon: LucideIcon;
  aliases?: string[];
}

export const settingsTabs: SettingsTabDefinition[] = [
  { id: "general", labelKey: "settings.tabs.general", icon: Monitor },
  { id: "account", labelKey: "settings.tabs.account", icon: UserRound },
  { id: "notifications", labelKey: "settings.tabs.notifications", icon: Bell },
  { id: "security", labelKey: "settings.tabs.security", icon: Shield },
  { id: "feedback", labelKey: "settings.tabs.feedback", icon: MessageSquare },
  { id: "privacy", labelKey: "settings.tabs.privacy", icon: Database, aliases: ["data"] },
  { id: "imconfig", labelKey: "settings.tabs.imconfig", icon: KeyRound },
  { id: "installer", labelKey: "settings.tabs.installer", icon: Download },
  { id: "desktop", labelKey: "settings.tabs.desktop", icon: Laptop },
  { id: "openclaw", labelKey: "settings.tabs.openClaw", icon: PackageOpen, aliases: ["openClaw"] },
  { id: "about", labelKey: "settings.tabs.about", icon: Info },
];

const SETTINGS_ROOT_PATH = "/settings";

export function isSettingsTabId(value?: string | null): value is SettingsTabId {
  return settingsTabs.some((item) => item.id === value);
}

function normalizeSettingsTabId(value?: string | null): SettingsTabId | null {
  if (!value) {
    return null;
  }

  if (isSettingsTabId(value)) {
    return value;
  }

  const matched = settingsTabs.find((item) => item.aliases?.includes(value));
  return matched?.id ?? null;
}

export function resolveSettingsTabFromPath(pathname: string): SettingsTabId {
  if (pathname === SETTINGS_ROOT_PATH || pathname === `${SETTINGS_ROOT_PATH}/`) {
    return "general";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/account`)) {
    return "account";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/notifications`)) {
    return "notifications";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/security`)) {
    return "security";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/feedback`)) {
    return "feedback";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/privacy`)) {
    return "privacy";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/imconfig`)) {
    return "imconfig";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/installer`)) {
    return "installer";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/desktop`)) {
    return "desktop";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/openclaw`)) {
    return "openclaw";
  }
  if (pathname.startsWith(`${SETTINGS_ROOT_PATH}/about`)) {
    return "about";
  }

  return "general";
}

export function buildSettingsSearchParams(
  current?: URLSearchParams | string,
  tabId?: SettingsTabId,
): URLSearchParams {
  const next = new URLSearchParams(current);

  if (!tabId || tabId === "general") {
    next.delete("tab");
    return next;
  }

  next.set("tab", tabId);
  return next;
}

export function resolveSettingsTab(
  requestedTab: string | null,
  pathname: string,
): SettingsTabId {
  return normalizeSettingsTabId(requestedTab) ?? resolveSettingsTabFromPath(pathname);
}

export function buildSettingsHref(tabId: SettingsTabId): string {
  const nextSearchParams = buildSettingsSearchParams(undefined, tabId);
  const search = nextSearchParams.toString();
  return search ? `${SETTINGS_ROOT_PATH}?${search}` : SETTINGS_ROOT_PATH;
}
