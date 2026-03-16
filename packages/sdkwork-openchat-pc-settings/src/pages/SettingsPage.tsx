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

const settingTabItems: Array<{ id: SettingTab; label: string }> = [
  { id: "account", label: "Account" },
  { id: "imconfig", label: "IM Config" },
  { id: "installer", label: "Installer" },
  { id: "desktop", label: "Desktop" },
  { id: "openclawSettings", label: "OpenClaw Config" },
  { id: "general", label: "General" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "about", label: "About" },
];

const settingTabSet = new Set<SettingTab>(settingTabItems.map((item) => item.id));

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
    <button
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
    </button>
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

function formatDateTime(value: unknown): string {
  const raw = safeText(value);
  if (!raw) {
    return "--";
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  return parsed.toLocaleString();
}

function pickHistoryTime(item: Record<string, unknown>): string {
  return safeText(item.createdAt) || safeText(item.updatedAt) || safeText(item.timestamp) || safeText(item.time);
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
      timeText: formatDateTime(pickHistoryTime(item)),
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

  const tabs = useMemo<Array<{ id: SettingTab; label: string }>>(() => settingTabItems, []);

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
          setAccountLoginHistory(mapAccountHistoryRows(loginResult.value.content, "Login"));
        } else {
          console.warn("Failed to load account login history from SDK.", loginResult.reason);
        }

        if (generationResult.status === "fulfilled") {
          setAccountGenerationHistory(mapAccountHistoryRows(generationResult.value.content, "Generation"));
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
  }, [activeTab]);

  const handleSelectTab = (tab: SettingTab) => {
    setActiveTab(tab);
  };

  const showSettingsSave =
    activeTab === "general" || activeTab === "notifications" || activeTab === "privacy";

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const result = await SettingsResultService.updateSettings(settings);
      if (!result.success) {
        setSaveMessage(result.error || result.message || "Save failed. Local changes are still in memory.");
        return;
      }

      if (result.data) {
        setSettings(result.data);
      }
      setSaveMessage("Settings saved.");
    } catch (error) {
      console.error("Failed to save settings.", error);
      setSaveMessage("Save failed. Local changes are still in memory.");
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
    setSaveMessage("IM config saved to local profile.");
  };

  const handleToggleDevAutoLogin = (enabled: boolean) => {
    if (enabled) {
      localStorage.removeItem(DEV_AUTO_LOGIN_KEY);
      setDevAutoLoginDisabled(false);
      setSaveMessage("Dev auto-login enabled.");
      return;
    }

    localStorage.setItem(DEV_AUTO_LOGIN_KEY, "true");
    setDevAutoLoginDisabled(true);
    setSaveMessage("Dev auto-login disabled.");
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const next = await SettingsResultService.checkForUpdates();
      if (!next.success || !next.data) {
        setSaveMessage(next.error || next.message || "Update check failed.");
        return;
      }

      setAppInfo((prev) => ({ ...prev, ...next.data }));
      setSaveMessage(next.data.updateAvailable ? "New version detected." : "You are up to date.");
    } catch (error) {
      console.error("Failed to check updates.", error);
      setSaveMessage("Update check failed.");
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
      setSaveMessage("Profile updated.");
    } catch (error) {
      console.error("Failed to update account profile.", error);
      setSaveMessage(error instanceof Error ? error.message : "Profile update failed.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleChangeAccountPassword = async () => {
    if (!passwordDraft.oldPassword || !passwordDraft.newPassword || !passwordDraft.confirmPassword) {
      setSaveMessage("Please complete all password fields.");
      return;
    }
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setSaveMessage("New password and confirmation do not match.");
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
      setSaveMessage("Password changed.");
    } catch (error) {
      console.error("Failed to change account password.", error);
      setSaveMessage(error instanceof Error ? error.message : "Password change failed.");
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
      setSaveMessage("Please enter email.");
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
      setSaveMessage("Email bound.");
    } catch (error) {
      console.error("Failed to bind account email.", error);
      setSaveMessage(error instanceof Error ? error.message : "Email bind failed.");
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
      setSaveMessage("Email unbound.");
    } catch (error) {
      console.error("Failed to unbind account email.", error);
      setSaveMessage(error instanceof Error ? error.message : "Email unbind failed.");
    } finally {
      setAccountBindingSaving(false);
    }
  };

  const handleBindAccountPhone = async () => {
    const phone = accountBindingDraft.phone.trim();
    if (!phone) {
      setSaveMessage("Please enter phone.");
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
      setSaveMessage("Phone bound.");
    } catch (error) {
      console.error("Failed to bind account phone.", error);
      setSaveMessage(error instanceof Error ? error.message : "Phone bind failed.");
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
      setSaveMessage("Phone unbound.");
    } catch (error) {
      console.error("Failed to unbind account phone.", error);
      setSaveMessage(error instanceof Error ? error.message : "Phone unbind failed.");
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
    if (!code && !thirdPartyUserId) {
      setSaveMessage(`Please enter ${platform.toUpperCase()} code or user ID.`);
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
      setSaveMessage(`${platform.toUpperCase()} account bound.`);
    } catch (error) {
      console.error(`Failed to bind ${platform} account.`, error);
      setSaveMessage(error instanceof Error ? error.message : `${platform.toUpperCase()} bind failed.`);
    } finally {
      setAccountBindingSaving(false);
    }
  };

  const handleUnbindAccountSocial = async (platform: "wechat" | "qq") => {
    setAccountBindingSaving(true);
    setSaveMessage("");
    try {
      await userCenterService.unbindThirdParty(platform);
      setSaveMessage(`${platform.toUpperCase()} account unbound.`);
    } catch (error) {
      console.error(`Failed to unbind ${platform} account.`, error);
      setSaveMessage(error instanceof Error ? error.message : `${platform.toUpperCase()} unbind failed.`);
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
      setSaveMessage(error instanceof Error ? error.message : "Failed to reload account data.");
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
      setSaveMessage("Address name, phone and detail are required.");
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
      setSaveMessage(wasEditing ? "Address updated." : "Address created.");
    } catch (error) {
      console.error("Failed to save account address.", error);
      setSaveMessage(error instanceof Error ? error.message : "Address save failed.");
    } finally {
      setAccountAddressSaving(false);
    }
  };

  const handleDeleteAccountAddress = async (addressId: string | number | undefined) => {
    if (addressId === undefined || addressId === null) {
      return;
    }
    const confirmed = window.confirm("Delete this address?");
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
      setSaveMessage("Address deleted.");
    } catch (error) {
      console.error("Failed to delete account address.", error);
      setSaveMessage(error instanceof Error ? error.message : "Address delete failed.");
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
      setSaveMessage("Default address updated.");
    } catch (error) {
      console.error("Failed to set default account address.", error);
      setSaveMessage(error instanceof Error ? error.message : "Set default address failed.");
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
      setSaveMessage("User settings updated.");
    } catch (error) {
      console.error("Failed to update account user settings.", error);
      setSaveMessage(error instanceof Error ? error.message : "User settings update failed.");
    } finally {
      setAccountSettingsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          Loading settings...
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 overflow-hidden bg-bg-primary">
      <aside className="w-56 border-r border-border bg-bg-secondary p-4">
        <h1 className="px-2 text-lg font-semibold text-text-primary">Settings</h1>
        <p className="px-2 pt-1 text-xs text-text-secondary">Manage account, IM connectivity, and preferences.</p>
        <nav className="mt-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                activeTab === tab.id
                  ? "bg-primary-soft text-primary"
                  : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === "account" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Profile</h2>
              <div className="mt-3 space-y-2 text-sm text-text-secondary">
                <p>Nickname: {accountProfile?.nickname || user?.nickname || "Not set"}</p>
                <p>User ID: {accountProfile?.userId || user?.id || "-"}</p>
                <p>Email: {accountProfile?.email || user?.email || "Not bound"}</p>
                <p>Phone: {accountProfile?.phone || user?.phone || "Not bound"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Edit Profile</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Nickname
                  <input
                    value={accountDraft.nickname}
                    onChange={(event) =>
                      setAccountDraft((prev) => ({ ...prev, nickname: event.target.value }))
                    }
                    placeholder="Enter nickname"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Region
                  <input
                    value={accountDraft.region}
                    onChange={(event) =>
                      setAccountDraft((prev) => ({ ...prev, region: event.target.value }))
                    }
                    placeholder="Enter region"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary md:col-span-2">
                  Bio
                  <textarea
                    value={accountDraft.bio}
                    onChange={(event) =>
                      setAccountDraft((prev) => ({ ...prev, bio: event.target.value }))
                    }
                    placeholder="Tell others about yourself"
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveAccountProfile();
                  }}
                  disabled={accountSaving}
                  className="rounded-lg border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {accountSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Change Password</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="text-sm text-text-secondary">
                  Current Password
                  <input
                    type="password"
                    value={passwordDraft.oldPassword}
                    onChange={(event) =>
                      setPasswordDraft((prev) => ({ ...prev, oldPassword: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  New Password
                  <input
                    type="password"
                    value={passwordDraft.newPassword}
                    onChange={(event) =>
                      setPasswordDraft((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Confirm Password
                  <input
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
                <button
                  type="button"
                  onClick={() => {
                    void handleChangeAccountPassword();
                  }}
                  disabled={accountSaving}
                  className="rounded-lg border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {accountSaving ? "Submitting..." : "Update Password"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Account Binding</h2>
              <p className="mt-1 text-xs text-text-muted">
                Bind email/phone/WeChat/QQ through SDK user & bind APIs.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <div className="text-xs text-text-secondary">Email</div>
                  <div className="mt-1 text-[11px] text-text-muted">Current: {accountProfile?.email || "Not bound"}</div>
                  <label className="mt-2 block text-sm text-text-secondary">
                    Email
                    <input
                      value={accountBindingDraft.email}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="you@example.com"
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <label className="mt-2 block text-sm text-text-secondary">
                    Verify Code (optional)
                    <input
                      value={accountBindingDraft.emailCode}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, emailCode: event.target.value }))
                      }
                      placeholder="Email verify code"
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleBindAccountEmail();
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      {accountBindingSaving ? "Processing..." : "Bind Email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleUnbindAccountEmail();
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                    >
                      Unbind
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <div className="text-xs text-text-secondary">Phone</div>
                  <div className="mt-1 text-[11px] text-text-muted">Current: {accountProfile?.phone || "Not bound"}</div>
                  <label className="mt-2 block text-sm text-text-secondary">
                    Phone
                    <input
                      value={accountBindingDraft.phone}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      placeholder="Phone number"
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <label className="mt-2 block text-sm text-text-secondary">
                    Verify Code (optional)
                    <input
                      value={accountBindingDraft.phoneCode}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, phoneCode: event.target.value }))
                      }
                      placeholder="SMS verify code"
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleBindAccountPhone();
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      {accountBindingSaving ? "Processing..." : "Bind Phone"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleUnbindAccountPhone();
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                    >
                      Unbind
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <div className="text-xs text-text-secondary">WeChat</div>
                  <label className="mt-2 block text-sm text-text-secondary">
                    Auth Code
                    <input
                      value={accountBindingDraft.wechatCode}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, wechatCode: event.target.value }))
                      }
                      placeholder="WeChat auth code"
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <label className="mt-2 block text-sm text-text-secondary">
                    Third-party User ID (optional)
                    <input
                      value={accountBindingDraft.wechatUserId}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, wechatUserId: event.target.value }))
                      }
                      placeholder="openid/unionid"
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleBindAccountSocial("wechat");
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      {accountBindingSaving ? "Processing..." : "Bind WeChat"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleUnbindAccountSocial("wechat");
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                    >
                      Unbind
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <div className="text-xs text-text-secondary">QQ</div>
                  <label className="mt-2 block text-sm text-text-secondary">
                    Auth Code
                    <input
                      value={accountBindingDraft.qqCode}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, qqCode: event.target.value }))
                      }
                      placeholder="QQ auth code"
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <label className="mt-2 block text-sm text-text-secondary">
                    Third-party User ID (optional)
                    <input
                      value={accountBindingDraft.qqUserId}
                      onChange={(event) =>
                        setAccountBindingDraft((prev) => ({ ...prev, qqUserId: event.target.value }))
                      }
                      placeholder="openid/unionid"
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleBindAccountSocial("qq");
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      {accountBindingSaving ? "Processing..." : "Bind QQ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleUnbindAccountSocial("qq");
                      }}
                      disabled={accountBindingSaving}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                    >
                      Unbind
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">Addresses</h2>
                <button
                  type="button"
                  onClick={() => {
                    void reloadAccountExtendedData();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Contact Name
                  <input
                    value={accountAddressDraft.name}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Receiver name"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Phone
                  <input
                    value={accountAddressDraft.phone}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="Receiver phone"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Province
                  <input
                    value={accountAddressDraft.provinceCode}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, provinceCode: event.target.value }))
                    }
                    placeholder="Province"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  City
                  <input
                    value={accountAddressDraft.cityCode}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, cityCode: event.target.value }))
                    }
                    placeholder="City"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  District
                  <input
                    value={accountAddressDraft.districtCode}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, districtCode: event.target.value }))
                    }
                    placeholder="District"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary md:col-span-2">
                  Address Detail
                  <textarea
                    value={accountAddressDraft.addressDetail}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, addressDetail: event.target.value }))
                    }
                    rows={2}
                    placeholder="Street / building / room"
                    className="mt-1 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary md:col-span-2">
                  <input
                    type="checkbox"
                    checked={accountAddressDraft.isDefault}
                    onChange={(event) =>
                      setAccountAddressDraft((prev) => ({ ...prev, isDefault: event.target.checked }))
                    }
                  />
                  Set as default
                </label>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveAccountAddress();
                  }}
                  disabled={accountAddressSaving}
                  className="rounded-lg border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {accountAddressSaving ? "Submitting..." : editingAccountAddressId ? "Update Address" : "Add Address"}
                </button>
                {editingAccountAddressId ? (
                  <button
                    type="button"
                    onClick={resetAccountAddressDraft}
                    className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm text-text-secondary transition hover:bg-bg-hover"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
              {accountAddressLoading ? (
                <div className="mt-2 text-xs text-text-muted">Loading addresses...</div>
              ) : null}
              <div className="mt-3 space-y-2">
                {accountAddresses.length === 0 ? (
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-muted">
                    No saved addresses.
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
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-primary">Default</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleEditAccountAddress(address)}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                        {!address.isDefault ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleSetDefaultAccountAddress(address.id);
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Set Default
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteAccountAddress(address.id);
                          }}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">User Settings</h2>
                <button
                  type="button"
                  onClick={() => {
                    void reloadAccountExtendedData();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Refresh
                </button>
              </div>
              {accountSettingsLoading ? (
                <div className="mt-2 text-xs text-text-muted">Loading user settings...</div>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Theme
                  <select
                    value={accountSettingsDraft.theme}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, theme: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
                <label className="text-sm text-text-secondary">
                  Language
                  <select
                    value={accountSettingsDraft.language}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, language: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  System Notifications
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  Message Notifications
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  Activity Notifications
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  Promotion Notifications
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  Sound
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  Vibration
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  Public Profile
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  Allow Search
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
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
                  Allow Friend Request
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={accountSettingsDraft.autoPlay}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, autoPlay: event.target.checked }))
                    }
                  />
                  Auto Play
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={accountSettingsDraft.highQuality}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, highQuality: event.target.checked }))
                    }
                  />
                  High Quality
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={accountSettingsDraft.dataSaver}
                    onChange={(event) =>
                      setAccountSettingsDraft((prev) => ({ ...prev, dataSaver: event.target.checked }))
                    }
                  />
                  Data Saver
                </label>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveAccountUserSettings();
                  }}
                  disabled={accountSettingsSaving}
                  className="rounded-lg border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {accountSettingsSaving ? "Saving..." : "Save User Settings"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
              {accountHistoryLoading ? (
                <div className="mt-2 text-xs text-text-muted">Loading activity records...</div>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <h3 className="text-xs font-semibold text-text-primary">Login History</h3>
                  <div className="mt-2 space-y-2">
                    {accountLoginHistory.length === 0 ? (
                      <div className="text-xs text-text-muted">No login records.</div>
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
                  <h3 className="text-xs font-semibold text-text-primary">Generation History</h3>
                  <div className="mt-2 space-y-2">
                    {accountGenerationHistory.length === 0 ? (
                      <div className="text-xs text-text-muted">No generation records.</div>
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
                <h2 className="text-sm font-semibold text-text-primary">Development</h2>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Auto-login test account</span>
                  <Toggle
                    checked={!devAutoLoginDisabled}
                    onChange={handleToggleDevAutoLogin}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        ) : null}

        {activeTab === "imconfig" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">IM Connection Config</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  WebSocket URL
                  <input
                    value={imDraft.wsUrl}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, wsUrl: event.target.value }))
                    }
                    placeholder="ws://localhost:5200"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  HTTP API URL
                  <input
                    value={imDraft.serverUrl}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, serverUrl: event.target.value }))
                    }
                    placeholder="http://localhost:3000"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Device ID
                  <input
                    value={imDraft.deviceId}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, deviceId: event.target.value }))
                    }
                    placeholder="Optional custom device identifier"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Device Type
                  <select
                    value={imDraft.deviceFlag}
                    onChange={(event) =>
                      setImDraft((prev) => ({
                        ...prev,
                        deviceFlag: event.target.value as DeviceFlag,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="PC">PC</option>
                    <option value="WEB">WEB</option>
                    <option value="DESKTOP">DESKTOP</option>
                  </select>
                </label>
                <label className="text-sm text-text-secondary">
                  UID
                  <input
                    value={imDraft.uid}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, uid: event.target.value }))
                    }
                    placeholder="User UID for SDK auth"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Token
                  <input
                    value={imDraft.token}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, token: event.target.value }))
                    }
                    placeholder="IM token"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-muted">
                <p>Saved UID: {imDraft.uid || "-"}</p>
                <p>Saved Token: {imDraft.token ? "Configured" : "Not configured"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveIMConfig}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110"
              >
                Save IM Config
              </button>
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
              <h2 className="text-sm font-semibold text-text-primary">Appearance</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Theme
                  <select
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
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="system">System</option>
                  </select>
                </label>
                <label className="text-sm text-text-secondary">
                  Font Size
                  <select
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
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Preferences</h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Compact mode</span>
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
                  <span className="text-sm text-text-secondary">Auto-download images</span>
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
                  <span className="text-sm text-text-secondary">Auto-download videos</span>
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
              <h2 className="text-sm font-semibold text-text-primary">Message Notifications</h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Message preview</span>
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
                  <span className="text-sm text-text-secondary">Message sound</span>
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
                  <span className="text-sm text-text-secondary">Do not disturb</span>
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
                    Start
                    <input
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
                    End
                    <input
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
              <h2 className="text-sm font-semibold text-text-primary">Visibility</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Online Status
                  <select
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
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </label>
                <label className="text-sm text-text-secondary">
                  Phone Visibility
                  <select
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
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Allow search by phone</span>
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
                  <span className="text-sm text-text-secondary">Allow search by username</span>
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
                  <span className="text-sm text-text-secondary">Read receipts</span>
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
              <h2 className="text-sm font-semibold text-text-primary">Application Info</h2>
              <div className="mt-3 space-y-2 text-sm text-text-secondary">
                <p>Version: {appInfo.version}</p>
                <p>Build: {appInfo.buildNumber}</p>
                <p>Platform: {appInfo.platform}</p>
                <p>Status: {appInfo.updateAvailable ? "Update available" : "Up to date"}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    void handleCheckUpdate();
                  }}
                  disabled={isCheckingUpdate}
                  className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                >
                  {isCheckingUpdate ? "Checking..." : "Check for Updates"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Feedback</h2>
              <p className="mt-1 text-xs text-text-secondary">
                Submit product issues or suggestions. We will follow up through your contact info.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Feedback Type
                  <select
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="suggestion">Suggestion</option>
                    <option value="bug">Bug</option>
                    <option value="experience">Experience</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="text-sm text-text-secondary">
                  Contact (optional)
                  <input
                    value={feedbackContact}
                    onChange={(event) => setFeedbackContact(event.target.value)}
                    placeholder="Email / phone / IM"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>

              <label className="mt-3 block text-sm text-text-secondary">
                Content
                <textarea
                  value={feedbackContent}
                  onChange={(event) => setFeedbackContent(event.target.value)}
                  placeholder="Describe your issue or suggestion..."
                  className="mt-1 min-h-[120px] w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
              </label>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmitFeedback();
                  }}
                  disabled={feedbackSubmitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
                {feedbackMessage ? (
                  <p className="text-sm text-text-secondary">{feedbackMessage}</p>
                ) : null}
              </div>

              <div className="mt-4 rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-muted">
                <p>Support Email: {feedbackSupport.email || "-"}</p>
                <p>Hotline: {feedbackSupport.hotline || "-"}</p>
                <p>Working Hours: {feedbackSupport.workingHours || "-"}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          {showSettingsSave ? (
            <button
              type="button"
              onClick={() => {
                void handleSaveSettings();
              }}
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          ) : null}
          {saveMessage ? <p className="text-sm text-text-secondary">{saveMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
