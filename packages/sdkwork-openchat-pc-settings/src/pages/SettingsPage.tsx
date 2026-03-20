import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@sdkwork/openchat-pc-auth";
import { IS_DEV } from "@sdkwork/openchat-pc-kernel";
import { useTheme, type ThemeType as UIThemeType } from "@sdkwork/openchat-pc-ui";
import {
  SdkworkOpenclawPcDesktop,
  SdkworkOpenclawPcInstaller,
  SdkworkOpenclawPcSettings,
} from "../components";
import {
  FeedbackResultService,
  SettingsResultService,
  userCenterService,
  type UserCenterAddress,
  type UserCenterProfile,
  type UserCenterSettings,
  type UserCenterUpdateSettingsInput,
} from "../services";
import type { AppInfo, FeedbackSupportInfo, SettingsState } from "../types";
import {
  AppLanguage,
  formatDateTime as formatDateTimeRuntime,
  useAppTranslation,
} from "@sdkwork/openchat-pc-i18n";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

type SettingTab =
  | "account"
  | "imconfig"
  | "installer"
  | "desktop"
  | "openclawSettings"
  | "general"
  | "notifications"
  | "privacy"
  | "about";

const settingTabItems: SettingTab[] = [
  "account",
  "imconfig",
  "installer",
  "desktop",
  "openclawSettings",
  "general",
  "notifications",
  "privacy",
  "about",
];

const settingTabSet = new Set<SettingTab>(settingTabItems);

const SETTING_TAB_TRANSLATION_KEYS: Record<SettingTab, string> = {
  account: "settings.tabs.account",
  imconfig: "settings.tabs.imconfig",
  installer: "settings.tabs.installer",
  desktop: "settings.tabs.desktop",
  openclawSettings: "settings.tabs.openClaw",
  general: "settings.tabs.general",
  notifications: "settings.tabs.notifications",
  privacy: "settings.tabs.privacy",
  about: "settings.tabs.about",
};

const LANGUAGE_LABEL_KEYS: Record<AppLanguage, string> = {
  "zh-CN": "settings.language.zh-CN",
  "en-US": "settings.language.en-US",
};
const SETTINGS_ACCOUNT_LANGUAGES: readonly AppLanguage[] = ["zh-CN", "en-US"];

const THEME_OPTION_KEYS: Record<SettingsState["theme"], string> = {
  light: "settings.general.appearance.theme.light",
  dark: "settings.general.appearance.theme.dark",
  blue: "settings.general.appearance.theme.blue",
  green: "settings.general.appearance.theme.system",
  purple: "settings.general.appearance.theme.purple",
  system: "settings.general.appearance.theme.system",
};

const FONT_SIZE_OPTION_KEYS: Record<SettingsState["preferences"]["fontSize"], string> = {
  small: "settings.general.appearance.fontSize.small",
  medium: "settings.general.appearance.fontSize.medium",
  large: "settings.general.appearance.fontSize.large",
};

function resolveSettingTabFromPath(pathname: string): SettingTab | null {
  if (pathname === "/settings" || pathname.startsWith("/settings/account")) {
    return "account";
  }
  if (pathname.startsWith("/settings/imconfig")) {
    return "imconfig";
  }
  if (pathname.startsWith("/settings/installer")) {
    return "installer";
  }
  if (pathname.startsWith("/settings/desktop")) {
    return "desktop";
  }
  if (pathname.startsWith("/settings/openclaw")) {
    return "openclawSettings";
  }
  if (pathname.startsWith("/settings/general")) {
    return "general";
  }
  if (pathname.startsWith("/settings/notifications")) {
    return "notifications";
  }
  if (pathname.startsWith("/settings/privacy")) {
    return "privacy";
  }
  if (pathname.startsWith("/settings/about")) {
    return "about";
  }

  if (!pathname.startsWith("/settings")) {
    return null;
  }

  const segment = pathname.slice("/settings/".length);
  if (settingTabSet.has(segment as SettingTab)) {
    return segment as SettingTab;
  }

  return "account";
}

type DeviceFlag = "PC" | "WEB" | "DESKTOP";

interface IMConfigDraft {
  wsUrl: string;
  serverUrl: string;
  deviceId: string;
  deviceFlag: DeviceFlag;
  uid: string;
  token: string;
}

const IM_CONFIG_STORAGE_KEY = "openchat:im-config";
const DEV_AUTO_LOGIN_KEY = "openchat_dev_auto_login_disabled";

const defaultSettings: SettingsState = {
  theme: "blue",
  notifications: {
    messagePreview: true,
    messageSound: true,
    messageVibration: false,
    groupMessage: true,
    groupMention: true,
    systemUpdates: true,
    marketingEmails: false,
    doNotDisturb: false,
    doNotDisturbStart: "23:00",
    doNotDisturbEnd: "08:00",
  },
  privacy: {
    onlineStatus: "contacts",
    lastSeen: "contacts",
    profilePhoto: "everyone",
    phoneNumber: "contacts",
    addByPhone: true,
    addByUsername: true,
    addByQRCode: true,
    readReceipts: true,
    screenshotNotification: false,
  },
  preferences: {
    language: "zh-CN",
    fontSize: "medium",
    compactMode: false,
    mediaQuality: "auto",
    autoDownload: {
      images: true,
      videos: false,
      files: false,
    },
  },
  modelConfigs: [],
};

const defaultAppInfo: AppInfo = {
  version: "1.0.0",
  buildNumber: "local",
  platform: "web",
  updateAvailable: false,
};

const defaultFeedbackSupportInfo: FeedbackSupportInfo = {
  email: "support@example.com",
  workingHours: "Mon-Fri 09:00-18:00",
};

const defaultIMConfig: IMConfigDraft = {
  wsUrl:
    (import.meta.env.VITE_IM_WS_URL as string | undefined) ??
    (import.meta.env.VITE_APP_IM_WS_URL as string | undefined) ??
    "",
  serverUrl: "",
  deviceId: "",
  deviceFlag: "PC",
  uid: localStorage.getItem("uid") ?? "",
  token: localStorage.getItem("token") ?? "",
};

function loadIMConfig(): IMConfigDraft {
  try {
    const raw = localStorage.getItem(IM_CONFIG_STORAGE_KEY);
    if (!raw) {
      return defaultIMConfig;
    }

    const parsed = JSON.parse(raw) as Partial<IMConfigDraft>;
    return {
      wsUrl: typeof parsed.wsUrl === "string" ? parsed.wsUrl : defaultIMConfig.wsUrl,
      serverUrl: typeof parsed.serverUrl === "string" ? parsed.serverUrl : defaultIMConfig.serverUrl,
      deviceId: typeof parsed.deviceId === "string" ? parsed.deviceId : defaultIMConfig.deviceId,
      deviceFlag:
        parsed.deviceFlag === "WEB" || parsed.deviceFlag === "DESKTOP"
          ? parsed.deviceFlag
          : "PC",
      uid: typeof parsed.uid === "string" ? parsed.uid : defaultIMConfig.uid,
      token: typeof parsed.token === "string" ? parsed.token : defaultIMConfig.token,
    };
  } catch (error) {
    console.warn("Failed to parse local IM config, using defaults.", error);
    return defaultIMConfig;
  }
}

function persistIMConfig(next: IMConfigDraft): void {
  localStorage.setItem(IM_CONFIG_STORAGE_KEY, JSON.stringify(next));
  if (next.uid.trim()) {
    localStorage.setItem("uid", next.uid.trim());
  }
  if (next.token.trim()) {
    localStorage.setItem("token", next.token.trim());
  }
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <SharedUi.Button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-bg-tertiary"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </SharedUi.Button>
  );
}

function isUITheme(value: string): value is UIThemeType {
  return value === "light" || value === "dark" || value === "blue" || value === "purple" || value === "system";
}

interface AccountAddressDraft {
  name: string;
  phone: string;
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  addressDetail: string;
  isDefault: boolean;
}

interface AccountHistoryRow {
  id: string;
  title: string;
  timeText: string;
  detail: string;
}

