import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import type {
  AppInfo,
  ModelConfig,
  NotificationSettings,
  PrivacySettings,
  SettingsState,
  StorageInfo,
  ThemeType,
} from "../types";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const SETTINGS_STORAGE_KEY = "openchat.settings.state";
const APP_INFO_STORAGE_KEY = "openchat.settings.app-info";

const DEFAULT_SETTINGS: SettingsState = {
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

const DEFAULT_APP_INFO: AppInfo = {
  version: "1.0.0",
  buildNumber: "local",
  platform: "web",
  updateAvailable: false,
};

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function unwrapData<T>(response: unknown): T {
  const object = asObject(response);
  if (object && "data" in object) {
    return (object as ApiEnvelope<T>).data as T;
  }
  return response as T;
}

function cloneSettings(settings: SettingsState): SettingsState {
  return {
    ...settings,
    notifications: { ...settings.notifications },
    privacy: { ...settings.privacy },
    preferences: {
      ...settings.preferences,
      autoDownload: { ...settings.preferences.autoDownload },
    },
    modelConfigs: settings.modelConfigs.map((config) => ({ ...config })),
  };
}

function mergeSettings(base: SettingsState, patch: Partial<SettingsState>): SettingsState {
  return {
    ...base,
    ...patch,
    notifications: {
      ...base.notifications,
      ...(patch.notifications || {}),
    },
    privacy: {
      ...base.privacy,
      ...(patch.privacy || {}),
    },
    preferences: {
      ...base.preferences,
      ...(patch.preferences || {}),
      autoDownload: {
        ...base.preferences.autoDownload,
        ...(patch.preferences?.autoDownload || {}),
      },
    },
    modelConfigs: patch.modelConfigs ? patch.modelConfigs.map((item) => ({ ...item })) : base.modelConfigs,
  };
}

function readJson<T>(key: string): T | null {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failure.
  }
}

function readLocalSettings(): SettingsState {
  const stored = readJson<Partial<SettingsState>>(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return cloneSettings(DEFAULT_SETTINGS);
  }
  return mergeSettings(cloneSettings(DEFAULT_SETTINGS), stored);
}

function writeLocalSettings(settings: SettingsState): void {
  writeJson(SETTINGS_STORAGE_KEY, settings);
}

function readLocalAppInfo(): AppInfo {
  const stored = readJson<Partial<AppInfo>>(APP_INFO_STORAGE_KEY);
  if (!stored) {
    return { ...DEFAULT_APP_INFO };
  }
  return {
    ...DEFAULT_APP_INFO,
    ...stored,
  };
}

function writeLocalAppInfo(appInfo: AppInfo): void {
  writeJson(APP_INFO_STORAGE_KEY, appInfo);
}

class SettingsServiceClass {
  async getStorageInfo(): Promise<StorageInfo> {
    const response = await getAppSdkClientWithSession().upload.getStorageUsage();
    return unwrapData<StorageInfo>(response);
  }

  async cleanCache(): Promise<void> {
    await getAppSdkClientWithSession().setting.clearCache();
  }

  async cleanAllData(): Promise<void> {
    if (hasLocalStorage()) {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem(APP_INFO_STORAGE_KEY);
    }

    await getAppSdkClientWithSession().setting.clearLocalData();
  }

  async getAppInfo(): Promise<AppInfo> {
    const response = await getAppSdkClientWithSession().setting.getAppConfig();
    const appInfo = {
      ...DEFAULT_APP_INFO,
      ...unwrapData<Partial<AppInfo>>(response),
    };
    writeLocalAppInfo(appInfo);
    return appInfo;
  }

  async checkForUpdates(): Promise<AppInfo> {
    const response = await getAppSdkClientWithSession().setting.getAppVersion();
    const remote = unwrapData<Partial<AppInfo>>(response);
    const appInfo: AppInfo = {
      ...readLocalAppInfo(),
      ...remote,
    };
    writeLocalAppInfo(appInfo);
    return appInfo;
  }

  async getSettings(): Promise<SettingsState> {
    const response = await getAppSdkClientWithSession().setting.getAllSettings();
    const remote = unwrapData<Partial<SettingsState>>(response);
    const merged = mergeSettings(cloneSettings(DEFAULT_SETTINGS), remote);
    writeLocalSettings(merged);
    return merged;
  }

  async updateSettings(settings: Partial<SettingsState>): Promise<SettingsState> {
    const current = readLocalSettings();
    const merged = mergeSettings(current, settings);
    writeLocalSettings(merged);

    const response = await getAppSdkClientWithSession().setting.updateModuleSettings("all", settings as any);
    const remote = unwrapData<Partial<SettingsState>>(response);
    const remoteMerged = mergeSettings(merged, remote);
    writeLocalSettings(remoteMerged);
    return remoteMerged;
  }

  async setTheme(theme: ThemeType): Promise<void> {
    const current = readLocalSettings();
    const next = mergeSettings(current, { theme });
    writeLocalSettings(next);

    await getAppSdkClientWithSession().setting.switchTheme({ theme } as any);
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    const current = readLocalSettings();
    const next = mergeSettings(current, {
      notifications: {
        ...current.notifications,
        ...settings,
      },
    });
    writeLocalSettings(next);

    await getAppSdkClientWithSession().notification.updateNotificationSettings(settings as any);
  }

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    const current = readLocalSettings();
    const next = mergeSettings(current, {
      privacy: {
        ...current.privacy,
        ...settings,
      },
    });
    writeLocalSettings(next);

    await getAppSdkClientWithSession().setting.updatePrivacySettings(settings as any);
  }

  async getModelConfigs(): Promise<ModelConfig[]> {
    const response = await getAppSdkClientWithSession().model.getActiveModels();
    const list = unwrapData<unknown>(response);
    if (!Array.isArray(list)) {
      return readLocalSettings().modelConfigs;
    }
    return list as ModelConfig[];
  }

  async saveModelConfig(config: ModelConfig): Promise<void> {
    const current = readLocalSettings();
    const others = current.modelConfigs.filter((item) => item.id !== config.id);
    const nextList = [...others, { ...config }];
    writeLocalSettings(mergeSettings(current, { modelConfigs: nextList }));

    await getAppSdkClientWithSession().setting.updateModuleSettings("models", { action: "save", config } as any);
  }

  async deleteModelConfig(configId: string): Promise<void> {
    const current = readLocalSettings();
    const nextList = current.modelConfigs.filter((item) => item.id !== configId);
    writeLocalSettings(mergeSettings(current, { modelConfigs: nextList }));

    await getAppSdkClientWithSession().setting.updateModuleSettings("models", { action: "delete", configId } as any);
  }

  async setDefaultModelConfig(configId: string): Promise<void> {
    const current = readLocalSettings();
    const nextList = current.modelConfigs.map((item) => ({
      ...item,
      isDefault: item.id === configId,
    }));
    writeLocalSettings(mergeSettings(current, { modelConfigs: nextList }));

    await getAppSdkClientWithSession().setting.updateModuleSettings("models", { action: "setDefault", configId } as any);
  }
}

export const SettingsService = new SettingsServiceClass();
