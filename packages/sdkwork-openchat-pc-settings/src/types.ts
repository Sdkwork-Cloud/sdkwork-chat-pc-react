

export type ThemeType = 'light' | 'dark' | 'blue' | 'purple' | 'green' | 'system';

export interface ThemeOption {
  key: ThemeType;
  name: string;
  description: string;
  preview: {
    bg: string;
    primary: string;
    text: string;
  };
}

export interface ModelConfig {
  id: string;
  domain: 'text' | 'image' | 'video' | 'speech' | 'music';
  name: string;
  provider: string;
  modelId: string;
  apiKey?: string;
  apiEndpoint?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  isDefault: boolean;
  isEnabled: boolean;
  customParams?: Record<string, any>;
}

export interface NotificationSettings {
  messagePreview: boolean;
  messageSound: boolean;
  messageVibration: boolean;
  groupMessage: boolean;
  groupMention: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
  doNotDisturb: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
}

export interface PrivacySettings {
  onlineStatus: 'everyone' | 'contacts' | 'nobody';
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
  phoneNumber: 'everyone' | 'contacts' | 'nobody';
  addByPhone: boolean;
  addByUsername: boolean;
  addByQRCode: boolean;
  readReceipts: boolean;
  screenshotNotification: boolean;
}

export interface UserPreferences {
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  chatBackground?: string;
  compactMode: boolean;
  autoDownload: {
    images: boolean;
    videos: boolean;
    files: boolean;
  };
  mediaQuality: 'auto' | 'high' | 'medium' | 'low';
}

export interface SettingsState {
  theme: ThemeType;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  preferences: UserPreferences;
  modelConfigs: ModelConfig[];
}

export interface StorageInfo {
  total: number;
  used: number;
  free: number;
  appUsage: number;
  cacheSize: number;
  mediaSize: number;
  documentSize: number;
}

export interface AppInfo {
  version: string;
  buildNumber: string;
  platform: string;
  electronVersion?: string;
  tauriVersion?: string;
  updateAvailable?: boolean;
  latestVersion?: string;
  releaseNotes?: string;
}

export interface FeedbackSubmitRequest {
  type: string;
  content: string;
  contact?: string;
  attachmentUrl?: string;
  screenshotUrl?: string;
}

export interface FeedbackSubmission {
  id: string;
  type: string;
  content: string;
  status: string;
  submitTime: string;
  processTime?: string;
}

export interface FeedbackSupportInfo {
  hotline?: string;
  email?: string;
  workingHours?: string;
  wechatQrcode?: string;
  onlineSupportUrl?: string;
  faqUrl?: string;
  helpCenterUrl?: string;
}

export type InstallShell = "bash" | "powershell";

export interface OpenClawInstallCommand {
  id: string;
  title: string;
  command: string;
  shell: InstallShell;
  description?: string;
}

export interface OpenClawInstallStep {
  id: string;
  title: string;
  description: string;
  commands?: OpenClawInstallCommand[];
  notes?: string[];
}

export interface OpenClawInstallCategory {
  id: string;
  label: string;
  description: string;
}

export interface OpenClawInstallMode {
  id: string;
  name: string;
  categoryId: string;
  summary: string;
  bestFor: string;
  platforms: string[];
  docsUrl: string;
  steps: OpenClawInstallStep[];
}

export interface OpenClawInstallCatalog {
  categories: OpenClawInstallCategory[];
  modes: OpenClawInstallMode[];
}

export interface OpenClawDesktopGuide {
  platform: "windows" | "macos" | "linux" | "unknown";
  recommendation: string;
  notes: string[];
  quickCommands: OpenClawInstallCommand[];
}

export interface OpenClawPostInstallProfile {
  gatewayMode: "local" | "remote";
  gatewayBind: "loopback" | "lan" | "auto";
  gatewayPort: string;
  gatewayToken: string;
  stateDir: string;
  configPath: string;
  workspaceDir: string;
  channels: {
    telegram: boolean;
    discord: boolean;
    whatsapp: boolean;
    signal: boolean;
  };
}