interface AccountUserSettingsDraft {
  theme: string;
  language: string;
  autoPlay: boolean;
  highQuality: boolean;
  dataSaver: boolean;
  notificationSettings: {
    system: boolean;
    message: boolean;
    activity: boolean;
    promotion: boolean;
    sound: boolean;
    vibration: boolean;
  };
  privacySettings: {
    publicProfile: boolean;
    allowSearch: boolean;
    allowFriendRequest: boolean;
  };
}

interface AccountBindingDraft {
  email: string;
  emailCode: string;
  phone: string;
  phoneCode: string;
  wechatCode: string;
  wechatUserId: string;
  qqCode: string;
  qqUserId: string;
}

const ACCOUNT_HISTORY_PAGE_SIZE = 8;

function emptyAccountAddressDraft(): AccountAddressDraft {
  return {
    name: "",
    phone: "",
    provinceCode: "",
    cityCode: "",
    districtCode: "",
    addressDetail: "",
    isDefault: false,
  };
}

function emptyAccountBindingDraft(): AccountBindingDraft {
  return {
    email: "",
    emailCode: "",
    phone: "",
    phoneCode: "",
    wechatCode: "",
    wechatUserId: "",
    qqCode: "",
    qqUserId: "",
  };
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickHistoryTime(item: Record<string, unknown>): string {
  return safeText(item.createdAt) || safeText(item.updatedAt) || safeText(item.timestamp) || safeText(item.time);
}

function formatHistoryTime(value: unknown): string {
  const raw = safeText(value);
  if (!raw) {
    return "--";
  }
  const formatted = formatDateTimeRuntime(raw);
  if (formatted) {
    return formatted;
  }
  return raw;
}

function mapAccountHistoryRows(content: Record<string, unknown>[] | undefined, fallbackLabel: string): AccountHistoryRow[] {
  if (!Array.isArray(content)) {
    return [];
  }
  return content.slice(0, ACCOUNT_HISTORY_PAGE_SIZE).map((item, index) => {
    const title = safeText(item.title)
      || safeText(item.event)
      || safeText(item.type)
      || safeText(item.action)
      || fallbackLabel;
    const location = safeText(item.location) || safeText(item.ip) || safeText(item.device) || safeText(item.platform);
    const detail = location || safeText(item.status) || safeText(item.result) || "--";
    const identifier = safeText(item.id) || safeText(item.recordId) || `${fallbackLabel}-${index + 1}`;
    return {
      id: identifier,
      title,
      timeText: formatHistoryTime(pickHistoryTime(item)),
      detail,
    };
  });
}

function formatAccountAddressLine(address: UserCenterAddress): string {
  const prefix = [address.provinceCode, address.cityCode, address.districtCode]
    .map((item) => (item || "").trim())
    .filter(Boolean)
    .join(" ");
  const detail = (address.addressDetail || address.fullAddress || "").trim();
  return [prefix, detail].filter(Boolean).join(" ").trim() || "--";
}

function defaultAccountUserSettingsDraft(): AccountUserSettingsDraft {
  return {
    theme: "system",
    language: "zh-CN",
    autoPlay: true,
    highQuality: true,
    dataSaver: false,
    notificationSettings: {
      system: true,
      message: true,
      activity: true,
      promotion: false,
      sound: true,
      vibration: true,
    },
    privacySettings: {
      publicProfile: true,
      allowSearch: true,
      allowFriendRequest: true,
    },
  };
}

function toAccountUserSettingsDraft(value: UserCenterSettings | null): AccountUserSettingsDraft {
  const defaults = defaultAccountUserSettingsDraft();
  if (!value) {
    return defaults;
  }
  const extended = value as UserCenterSettings & {
    autoPlay?: boolean;
    highQuality?: boolean;
    dataSaver?: boolean;
  };
  return {
    theme: (value.theme || "").trim() || defaults.theme,
    language: (value.language || "").trim() || defaults.language,
    autoPlay: extended.autoPlay ?? defaults.autoPlay,
    highQuality: extended.highQuality ?? defaults.highQuality,
    dataSaver: extended.dataSaver ?? defaults.dataSaver,
    notificationSettings: {
      system: value.notificationSettings?.system ?? defaults.notificationSettings.system,
      message: value.notificationSettings?.message ?? defaults.notificationSettings.message,
      activity: value.notificationSettings?.activity ?? defaults.notificationSettings.activity,
      promotion: value.notificationSettings?.promotion ?? defaults.notificationSettings.promotion,
      sound: value.notificationSettings?.sound ?? defaults.notificationSettings.sound,
      vibration: value.notificationSettings?.vibration ?? defaults.notificationSettings.vibration,
    },
    privacySettings: {
      publicProfile: value.privacySettings?.publicProfile ?? defaults.privacySettings.publicProfile,
      allowSearch: value.privacySettings?.allowSearch ?? defaults.privacySettings.allowSearch,
      allowFriendRequest: value.privacySettings?.allowFriendRequest ?? defaults.privacySettings.allowFriendRequest,
    },
  };
}

function toAccountUserSettingsPayload(draft: AccountUserSettingsDraft): UserCenterUpdateSettingsInput {
  return {
    theme: draft.theme,
    language: draft.language,
    autoPlay: draft.autoPlay,
    highQuality: draft.highQuality,
    dataSaver: draft.dataSaver,
    notificationSettings: { ...draft.notificationSettings },
    privacySettings: { ...draft.privacySettings },
  };
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>("account");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [appInfo, setAppInfo] = useState<AppInfo>(defaultAppInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [imDraft, setImDraft] = useState<IMConfigDraft>(() => loadIMConfig());
  const [devAutoLoginDisabled, setDevAutoLoginDisabled] = useState(
    () => localStorage.getItem(DEV_AUTO_LOGIN_KEY) === "true",
  );
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSupport, setFeedbackSupport] = useState<FeedbackSupportInfo>(
    defaultFeedbackSupportInfo,
  );
  const [accountProfile, setAccountProfile] = useState<UserCenterProfile | null>(null);
  const [accountDraft, setAccountDraft] = useState({
    nickname: "",
    region: "",
    bio: "",
  });
  const [passwordDraft, setPasswordDraft] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountAddresses, setAccountAddresses] = useState<UserCenterAddress[]>([]);
  const [accountAddressDraft, setAccountAddressDraft] = useState<AccountAddressDraft>(() => emptyAccountAddressDraft());
  const [editingAccountAddressId, setEditingAccountAddressId] = useState<string>("");
  const [accountAddressLoading, setAccountAddressLoading] = useState(false);
  const [accountAddressSaving, setAccountAddressSaving] = useState(false);
  const [accountLoginHistory, setAccountLoginHistory] = useState<AccountHistoryRow[]>([]);
  const [accountGenerationHistory, setAccountGenerationHistory] = useState<AccountHistoryRow[]>([]);
  const [accountHistoryLoading, setAccountHistoryLoading] = useState(false);
  const [accountSettingsLoading, setAccountSettingsLoading] = useState(false);
  const [accountSettingsSaving, setAccountSettingsSaving] = useState(false);
  const [accountSettingsDraft, setAccountSettingsDraft] = useState<AccountUserSettingsDraft>(() =>
    defaultAccountUserSettingsDraft(),
  );
  const [accountBindingDraft, setAccountBindingDraft] = useState<AccountBindingDraft>(() =>
    emptyAccountBindingDraft(),
  );
  const [accountBindingSaving, setAccountBindingSaving] = useState(false);

  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const location = useLocation();
  const { tr, setLanguage: setRuntimeLanguage } = useAppTranslation();
  const tabs = useMemo(
    () =>
      settingTabItems.map((tabId) => ({
        id: tabId,
        label: tr(SETTING_TAB_TRANSLATION_KEYS[tabId]),
      })),
    [tr],
  );
  const pickProfileValue = (
    primary?: string,
    secondary?: string,
    fallbackKey?: string,
    fallbackValue = "--",
  ) => {
    const first = primary?.trim();
    if (first) {
      return first;
    }
    const second = secondary?.trim();
    if (second) {
      return second;
    }
    if (fallbackKey) {
      return tr(fallbackKey);
    }
    return fallbackValue;
  };
  const languageOptions = useMemo(
    () =>
      SETTINGS_ACCOUNT_LANGUAGES.map((language) => ({
        value: language,
        label: tr(LANGUAGE_LABEL_KEYS[language] ?? language),
      })),
    [tr],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const [settingsRes, appInfoRes] = await Promise.all([
          SettingsResultService.getSettings(),
          SettingsResultService.getAppInfo(),
        ]);

        if (cancelled) {
          return;
        }

        if (settingsRes.success && settingsRes.data) {
          const merged: SettingsState = {
            ...defaultSettings,
            ...settingsRes.data,
            notifications: {
              ...defaultSettings.notifications,
              ...(settingsRes.data.notifications || {}),
            },
            privacy: {
              ...defaultSettings.privacy,
              ...(settingsRes.data.privacy || {}),
            },
            preferences: {
              ...defaultSettings.preferences,
              ...(settingsRes.data.preferences || {}),
              autoDownload: {
                ...defaultSettings.preferences.autoDownload,
                ...(settingsRes.data.preferences?.autoDownload || {}),
              },
            },
          };

          setSettings(merged);
          if (isUITheme(merged.theme)) {
            setTheme(merged.theme);
          }
        }

        if (appInfoRes.success && appInfoRes.data) {
          setAppInfo((prev) => ({ ...prev, ...appInfoRes.data }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load settings data.", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeedbackSupport() {
      try {
        const result = await FeedbackResultService.getFeedbackSupportInfo();
        if (cancelled || !result.success || !result.data) {
          return;
        }
        setFeedbackSupport((prev) => ({ ...prev, ...result.data }));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load feedback support info.", error);
        }
      }
    }

    void loadFeedbackSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tabFromPath = resolveSettingTabFromPath(location.pathname);
    if (tabFromPath && tabFromPath !== activeTab) {
      setActiveTab(tabFromPath);
    }
  }, [activeTab, location.pathname]);

  useEffect(() => {
    let cancelled = false;

    const loadAccountProfile = async () => {
      if (activeTab !== "account") {
        return;
      }
      setAccountAddressLoading(true);
      setAccountHistoryLoading(true);
      setAccountSettingsLoading(true);
      const loginFallbackLabel = tr("settings.account.history.login");
      const generationFallbackLabel = tr("settings.account.history.generation");
      try {
        const [profileResult, addressesResult, loginResult, generationResult, settingsResult] = await Promise.allSettled([
          userCenterService.getUserProfile(),
          userCenterService.listUserAddresses(),
          userCenterService.getLoginHistory({ page: 0, size: ACCOUNT_HISTORY_PAGE_SIZE }),
          userCenterService.getGenerationHistory({ page: 0, size: ACCOUNT_HISTORY_PAGE_SIZE }),
          userCenterService.getUserSettings(),
        ]);

        if (cancelled) {
          return;
        }

        if (profileResult.status === "fulfilled" && profileResult.value) {
          const profile = profileResult.value;
          setAccountProfile(profile);
          setAccountDraft({
            nickname: profile.nickname || "",
            region: profile.region || "",
            bio: profile.bio || "",
          });
          setAccountBindingDraft((prev) => ({
            ...prev,
            email: profile.email || "",
            phone: profile.phone || "",
          }));
        } else if (profileResult.status === "rejected") {
          console.warn("Failed to load account profile from SDK.", profileResult.reason);
        }

        if (addressesResult.status === "fulfilled") {
          setAccountAddresses(addressesResult.value);
        } else {
          console.warn("Failed to load account addresses from SDK.", addressesResult.reason);
        }

        if (loginResult.status === "fulfilled") {
          setAccountLoginHistory(mapAccountHistoryRows(loginResult.value.content, loginFallbackLabel));
        } else {
          console.warn("Failed to load account login history from SDK.", loginResult.reason);
        }

        if (generationResult.status === "fulfilled") {
          setAccountGenerationHistory(
            mapAccountHistoryRows(generationResult.value.content, generationFallbackLabel),
          );
        } else {
          console.warn("Failed to load account generation history from SDK.", generationResult.reason);
        }

        if (settingsResult.status === "fulfilled") {
          setAccountSettingsDraft(toAccountUserSettingsDraft(settingsResult.value));
        } else {
          console.warn("Failed to load account user settings from SDK.", settingsResult.reason);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load account data from SDK.", error);
        }
      } finally {
        if (!cancelled) {
          setAccountAddressLoading(false);
          setAccountHistoryLoading(false);
          setAccountSettingsLoading(false);
        }
      }
    };

    void loadAccountProfile();
    return () => {
      cancelled = true;
    };
  }, [activeTab, tr]);

  const handleSelectTab = (tab: SettingTab) => {
    setActiveTab(tab);
  };

  const handleAccountLanguageChange = (nextLanguage: string) => {
    const normalizedLanguage = (SETTINGS_ACCOUNT_LANGUAGES.find((language) => language === nextLanguage) ??
      "zh-CN") as AppLanguage;
    setAccountSettingsDraft((prev) => ({ ...prev, language: normalizedLanguage }));
    void setRuntimeLanguage(normalizedLanguage);
  };

  const showSettingsSave =
    activeTab === "general" || activeTab === "notifications" || activeTab === "privacy";

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const result = await SettingsResultService.updateSettings(settings);
      if (!result.success) {
        setSaveMessage(
          result.error || result.message || tr("settings.messages.saveFailedLocalChanges"),
        );
        return;
      }

      if (result.data) {
        setSettings(result.data);
      }
      setSaveMessage(tr("settings.messages.settingsSaved"));
    } catch (error) {
      console.error("Failed to save settings.", error);
      setSaveMessage(tr("settings.messages.saveFailedLocalChanges"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveIMConfig = () => {
    const next: IMConfigDraft = {
      wsUrl: imDraft.wsUrl.trim(),
      serverUrl: imDraft.serverUrl.trim(),
      deviceId: imDraft.deviceId.trim(),
      deviceFlag: imDraft.deviceFlag,
      uid: imDraft.uid.trim(),
      token: imDraft.token.trim(),
    };

    persistIMConfig(next);
    setImDraft(next);
    window.dispatchEvent(
      new CustomEvent("openchat:im-config-updated", {
        detail: next,
      }),
    );
    setSaveMessage(tr("settings.messages.imConfigSaved"));
  };

  const handleToggleDevAutoLogin = (enabled: boolean) => {
    if (enabled) {
      localStorage.removeItem(DEV_AUTO_LOGIN_KEY);
      setDevAutoLoginDisabled(false);
      setSaveMessage(tr("settings.messages.devAutoLoginEnabled"));
      return;
    }

    localStorage.setItem(DEV_AUTO_LOGIN_KEY, "true");
    setDevAutoLoginDisabled(true);
    setSaveMessage(tr("settings.messages.devAutoLoginDisabled"));
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const next = await SettingsResultService.checkForUpdates();
        if (!next.success || !next.data) {
          setSaveMessage(
            next.error || next.message || tr("settings.messages.updateCheckFailed"),
          );
          return;
        }

      setAppInfo((prev) => ({ ...prev, ...next.data }));
        setSaveMessage(
          next.data.updateAvailable
            ? tr("settings.messages.updateAvailable")
            : tr("settings.messages.updateUpToDate"),
        );
    } catch (error) {
      console.error("Failed to check updates.", error);
      setSaveMessage(tr("settings.messages.updateCheckFailed"));
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSubmitFeedback = async () => {
    const content = feedbackContent.trim();
    if (!content) {
      setFeedbackMessage("Please enter feedback content.");
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackMessage("");
    try {
      const result = await FeedbackResultService.submitFeedback({
        type: feedbackType,
        content,
        contact: feedbackContact.trim() || undefined,
      });

      if (!result.success || !result.data) {
        setFeedbackMessage(result.error || result.message || "Feedback submission failed.");
        return;
      }

      setFeedbackContent("");
      setFeedbackContact("");
      setFeedbackMessage(`Feedback submitted successfully (ID: ${result.data.id}).`);
    } catch (error) {
      console.error("Failed to submit feedback.", error);
      setFeedbackMessage("Feedback submission failed.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleSaveAccountProfile = async () => {
    setAccountSaving(true);
    setSaveMessage("");
    try {
      const updated = await userCenterService.updateUserProfile({
        nickname: accountDraft.nickname.trim() || undefined,
        region: accountDraft.region.trim() || undefined,
        bio: accountDraft.bio.trim() || undefined,
      });
      setAccountProfile(updated);
      setSaveMessage(tr("settings.messages.profileUpdated"));
    } catch (error) {
      console.error("Failed to update account profile.", error);
      setSaveMessage(error instanceof Error ? error.message : tr("settings.messages.profileUpdateFailed"));
    } finally {
      setAccountSaving(false);
    }
  };

  const handleChangeAccountPassword = async () => {
    if (!passwordDraft.oldPassword || !passwordDraft.newPassword || !passwordDraft.confirmPassword) {
      setSaveMessage(tr("settings.messages.passwordFieldsRequired"));
      return;
    }
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setSaveMessage(tr("settings.messages.passwordMismatch"));
      return;
    }

    setAccountSaving(true);
    setSaveMessage("");
    try {
      await userCenterService.changePassword({
        oldPassword: passwordDraft.oldPassword,
        newPassword: passwordDraft.newPassword,
        confirmPassword: passwordDraft.confirmPassword,
      });
      setPasswordDraft({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSaveMessage(tr("settings.messages.passwordChanged"));
    } catch (error) {
      console.error("Failed to change account password.", error);
      setSaveMessage(error instanceof Error ? error.message : tr("settings.messages.passwordChangeFailed"));
    } finally {
      setAccountSaving(false);
    }
  };

  const applyAccountBindingProfile = (profile: UserCenterProfile) => {
    setAccountProfile(profile);
    setAccountBindingDraft((prev) => ({
      ...prev,
      email: profile.email || "",
      phone: profile.phone || "",
    }));
  };

  const handleBindAccountEmail = async () => {
    const email = accountBindingDraft.email.trim();
    if (!email) {
      setSaveMessage(tr("settings.messages.emailRequired"));
      return;
    }
    setAccountBindingSaving(true);
    setSaveMessage("");
    try {
      const updated = await userCenterService.bindEmail(
        email,
        accountBindingDraft.emailCode.trim() || undefined,
      );
      applyAccountBindingProfile(updated);
      setAccountBindingDraft((prev) => ({ ...prev, emailCode: "" }));
      setSaveMessage(tr("settings.messages.emailBound"));
    } catch (error) {
      console.error("Failed to bind account email.", error);
      setSaveMessage(error instanceof Error ? error.message : tr("settings.messages.emailBindFailed"));
    } finally {
      setAccountBindingSaving(false);
    }
  };

  const handleUnbindAccountEmail = async () => {
    setAccountBindingSaving(true);
    setSaveMessage("");
    try {
      const updated = await userCenterService.unbindEmail();
      applyAccountBindingProfile(updated);
      setAccountBindingDraft((prev) => ({ ...prev, emailCode: "" }));
      setSaveMessage(tr("settings.messages.emailUnbound"));
    } catch (error) {
      console.error("Failed to unbind account email.", error);
      setSaveMessage(error instanceof Error ? error.message : tr("settings.messages.emailUnbindFailed"));
    } finally {
      setAccountBindingSaving(false);
    }
  };

  const handleBindAccountPhone = async () => {
    const phone = accountBindingDraft.phone.trim();
    if (!phone) {
      setSaveMessage(tr("settings.messages.phoneRequired"));
      return;
    }
    setAccountBindingSaving(true);
    setSaveMessage("");
    try {
      const updated = await userCenterService.bindPhone(
        phone,
        accountBindingDraft.phoneCode.trim() || undefined,
      );
      applyAccountBindingProfile(updated);
      setAccountBindingDraft((prev) => ({ ...prev, phoneCode: "" }));
      setSaveMessage(tr("settings.messages.phoneBound"));
    } catch (error) {
      console.error("Failed to bind account phone.", error);
      setSaveMessage(error instanceof Error ? error.message : tr("settings.messages.phoneBindFailed"));
    } finally {
      setAccountBindingSaving(false);
    }
  };

  const handleUnbindAccountPhone = async () => {
    setAccountBindingSaving(true);
    setSaveMessage("");
    try {
      const updated = await userCenterService.unbindPhone();
      applyAccountBindingProfile(updated);
      setAccountBindingDraft((prev) => ({ ...prev, phoneCode: "" }));
      setSaveMessage(tr("settings.messages.phoneUnbound"));
    } catch (error) {
      console.error("Failed to unbind account phone.", error);
      setSaveMessage(error instanceof Error ? error.message : tr("settings.messages.phoneUnbindFailed"));
    } finally {
      setAccountBindingSaving(false);
    }
  };

  const handleBindAccountSocial = async (platform: "wechat" | "qq") => {
    const code = platform === "wechat"
      ? accountBindingDraft.wechatCode.trim()
      : accountBindingDraft.qqCode.trim();
    const thirdPartyUserId = platform === "wechat"
      ? accountBindingDraft.wechatUserId.trim()
      : accountBindingDraft.qqUserId.trim();
    const platformLabel = tr(`settings.account.binding.platform.${platform}`);
    if (!code && !thirdPartyUserId) {
      setSaveMessage(
        tr("settings.account.binding.socialCodeRequired", {
          platform: platformLabel,
        }),
      );
      return;
    }
    setAccountBindingSaving(true);
    setSaveMessage("");
    try {
      await userCenterService.bindThirdParty(platform, {
        code: code || undefined,
        thirdPartyUserId: thirdPartyUserId || undefined,
      });
      if (platform === "wechat") {
        setAccountBindingDraft((prev) => ({ ...prev, wechatCode: "", wechatUserId: "" }));
      } else {
        setAccountBindingDraft((prev) => ({ ...prev, qqCode: "", qqUserId: "" }));
      }
      setSaveMessage(
        tr("settings.account.binding.bindSuccess", { platform: platformLabel }),
      );
    } catch (error) {
      console.error(`Failed to bind ${platform} account.`, error);
      setSaveMessage(
        error instanceof Error
          ? error.message
          : tr("settings.account.binding.bindFailed", { platform: platformLabel }),
      );
    } finally {
      setAccountBindingSaving(false);
    }
  };

  const handleUnbindAccountSocial = async (platform: "wechat" | "qq") => {
    const platformLabel = tr(`settings.account.binding.platform.${platform}`);
    setAccountBindingSaving(true);
    setSaveMessage("");
    try {
      await userCenterService.unbindThirdParty(platform);
      setSaveMessage(
        tr("settings.account.binding.unbindSuccess", { platform: platformLabel }),
      );
    } catch (error) {
      console.error(`Failed to unbind ${platform} account.`, error);
      setSaveMessage(
        error instanceof Error
          ? error.message
          : tr("settings.account.binding.unbindFailed", { platform: platformLabel }),
      );
    } finally {
      setAccountBindingSaving(false);
    }
  };

  const reloadAccountExtendedData = async () => {
    setAccountAddressLoading(true);
    setAccountHistoryLoading(true);
    setAccountSettingsLoading(true);
    try {
      const [addresses, loginHistory, generationHistory, userSettings] = await Promise.all([
        userCenterService.listUserAddresses(),
        userCenterService.getLoginHistory({ page: 0, size: ACCOUNT_HISTORY_PAGE_SIZE }),
        userCenterService.getGenerationHistory({ page: 0, size: ACCOUNT_HISTORY_PAGE_SIZE }),
        userCenterService.getUserSettings(),
      ]);
      setAccountAddresses(addresses);
      setAccountLoginHistory(mapAccountHistoryRows(loginHistory.content, "Login"));
      setAccountGenerationHistory(mapAccountHistoryRows(generationHistory.content, "Generation"));
      setAccountSettingsDraft(toAccountUserSettingsDraft(userSettings));
    } catch (error) {
      console.error("Failed to reload account data.", error);
      setSaveMessage(
        error instanceof Error
          ? error.message
          : tr("settings.messages.reloadAccountDataFailed"),
      );
    } finally {
      setAccountAddressLoading(false);
      setAccountHistoryLoading(false);
      setAccountSettingsLoading(false);
    }
  };

  const resetAccountAddressDraft = () => {
    setEditingAccountAddressId("");
    setAccountAddressDraft(emptyAccountAddressDraft());
  };

  const handleEditAccountAddress = (address: UserCenterAddress) => {
    setEditingAccountAddressId(address.id === undefined || address.id === null ? "" : String(address.id));
    setAccountAddressDraft({
      name: (address.name || "").trim(),
      phone: (address.phone || "").trim(),
      provinceCode: (address.provinceCode || "").trim(),
      cityCode: (address.cityCode || "").trim(),
      districtCode: (address.districtCode || "").trim(),
      addressDetail: (address.addressDetail || "").trim(),
      isDefault: !!address.isDefault,
    });
  };

  const handleSaveAccountAddress = async () => {
    const name = accountAddressDraft.name.trim();
    const phone = accountAddressDraft.phone.trim();
    const addressDetail = accountAddressDraft.addressDetail.trim();
    if (!name || !phone || !addressDetail) {
      setSaveMessage(tr("settings.messages.addressFieldsRequired"));
      return;
    }

    setAccountAddressSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        name,
        phone,
        countryCode: "CN",
        provinceCode: accountAddressDraft.provinceCode.trim() || undefined,
        cityCode: accountAddressDraft.cityCode.trim() || undefined,
        districtCode: accountAddressDraft.districtCode.trim() || undefined,
        addressDetail,
        isDefault: accountAddressDraft.isDefault,
      };
      const wasEditing = Boolean(editingAccountAddressId);
      if (wasEditing) {
        await userCenterService.updateAddress(editingAccountAddressId, payload);
      } else {
        await userCenterService.createAddress(payload);
      }
      await reloadAccountExtendedData();
      resetAccountAddressDraft();
      setSaveMessage(
        wasEditing
          ? tr("settings.messages.addressUpdated")
          : tr("settings.messages.addressCreated"),
      );
    } catch (error) {
      console.error("Failed to save account address.", error);
      setSaveMessage(
        error instanceof Error ? error.message : tr("settings.messages.addressSaveFailed"),
      );
    } finally {
      setAccountAddressSaving(false);
    }
  };

  const handleDeleteAccountAddress = async (addressId: string | number | undefined) => {
    if (addressId === undefined || addressId === null) {
      return;
    }
    const confirmed = window.confirm(tr("settings.messages.confirmDeleteAddress"));
    if (!confirmed) {
      return;
    }
    setAccountAddressSaving(true);
    setSaveMessage("");
    try {
      await userCenterService.deleteAddress(addressId);
      await reloadAccountExtendedData();
      if (editingAccountAddressId && editingAccountAddressId === String(addressId)) {
        resetAccountAddressDraft();
      }
      setSaveMessage(tr("settings.messages.addressDeleted"));
    } catch (error) {
      console.error("Failed to delete account address.", error);
      setSaveMessage(
        error instanceof Error ? error.message : tr("settings.messages.addressDeleteFailed"),
      );
    } finally {
      setAccountAddressSaving(false);
    }
  };

  const handleSetDefaultAccountAddress = async (addressId: string | number | undefined) => {
    if (addressId === undefined || addressId === null) {
      return;
    }
    setAccountAddressSaving(true);
    setSaveMessage("");
    try {
      await userCenterService.setDefaultAddress(addressId);
      await reloadAccountExtendedData();
      setSaveMessage(tr("settings.messages.defaultAddressUpdated"));
    } catch (error) {
      console.error("Failed to set default account address.", error);
      setSaveMessage(
        error instanceof Error
          ? error.message
          : tr("settings.messages.defaultAddressFailed"),
      );
    } finally {
      setAccountAddressSaving(false);
    }
  };

  const handleSaveAccountUserSettings = async () => {
    setAccountSettingsSaving(true);
    setSaveMessage("");
    try {
      const updated = await userCenterService.updateUserSettings(
        toAccountUserSettingsPayload(accountSettingsDraft),
      );
      setAccountSettingsDraft(toAccountUserSettingsDraft(updated));
      setSaveMessage(tr("settings.messages.userSettingsUpdated"));
    } catch (error) {
      console.error("Failed to update account user settings.", error);
      setSaveMessage(
        error instanceof Error ? error.message : tr("settings.messages.userSettingsUpdateFailed"),
      );
    } finally {
      setAccountSettingsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          {tr("settings.loading")}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 overflow-hidden bg-bg-primary">
      <aside className="w-56 border-r border-border bg-bg-secondary p-4">
        <h1 className="px-2 text-lg font-semibold text-text-primary">{tr("settings.title")}</h1>
        <p className="px-2 pt-1 text-xs text-text-secondary">{tr("settings.description")}</p>
        <nav className="mt-4 space-y-1">
          {tabs.map((tab) => (
            <SharedUi.Button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                activeTab === tab.id
                  ? "bg-primary-soft text-primary"
                  : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {tab.label}
            </SharedUi.Button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === "account" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.account.profile.title")}
              </h2>
              <div className="mt-3 space-y-2 text-sm text-text-secondary">
                <p>
                  {tr("settings.account.profile.nickname", {
                    value: pickProfileValue(
                      accountProfile?.nickname,
                      user?.nickname,
                      "settings.account.profile.notSet",
                    ),
                  })}
                </p>
                <p>
                  {tr("settings.account.profile.userId", {
                    value: pickProfileValue(accountProfile?.userId, user?.id, undefined, "-"),
                  })}
                </p>
                <p>
                  {tr("settings.account.profile.email", {
                    value: pickProfileValue(
                      accountProfile?.email,
                      user?.email,
                      "settings.account.profile.notBound",
                    ),
                  })}
                </p>
                <p>
                  {tr("settings.account.profile.phone", {
                    value: pickProfileValue(
                      accountProfile?.phone,
                      user?.phone,
                      "settings.account.profile.notBound",
                    ),
                  })}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.account.editProfile.title")}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.editProfile.nickname")}
                  <SharedUi.Input
                    value={accountDraft.nickname}
                    onChange={(event) =>
                      setAccountDraft((prev) => ({ ...prev, nickname: event.target.value }))
                    }
                    placeholder={tr("settings.account.editProfile.nicknamePlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.editProfile.region")}
                  <SharedUi.Input
                    value={accountDraft.region}
                    onChange={(event) =>
                      setAccountDraft((prev) => ({ ...prev, region: event.target.value }))
                    }
                    placeholder={tr("settings.account.editProfile.regionPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary md:col-span-2">
                  {tr("settings.account.editProfile.bio")}
                  <SharedUi.Textarea
                    value={accountDraft.bio}
                    onChange={(event) =>
                      setAccountDraft((prev) => ({ ...prev, bio: event.target.value }))
                    }
                    placeholder={tr("settings.account.editProfile.bioPlaceholder")}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>
              <div className="mt-4">
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void handleSaveAccountProfile();
                  }}
                  disabled={accountSaving}
                  className="rounded-lg border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {accountSaving
                    ? tr("settings.account.editProfile.saving")
                    : tr("settings.account.editProfile.save")}
                </SharedUi.Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.account.changePassword.title")}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.changePassword.current")}
                  <SharedUi.Input
                    type="password"
                    value={passwordDraft.oldPassword}
                    onChange={(event) =>
                      setPasswordDraft((prev) => ({ ...prev, oldPassword: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.changePassword.new")}
                  <SharedUi.Input
                    type="password"
                    value={passwordDraft.newPassword}
                    onChange={(event) =>
                      setPasswordDraft((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.changePassword.confirm")}
                  <SharedUi.Input
                    type="password"
                    value={passwordDraft.confirmPassword}
                    onChange={(event) =>
                      setPasswordDraft((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>
              <div className="mt-4">
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void handleChangeAccountPassword();
                  }}
                  disabled={accountSaving}
                  className="rounded-lg border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {accountSaving
                    ? tr("settings.account.changePassword.submitting")
                    : tr("settings.account.changePassword.update")}
                </SharedUi.Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.account.binding.title")}
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {tr("settings.account.binding.description")}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <div className="text-xs text-text-secondary">{tr("settings.account.binding.email")}</div>
                  <div className="mt-1 text-[11px] text-text-muted">
                    {tr("settings.account.binding.current")}{" "}
                    {accountProfile?.email || user?.email || tr("settings.account.binding.notBound")}
                  </div>
                  <label className="mt-2 block text-sm text-text-secondary">
                    {tr("settings.account.binding.email")}
                    <SharedUi.Input
                      value={accountBindingDraft.email}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder={tr("settings.account.binding.emailPlaceholder")}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <label className="mt-2 block text-sm text-text-secondary">
                    {tr("settings.account.binding.verifyCodeOptional")}
                    <SharedUi.Input
                      value={accountBindingDraft.emailCode}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, emailCode: event.target.value }))
                      }
                      placeholder={tr("settings.account.binding.emailVerifyCodePlaceholder")}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <SharedUi.Button
                      type="button"
                      onClick={() => {
                        void handleBindAccountEmail();
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      {accountBindingSaving
                        ? tr("settings.account.binding.processing")
                        : tr("settings.account.binding.bind", {
                            channel: tr("settings.account.binding.email"),
                          })}
                    </SharedUi.Button>
                    <SharedUi.Button
                      type="button"
                      onClick={() => {
                        void handleUnbindAccountEmail();
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                    >
                      {tr("settings.account.binding.unbind")}
                    </SharedUi.Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <div className="text-xs text-text-secondary">{tr("settings.account.binding.phone")}</div>
                  <div className="mt-1 text-[11px] text-text-muted">
                    {tr("settings.account.binding.current")}{" "}
                    {accountProfile?.phone || user?.phone || tr("settings.account.binding.notBound")}
                  </div>
                  <label className="mt-2 block text-sm text-text-secondary">
                    {tr("settings.account.binding.phone")}
                    <SharedUi.Input
                      value={accountBindingDraft.phone}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      placeholder={tr("settings.account.binding.phonePlaceholder")}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <label className="mt-2 block text-sm text-text-secondary">
                    {tr("settings.account.binding.verifyCodeOptional")}
                    <SharedUi.Input
                      value={accountBindingDraft.phoneCode}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, phoneCode: event.target.value }))
                      }
                      placeholder={tr("settings.account.binding.phoneVerifyCodePlaceholder")}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <SharedUi.Button
                      type="button"
                      onClick={() => {
                        void handleBindAccountPhone();
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      {accountBindingSaving
                        ? tr("settings.account.binding.processing")
                        : tr("settings.account.binding.bind", {
                            channel: tr("settings.account.binding.phone"),
                          })}
                    </SharedUi.Button>
                    <SharedUi.Button
                      type="button"
                      onClick={() => {
                        void handleUnbindAccountPhone();
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                    >
                      {tr("settings.account.binding.unbind")}
                    </SharedUi.Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <div className="text-xs text-text-secondary">{tr("settings.account.binding.wechat")}</div>
                  <label className="mt-2 block text-sm text-text-secondary">
                    {tr("settings.account.binding.authCode")}
                    <SharedUi.Input
                      value={accountBindingDraft.wechatCode}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, wechatCode: event.target.value }))
                      }
                      placeholder={tr("settings.account.binding.wechatAuthCodePlaceholder")}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <label className="mt-2 block text-sm text-text-secondary">
                    {tr("settings.account.binding.thirdPartyUserIdOptional")}
                    <SharedUi.Input
                      value={accountBindingDraft.wechatUserId}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, wechatUserId: event.target.value }))
                      }
                      placeholder={tr("settings.account.binding.openUnionPlaceholder")}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <SharedUi.Button
                      type="button"
                      onClick={() => {
                        void handleBindAccountSocial("wechat");
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      {accountBindingSaving
                        ? tr("settings.account.binding.processing")
                        : tr("settings.account.binding.bind", {
                            channel: tr("settings.account.binding.wechat"),
                          })}
                    </SharedUi.Button>
                    <SharedUi.Button
                      type="button"
                      onClick={() => {
                        void handleUnbindAccountSocial("wechat");
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                    >
                      {tr("settings.account.binding.unbind")}
                    </SharedUi.Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <div className="text-xs text-text-secondary">{tr("settings.account.binding.qq")}</div>
                  <label className="mt-2 block text-sm text-text-secondary">
                    {tr("settings.account.binding.authCode")}
                    <SharedUi.Input
                      value={accountBindingDraft.qqCode}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, qqCode: event.target.value }))
                      }
                      placeholder={tr("settings.account.binding.qqAuthCodePlaceholder")}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <label className="mt-2 block text-sm text-text-secondary">
                    {tr("settings.account.binding.thirdPartyUserIdOptional")}
                    <SharedUi.Input
                      value={accountBindingDraft.qqUserId}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, qqUserId: event.target.value }))
                      }
                      placeholder={tr("settings.account.binding.openUnionPlaceholder")}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <SharedUi.Button
                      type="button"
                      onClick={() => {
                        void handleBindAccountSocial("qq");
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      {accountBindingSaving
                        ? tr("settings.account.binding.processing")
                        : tr("settings.account.binding.bind", {
                            channel: tr("settings.account.binding.qq"),
                          })}
                    </SharedUi.Button>
                    <SharedUi.Button
                      type="button"
                      onClick={() => {
                        void handleUnbindAccountSocial("qq");
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                    >
                      {tr("settings.account.binding.unbind")}
                    </SharedUi.Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  {tr("settings.account.addresses.title")}
                </h2>
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void reloadAccountExtendedData();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {tr("settings.account.addresses.refresh")}
                </SharedUi.Button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.addresses.contactName")}
                  <SharedUi.Input
                    value={accountAddressDraft.name}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder={tr("settings.account.addresses.contactNamePlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.addresses.phone")}
                  <SharedUi.Input
                    value={accountAddressDraft.phone}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder={tr("settings.account.addresses.phonePlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.addresses.province")}
                  <SharedUi.Input
                    value={accountAddressDraft.provinceCode}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, provinceCode: event.target.value }))
                    }
                    placeholder={tr("settings.account.addresses.provincePlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.addresses.city")}
                  <SharedUi.Input
                    value={accountAddressDraft.cityCode}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, cityCode: event.target.value }))
                    }
                    placeholder={tr("settings.account.addresses.cityPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.addresses.district")}
                  <SharedUi.Input
                    value={accountAddressDraft.districtCode}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, districtCode: event.target.value }))
                    }
                    placeholder={tr("settings.account.addresses.districtPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary md:col-span-2">
                  {tr("settings.account.addresses.detail")}
                  <SharedUi.Textarea
                    value={accountAddressDraft.addressDetail}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, addressDetail: event.target.value }))
                    }
                    rows={2}
                    placeholder={tr("settings.account.addresses.detailPlaceholder")}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary md:col-span-2">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountAddressDraft.isDefault}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, isDefault: event.target.checked }))
                    }
                  />
                  {tr("settings.account.addresses.defaultAction")}
                </label>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void handleSaveAccountAddress();
                  }}
                  disabled={accountAddressSaving}
                  className="rounded-lg border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {accountAddressSaving
                    ? tr("settings.account.addresses.submitting")
                    : editingAccountAddressId
                      ? tr("settings.account.addresses.update")
                      : tr("settings.account.addresses.add")}
                </SharedUi.Button>
                {editingAccountAddressId ? (
                  <SharedUi.Button
                    type="button"
                    onClick={resetAccountAddressDraft}
                    className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm text-text-secondary transition hover:bg-bg-hover"
                  >
                    {tr("settings.account.addresses.cancelEdit")}
                  </SharedUi.Button>
                ) : null}
              </div>
              {accountAddressLoading ? (
                <div className="mt-2 text-xs text-text-muted">
                  {tr("settings.account.addresses.loading")}
                </div>
              ) : null}
              <div className="mt-3 space-y-2">
                {accountAddresses.length === 0 ? (
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-muted">
                    {tr("settings.account.addresses.empty")}
                  </div>
                ) : accountAddresses.map((address) => (
                  <div key={address.id || `${address.name}-${address.phone}`} className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-text-primary">
                          {(address.name || "--").trim()} {(address.phone || "--").trim()}
                        </div>
                        <div className="text-xs text-text-muted">{formatAccountAddressLine(address)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {address.isDefault ? (
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-primary">
                            {tr("settings.account.addresses.defaultBadge")}
                          </span>
                        ) : null}
                        <SharedUi.Button
                          type="button"
                          onClick={() => handleEditAccountAddress(address)}
                          className="text-xs text-primary hover:underline"
                        >
                          {tr("settings.account.addresses.edit")}
                        </SharedUi.Button>
                        {!address.isDefault ? (
                          <SharedUi.Button
                            type="button"
                            onClick={() => {
                              void handleSetDefaultAccountAddress(address.id);
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            {tr("settings.account.addresses.setDefault")}
                          </SharedUi.Button>
                        ) : null}
                        <SharedUi.Button
                          type="button"
                          onClick={() => {
                            void handleDeleteAccountAddress(address.id);
                          }}
                          className="text-xs text-red-400 hover:underline"
                        >
                          {tr("settings.account.addresses.delete")}
                        </SharedUi.Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  {tr("settings.account.userSettings.title")}
                </h2>
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void reloadAccountExtendedData();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {tr("settings.account.userSettings.refresh")}
                </SharedUi.Button>
              </div>
              {accountSettingsLoading ? (
                <div className="mt-2 text-xs text-text-muted">
                  {tr("settings.account.userSettings.loading")}
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.userSettings.theme")}
                  <SharedUi.Select
                    value={accountSettingsDraft.theme}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, theme: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="system">{tr(THEME_OPTION_KEYS.system)}</option>
                    <option value="light">{tr(THEME_OPTION_KEYS.light)}</option>
                    <option value="dark">{tr(THEME_OPTION_KEYS.dark)}</option>
                  </SharedUi.Select>
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.account.userSettings.language")}
                  <SharedUi.Select
                    value={accountSettingsDraft.language}
                    onChange={(event) => handleAccountLanguageChange(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SharedUi.Select>
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.notificationSettings.system}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          system: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.notifications.system")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.notificationSettings.message}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          message: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.notifications.message")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.notificationSettings.activity}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          activity: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.notifications.activity")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.notificationSettings.promotion}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          promotion: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.notifications.promotion")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.notificationSettings.sound}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          sound: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.notifications.sound")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.notificationSettings.vibration}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          vibration: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.notifications.vibration")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.privacySettings.publicProfile}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        privacySettings: {
                          ...prev.privacySettings,
                          publicProfile: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.privacy.publicProfile")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.privacySettings.allowSearch}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        privacySettings: {
                          ...prev.privacySettings,
                          allowSearch: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.privacy.allowSearch")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.privacySettings.allowFriendRequest}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({
                        ...prev,
                        privacySettings: {
                          ...prev.privacySettings,
                          allowFriendRequest: event.target.checked,
                        },
                      }))
                    }
                  />
                  {tr("settings.account.userSettings.privacy.allowFriendRequest")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.autoPlay}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, autoPlay: event.target.checked }))
                    }
                  />
                  {tr("settings.account.userSettings.performance.autoPlay")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.highQuality}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, highQuality: event.target.checked }))
                    }
                  />
                  {tr("settings.account.userSettings.performance.highQuality")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <SharedUi.Input
                    type="checkbox"
                    checked={accountSettingsDraft.dataSaver}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, dataSaver: event.target.checked }))
                    }
                  />
                  {tr("settings.account.userSettings.performance.dataSaver")}
                </label>
              </div>

              <div className="mt-3">
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void handleSaveAccountUserSettings();
                  }}
                  disabled={accountSettingsSaving}
                  className="rounded-lg border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {accountSettingsSaving
                    ? tr("settings.account.userSettings.saving")
                    : tr("settings.account.userSettings.save")}
                </SharedUi.Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.account.activity.title")}
              </h2>
              {accountHistoryLoading ? (
                <div className="mt-2 text-xs text-text-muted">
                  {tr("settings.account.activity.loading")}
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <h3 className="text-xs font-semibold text-text-primary">
                    {tr("settings.account.activity.loginHistory")}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {accountLoginHistory.length === 0 ? (
                      <div className="text-xs text-text-muted">
                        {tr("settings.account.activity.noLoginRecords")}
                      </div>
                    ) : accountLoginHistory.map((item) => (
                      <div key={`login-${item.id}`} className="rounded border border-border px-2 py-1.5">
                        <div className="text-xs text-text-primary">{item.title}</div>
                        <div className="text-[11px] text-text-secondary">{item.timeText}</div>
                        <div className="text-[11px] text-text-muted">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <h3 className="text-xs font-semibold text-text-primary">
                    {tr("settings.account.activity.generationHistory")}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {accountGenerationHistory.length === 0 ? (
                      <div className="text-xs text-text-muted">
                        {tr("settings.account.activity.noGenerationRecords")}
                      </div>
                    ) : accountGenerationHistory.map((item) => (
                      <div key={`generation-${item.id}`} className="rounded border border-border px-2 py-1.5">
                        <div className="text-xs text-text-primary">{item.title}</div>
                        <div className="text-[11px] text-text-secondary">{item.timeText}</div>
                        <div className="text-[11px] text-text-muted">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {IS_DEV ? (
              <div className="rounded-xl border border-border bg-bg-secondary p-4">
                <h2 className="text-sm font-semibold text-text-primary">{tr("settings.development.title")}</h2>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{tr("settings.development.autoLogin")}</span>
                  <Toggle
                    checked={!devAutoLoginDisabled}
                    onChange={handleToggleDevAutoLogin}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <SharedUi.Button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
              >
                {tr("settings.account.actions.logout")}
              </SharedUi.Button>
            </div>
          </div>
        ) : null}

        {activeTab === "imconfig" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.imconfig.title")}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  {tr("settings.imconfig.websocket")}
                  <SharedUi.Input
                    value={imDraft.wsUrl}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, wsUrl: event.target.value }))
                    }
                    placeholder={tr("settings.imconfig.websocketPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.imconfig.httpApi")}
                  <SharedUi.Input
                    value={imDraft.serverUrl}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, serverUrl: event.target.value }))
                    }
                    placeholder={tr("settings.imconfig.httpApiPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.imconfig.deviceId")}
                  <SharedUi.Input
                    value={imDraft.deviceId}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, deviceId: event.target.value }))
                    }
                    placeholder={tr("settings.imconfig.deviceIdPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.imconfig.deviceType")}
                  <SharedUi.Select
                    value={imDraft.deviceFlag}
                    onChange={(event) =>
                      setImDraft((prev) => ({
                        ...prev,
                        deviceFlag: event.target.value as DeviceFlag,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="PC">{tr("settings.imconfig.deviceTypeOptions.PC")}</option>
                    <option value="WEB">{tr("settings.imconfig.deviceTypeOptions.WEB")}</option>
                    <option value="DESKTOP">{tr("settings.imconfig.deviceTypeOptions.DESKTOP")}</option>
                  </SharedUi.Select>
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.imconfig.uid")}
                  <SharedUi.Input
                    value={imDraft.uid}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, uid: event.target.value }))
                    }
                    placeholder={tr("settings.imconfig.uidPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.imconfig.token")}
                  <SharedUi.Input
                    value={imDraft.token}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, token: event.target.value }))
                    }
                    placeholder={tr("settings.imconfig.tokenPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-muted">
                <p
                  className="text-xs text-text-muted"
                >
                  {tr("settings.imconfig.savedUid", {
                    value: imDraft.uid || tr("settings.imconfig.notConfigured"),
                  })}
                </p>
                <p
                  className="text-xs text-text-muted"
                >
                  {tr("settings.imconfig.savedToken", {
                    value: imDraft.token
                      ? tr("settings.imconfig.tokenConfigured")
                      : tr("settings.imconfig.tokenNotConfigured"),
                  })}
                </p>
              </div>
            </div>

              <div className="flex items-center gap-3">
                <SharedUi.Button
                  type="button"
                  onClick={handleSaveIMConfig}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110"
                >
                {tr("settings.imconfig.save")}
                </SharedUi.Button>
              </div>
          </div>
        ) : null}

        {activeTab === "installer" ? (
          <SdkworkOpenclawPcInstaller />
        ) : null}

        {activeTab === "desktop" ? (
          <SdkworkOpenclawPcDesktop />
        ) : null}

        {activeTab === "openclawSettings" ? (
          <SdkworkOpenclawPcSettings />
        ) : null}

        {activeTab === "general" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.general.appearance.title")}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  {tr("settings.general.appearance.theme")}
                  <SharedUi.Select
                    value={settings.theme}
                    onChange={(event) => {
                      const next = event.target.value as SettingsState["theme"];
                      setSettings((prev) => ({ ...prev, theme: next }));
                      if (isUITheme(next)) {
                        setTheme(next);
                      }
                    }}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="light">{tr(THEME_OPTION_KEYS.light)}</option>
                    <option value="dark">{tr(THEME_OPTION_KEYS.dark)}</option>
                    <option value="blue">{tr(THEME_OPTION_KEYS.blue)}</option>
                    <option value="purple">{tr(THEME_OPTION_KEYS.purple)}</option>
                    <option value="system">{tr(THEME_OPTION_KEYS.system)}</option>
                  </SharedUi.Select>
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.general.appearance.fontSize")}
                  <SharedUi.Select
                    value={settings.preferences.fontSize}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          fontSize: event.target.value as SettingsState["preferences"]["fontSize"],
                        },
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="small">{tr(FONT_SIZE_OPTION_KEYS.small)}</option>
                    <option value="medium">{tr(FONT_SIZE_OPTION_KEYS.medium)}</option>
                    <option value="large">{tr(FONT_SIZE_OPTION_KEYS.large)}</option>
                  </SharedUi.Select>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.general.preferences.title")}
              </h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.general.preferences.compactMode")}
                  </span>
                  <Toggle
                    checked={settings.preferences.compactMode}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: { ...prev.preferences, compactMode: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.general.preferences.autoDownloadImages")}
                  </span>
                  <Toggle
                    checked={settings.preferences.autoDownload.images}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          autoDownload: { ...prev.preferences.autoDownload, images: value },
                        },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.general.preferences.autoDownloadVideos")}
                  </span>
                  <Toggle
                    checked={settings.preferences.autoDownload.videos}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          autoDownload: { ...prev.preferences.autoDownload, videos: value },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "notifications" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.notifications.title")}
              </h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.notifications.messagePreview")}
                  </span>
                  <Toggle
                    checked={settings.notifications.messagePreview}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, messagePreview: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.notifications.messageSound")}
                  </span>
                  <Toggle
                    checked={settings.notifications.messageSound}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, messageSound: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.notifications.doNotDisturb")}
                  </span>
                  <Toggle
                    checked={settings.notifications.doNotDisturb}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, doNotDisturb: value },
                      }))
                    }
                  />
                </div>
              </div>
              {settings.notifications.doNotDisturb ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-sm text-text-secondary">
                    {tr("settings.notifications.dndStart")}
                    <SharedUi.Input
                      type="time"
                      value={settings.notifications.doNotDisturbStart}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            doNotDisturbStart: event.target.value,
                          },
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                    />
                  </label>
                <label className="text-sm text-text-secondary">
                    {tr("settings.notifications.dndEnd")}
                    <SharedUi.Input
                      type="time"
                      value={settings.notifications.doNotDisturbEnd}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            doNotDisturbEnd: event.target.value,
                          },
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "privacy" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.privacy.title")}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  {tr("settings.privacy.onlineStatus")}
                  <SharedUi.Select
                    value={settings.privacy.onlineStatus}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          onlineStatus: event.target.value as SettingsState["privacy"]["onlineStatus"],
                        },
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="everyone">
                      {tr("settings.privacy.visibility.everyone")}
                    </option>
                    <option value="contacts">
                      {tr("settings.privacy.visibility.contacts")}
                    </option>
                    <option value="nobody">
                      {tr("settings.privacy.visibility.nobody")}
                    </option>
                  </SharedUi.Select>
                </label>
                <label className="text-sm text-text-secondary">
                  {tr("settings.privacy.phoneVisibility")}
                  <SharedUi.Select
                    value={settings.privacy.phoneNumber}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          phoneNumber: event.target.value as SettingsState["privacy"]["phoneNumber"],
                        },
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="everyone">{tr("settings.privacy.visibility.everyone")}</option>
                    <option value="contacts">{tr("settings.privacy.visibility.contactsOnly")}</option>
                    <option value="nobody">{tr("settings.privacy.visibility.nobody")}</option>
                  </SharedUi.Select>
                </label>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.privacy.allowSearchByPhone")}
                  </span>
                  <Toggle
                    checked={settings.privacy.addByPhone}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, addByPhone: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.privacy.allowSearchByUsername")}
                  </span>
                  <Toggle
                    checked={settings.privacy.addByUsername}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, addByUsername: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {tr("settings.privacy.readReceipts")}
                  </span>
                  <Toggle
                    checked={settings.privacy.readReceipts}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, readReceipts: value },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "about" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.about.application.title")}
              </h2>
              <div className="mt-3 space-y-2 text-sm text-text-secondary">
                <p>
                  {tr("settings.about.application.version", { value: appInfo.version })}
                </p>
                <p>
                  {tr("settings.about.application.build", { value: appInfo.buildNumber })}
                </p>
                <p>
                  {tr("settings.about.application.platform", { value: appInfo.platform })}
                </p>
                <p>
                  {tr("settings.about.application.status", {
                    status: appInfo.updateAvailable
                      ? tr("settings.about.application.status.updateAvailable")
                      : tr("settings.about.application.status.upToDate"),
                  })}
                </p>
              </div>
              <div className="mt-4">
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void handleCheckUpdate();
                  }}
                  disabled={isCheckingUpdate}
                  className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                >
                  {isCheckingUpdate
                    ? tr("settings.about.application.checking")
                    : tr("settings.about.application.checkUpdates")}
                </SharedUi.Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {tr("settings.about.feedback.title")}
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                {tr("settings.about.feedback.description")}
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  {tr("settings.about.feedback.type")}
                  <SharedUi.Select
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="suggestion">{tr("settings.about.feedback.types.suggestion")}</option>
                    <option value="bug">{tr("settings.about.feedback.types.bug")}</option>
                    <option value="experience">
                      {tr("settings.about.feedback.types.experience")}
                    </option>
                    <option value="other">{tr("settings.about.feedback.types.other")}</option>
                  </SharedUi.Select>
                </label>

                <label className="text-sm text-text-secondary">
                  {tr("settings.about.feedback.contact")}
                  <SharedUi.Input
                    value={feedbackContact}
                    onChange={(event) => setFeedbackContact(event.target.value)}
                    placeholder={tr("settings.about.feedback.contactPlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>

              <label className="mt-3 block text-sm text-text-secondary">
                {tr("settings.about.feedback.content")}
                <SharedUi.Textarea
                  value={feedbackContent}
                  onChange={(event) => setFeedbackContent(event.target.value)}
                  placeholder={tr("settings.about.feedback.contentPlaceholder")}
                  className="mt-1 min-h-[120px] w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
              </label>

              <div className="mt-3 flex items-center gap-3">
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void handleSubmitFeedback();
                  }}
                  disabled={feedbackSubmitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {feedbackSubmitting
                    ? tr("settings.about.feedback.submitting")
                    : tr("settings.about.feedback.submit")}
                </SharedUi.Button>
                {feedbackMessage ? (
                  <p className="text-sm text-text-secondary">{feedbackMessage}</p>
                ) : null}
              </div>

              <div className="mt-4 rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-muted">
                <p>
                  {tr("settings.about.feedback.supportEmail", {
                    value: feedbackSupport.email || "-",
                  })}
                </p>
                <p>
                  {tr("settings.about.feedback.supportHotline", {
                    value: feedbackSupport.hotline || "-",
                  })}
                </p>
                <p>
                  {tr("settings.about.feedback.supportHours", {
                    value: feedbackSupport.workingHours || "-",
                  })}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          {showSettingsSave ? (
            <SharedUi.Button
              type="button"
              onClick={() => {
                void handleSaveSettings();
              }}
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {isSaving ? tr("settings.actions.saving") : tr("settings.actions.saveSettings")}
            </SharedUi.Button>
          ) : null}
          {saveMessage ? <p className="text-sm text-text-secondary">{saveMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
