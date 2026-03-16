import type {
  LoginForm,
  LoginVO,
  OAuthAuthUrlForm,
  OAuthLoginForm,
  OAuthUrlVO,
  PasswordResetForm,
  PasswordResetRequestForm,
  RegisterForm,
  TokenRefreshForm,
  UserInfoVO,
  UserProfileVO,
  VerifyCodeCheckForm,
  VerifyCodeSendForm,
  VerifyResultVO,
} from "@sdkwork/app-sdk";
import type { IMConfig, PasswordStrength, StoredAuthData, User } from "../entities/auth.entity";
import { destroySDK, initializeSDK, isSDKInitialized } from "./sdk-adapter";
import {
  clearAppSdkSessionTokens,
  getAppSdkClientWithSession,
  persistAppSdkSessionTokens,
  readAppSdkSessionTokens,
  resolveAppSdkAccessToken,
} from "./useAppSdkClient";

export type AppAuthVerifyType = "EMAIL" | "PHONE";
export type AppAuthScene = "LOGIN" | "REGISTER" | "RESET_PASSWORD";

export interface AppAuthLoginInput {
  username: string;
  password: string;
  remember?: boolean;
}

export interface AppAuthRegisterInput {
  username: string;
  password: string;
  confirmPassword?: string;
  email?: string;
  phone?: string;
  name?: string;
  verificationCode?: string;
}

export interface AppAuthSendVerifyCodeInput {
  target: string;
  verifyType: AppAuthVerifyType;
  scene: AppAuthScene;
}

export interface AppAuthVerifyCodeInput extends AppAuthSendVerifyCodeInput {
  code: string;
}

export interface AppAuthPasswordResetRequestInput {
  account: string;
  channel?: "EMAIL" | "SMS";
  deviceId?: string;
  locale?: string;
  redirectUri?: string;
}

export interface AppAuthPasswordResetInput {
  account: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export type AppAuthSocialProvider = "wechat" | "github" | "google" | "apple";

export interface AppAuthSocialLoginInput {
  provider: AppAuthSocialProvider;
  code?: string;
  state?: string;
  redirectUri?: string;
  scope?: string;
  deviceId?: string;
  deviceType?: "ios" | "android" | "web";
}

export interface AppAuthSession {
  userId: string;
  username: string;
  displayName: string;
  authToken: string;
  accessToken: string;
  refreshToken?: string;
}

export interface AppAuthRestoreResult {
  session: AppAuthSession;
  user: User;
  imConfig: IMConfig;
}

export interface IAppAuthService {
  login(input: AppAuthLoginInput): Promise<AppAuthSession>;
  register(input: AppAuthRegisterInput): Promise<AppAuthSession>;
  logout(): Promise<void>;
  refreshToken(refreshToken?: string): Promise<AppAuthSession>;
  sendVerifyCode(input: AppAuthSendVerifyCodeInput): Promise<void>;
  verifyCode(input: AppAuthVerifyCodeInput): Promise<boolean>;
  requestPasswordReset(input: AppAuthPasswordResetRequestInput): Promise<void>;
  resetPassword(input: AppAuthPasswordResetInput): Promise<void>;
  loginWithSocial(input: AppAuthSocialLoginInput): Promise<AppAuthSession>;
  restoreAuth(): Promise<AppAuthRestoreResult | null>;
  getCurrentSession(): Promise<AppAuthSession | null>;
}

interface ApiEnvelope<T> {
  code?: string | number;
  data?: T;
  msg?: string;
  message?: string;
}

const AUTH_STORAGE_KEY = "openchat_auth_data";
const MAX_AUTH_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MAINLAND_CHINA_PHONE_PATTERN = /^1[3-9]\d{9}$/;

function readEnv(name: string): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.[name];
}

const API_BASE_URL = (readEnv("VITE_API_BASE_URL") || readEnv("VITE_APP_API_BASE_URL") || "").trim();
const DEFAULT_HTTP_BASE = API_BASE_URL || "http://localhost:3000";

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeToken(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function resolveImTokenFromStoredData(data?: Partial<StoredAuthData> | null): string | null {
  if (!data) {
    return null;
  }

  const explicitImToken = normalizeToken(typeof data.imToken === "string" ? data.imToken : null);
  if (explicitImToken) {
    return explicitImToken;
  }

  const imConfigToken =
    data.imConfig &&
      typeof data.imConfig === "object" &&
      typeof (data.imConfig as IMConfig).token === "string"
      ? (data.imConfig as IMConfig).token
      : null;

  return normalizeToken(imConfigToken);
}

function resolveStoredAuthToken(data?: Partial<StoredAuthData> | null): string | null {
  if (!data) {
    return null;
  }

  const explicitAuthToken = normalizeToken(typeof data.authToken === "string" ? data.authToken : null);
  if (explicitAuthToken) {
    return explicitAuthToken;
  }

  const legacyToken = normalizeToken(typeof data.token === "string" ? data.token : null);
  if (!legacyToken) {
    return null;
  }

  const imToken = resolveImTokenFromStoredData(data);
  if (imToken && imToken === legacyToken) {
    return null;
  }

  return legacyToken;
}

function unwrapApiData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in (payload as ApiEnvelope<T>)) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.data !== undefined) {
      return envelope.data;
    }
  }
  return payload as T;
}

function mapScene(scene: AppAuthScene): VerifyCodeSendForm["type"] {
  if (scene === "REGISTER") return "REGISTER";
  if (scene === "RESET_PASSWORD") return "RESET_PASSWORD";
  return "LOGIN";
}

function mapVerifyType(type: AppAuthVerifyType): VerifyCodeSendForm["verifyType"] {
  return type === "EMAIL" ? "EMAIL" : "PHONE";
}

function mapPasswordResetChannel(
  channel: AppAuthPasswordResetRequestInput["channel"],
  account: string
): PasswordResetRequestForm["channel"] {
  if (channel === "EMAIL" || channel === "SMS") return channel;
  return account.includes("@") ? "EMAIL" : "SMS";
}

function mapSocialProvider(provider: AppAuthSocialProvider): OAuthAuthUrlForm["provider"] {
  if (provider === "wechat") return "WECHAT";
  if (provider === "github") return "GITHUB";
  if (provider === "google") return "GOOGLE";
  if (provider === "apple") return "APPLE";
  throw new Error(`Unsupported social provider: ${provider}`);
}

function resolveDefaultRedirectUri(): string | undefined {
  if (typeof window === "undefined" || !window.location?.origin) {
    return undefined;
  }
  return `${window.location.origin}/auth/callback`;
}

function resolveDefaultDeviceType(): OAuthLoginForm["deviceType"] {
  if (typeof navigator === "undefined") {
    return "web";
  }
  const userAgent = navigator.userAgent || "";
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  return "web";
}

async function openSocialOAuthPopup(
  authUrl: string,
  redirectUri?: string,
  timeoutMs = 120000
): Promise<{ code: string; state?: string }> {
  if (typeof window === "undefined") {
    throw new Error("Social login requires browser runtime");
  }
  const popup = window.open(
    authUrl,
    "sdkworkOAuth",
    "width=500,height=640,left=200,top=120"
  );
  if (!popup) {
    throw new Error("OAuth popup blocked");
  }

  const targetRedirectUri = redirectUri || resolveDefaultRedirectUri();
  const targetUrl = targetRedirectUri ? new URL(targetRedirectUri, window.location.origin) : undefined;

  return new Promise((resolve, reject) => {
    let timer = 0;
    let timeoutHandle = 0;
    const cleanup = () => {
      if (timer) {
        window.clearInterval(timer);
      }
      if (timeoutHandle) {
        window.clearTimeout(timeoutHandle);
      }
    };

    timer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("OAuth login cancelled"));
        return;
      }
      try {
        const currentHref = popup.location.href;
        if (!currentHref) return;
        const current = new URL(currentHref);

        if (targetUrl) {
          if (current.origin !== targetUrl.origin || current.pathname !== targetUrl.pathname) {
            return;
          }
        } else if (current.origin !== window.location.origin) {
          return;
        }

        const error = (current.searchParams.get("error") || current.searchParams.get("error_description") || "").trim();
        if (error) {
          popup.close();
          cleanup();
          reject(new Error(error));
          return;
        }

        const code = (current.searchParams.get("code") || "").trim();
        const state = (current.searchParams.get("state") || "").trim() || undefined;
        if (!code) {
          return;
        }

        popup.close();
        cleanup();
        resolve({ code, state });
      } catch {
        // Ignore cross-origin access until callback redirects to same origin.
      }
    }, 400);

    timeoutHandle = window.setTimeout(() => {
      popup.close();
      cleanup();
      reject(new Error("OAuth login timeout"));
    }, timeoutMs);
  });
}

function mapUserSessionFields(
  profile: UserInfoVO | UserProfileVO | undefined,
  usernameHint: string,
): Pick<AppAuthSession, "userId" | "username" | "displayName"> {
  const raw = (profile || {}) as Record<string, unknown>;
  const idSource = raw.id;
  const userId =
    typeof idSource === "number"
      ? String(idSource)
      : (typeof idSource === "string" ? idSource.trim() : "");
  const username =
    (typeof raw.username === "string" ? raw.username.trim() : "") ||
    usernameHint ||
    (typeof raw.email === "string" ? raw.email.trim() : "") ||
    userId;
  const displayName =
    (typeof raw.nickname === "string" ? raw.nickname.trim() : "") || username || userId;

  return {
    userId: userId || username,
    username,
    displayName: displayName || username,
  };
}

function mapUserFromSessionFields(
  fields: Pick<AppAuthSession, "userId" | "username" | "displayName">,
  profile?: UserInfoVO | UserProfileVO
): User {
  const raw = (profile || {}) as Record<string, unknown>;
  return {
    id: fields.userId,
    uid: fields.userId,
    username: fields.username,
    nickname: fields.displayName || fields.username,
    email: typeof raw.email === "string" ? raw.email : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    avatar: typeof raw.avatar === "string" ? raw.avatar : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  };
}

function resolveImConfig(
  payload: Record<string, unknown>,
  fallbackUid: string,
  fallbackToken: string,
  current?: IMConfig
): IMConfig {
  const configObject = asObject(payload.imConfig);
  if (configObject) {
    const wsUrl = readString(configObject.wsUrl);
    const uid = readString(configObject.uid) || fallbackUid;
    const token = readString(configObject.token) || fallbackToken;
    if (wsUrl && uid && token) {
      return {
        wsUrl,
        serverUrl: readString(configObject.serverUrl),
        uid,
        token,
        deviceId: readString(configObject.deviceId),
        deviceFlag: readString(configObject.deviceFlag),
      };
    }
  }

  if (current?.wsUrl && current.uid) {
    return {
      ...current,
      token: current.token || fallbackToken,
    };
  }

  return {
    wsUrl:
      readEnv("VITE_IM_WS_URL") ||
      readEnv("VITE_APP_IM_WS_URL") ||
      "ws://localhost:5200",
    serverUrl: API_BASE_URL || undefined,
    uid: fallbackUid,
    token: fallbackToken,
  };
}

function mapSessionFromLoginVO(
  loginData: LoginVO,
  userFields: Pick<AppAuthSession, "userId" | "username" | "displayName">
): AppAuthSession {
  const authToken = (((loginData as LoginVO & { authToken?: string })?.authToken) || "").trim();
  if (!authToken) {
    throw new Error("Auth token is missing");
  }
  return {
    ...userFields,
    authToken,
    accessToken: resolveAppSdkAccessToken(),
    refreshToken: (loginData.refreshToken || "").trim() || undefined,
  };
}

async function resolveProfileOrFallback(
  usernameHint: string,
  loginUserInfo?: UserInfoVO
): Promise<Pick<AppAuthSession, "userId" | "username" | "displayName">> {
  if (loginUserInfo) {
    return mapUserSessionFields(loginUserInfo, usernameHint);
  }
  try {
    const client = getAppSdkClientWithSession();
    const profileResponse = await client.user.getUserProfile();
    const profile = unwrapApiData<UserProfileVO>(profileResponse);
    return mapUserSessionFields(profile, usernameHint);
  } catch {
    return mapUserSessionFields(undefined, usernameHint);
  }
}

function loadStoredAuthData(): StoredAuthData | null {
  if (!hasLocalStorage()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredAuthData;
  } catch {
    return null;
  }
}

async function persistPcAuthSession(
  session: AppAuthSession,
  user: User,
  imConfig: IMConfig,
): Promise<void> {
  if (isSDKInitialized()) {
    destroySDK();
  }

  await initializeSDK({
    apiBaseUrl: DEFAULT_HTTP_BASE,
    imWsUrl: imConfig.wsUrl,
    uid: imConfig.uid,
    token: imConfig.token,
  });

  const imToken = normalizeToken(imConfig.token) || session.authToken;
  const stored: StoredAuthData = {
    user,
    token: session.authToken,
    authToken: session.authToken,
    accessToken: session.accessToken || undefined,
    imToken: imToken || undefined,
    refreshToken: session.refreshToken,
    imConfig: {
      ...imConfig,
      token: imToken || imConfig.token,
    },
    timestamp: Date.now(),
  };

  persistAppSdkSessionTokens({
    authToken: session.authToken,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });

  if (hasLocalStorage()) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
    if (stored.imConfig.uid) {
      localStorage.setItem("uid", stored.imConfig.uid);
    } else {
      localStorage.removeItem("uid");
    }
    if (imToken) {
      localStorage.setItem("token", imToken);
      localStorage.setItem("im_token", imToken);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("im_token");
    }
  }
}

function clearPcAuthSession(): void {
  clearAppSdkSessionTokens();
  if (!hasLocalStorage()) {
    return;
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem("uid");
  localStorage.removeItem("token");
  localStorage.removeItem("im_token");
}

export function loadAuthData(): StoredAuthData | null {
  return loadStoredAuthData();
}

export function saveAuthData(data: StoredAuthData): void {
  if (!hasLocalStorage()) {
    return;
  }

  const sessionTokens = readAppSdkSessionTokens();
  const authToken = resolveStoredAuthToken(data) || normalizeToken(sessionTokens.authToken || null);
  // Access token is bootstrap config, not auth-session payload.
  const accessToken = normalizeToken(resolveAppSdkAccessToken());
  const imToken = normalizeToken(data.imToken || data.imConfig.token) || authToken;

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      ...data,
      token: authToken || data.token,
      authToken: authToken || data.authToken,
      accessToken: accessToken || undefined,
      imToken: imToken || undefined,
      imConfig: {
        ...data.imConfig,
        token: imToken || data.imConfig.token,
      },
      timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
    }),
  );

  persistAppSdkSessionTokens({
    authToken: authToken || undefined,
    accessToken: accessToken || undefined,
    refreshToken: data.refreshToken,
  });

  if (data.imConfig.uid) {
    localStorage.setItem("uid", data.imConfig.uid);
  } else {
    localStorage.removeItem("uid");
  }

  if (imToken) {
    localStorage.setItem("token", imToken);
    localStorage.setItem("im_token", imToken);
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("im_token");
  }
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (password.length < 6) {
    errors.push("Password must be at least 6 characters.");
  }
  if (password.length >= 12) {
    score += 1;
  }
  if (password.length > 100) {
    errors.push("Password must be 100 characters or fewer.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must include a lowercase letter.");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include an uppercase letter.");
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push("Password must include a number.");
  } else {
    score += 1;
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Password must include a special character (@$!%*?&).");
  } else {
    score += 1;
  }

  if (password.length < 12) {
    suggestions.push("Use 12 or more characters for better security.");
  }
  if (!/[^A-Za-z\d@$!%*?&]/.test(password)) {
    suggestions.push("Consider adding extra symbol types.");
  }

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 4),
    errors,
    suggestions,
  };
}

export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username.trim()) {
    return { isValid: false, error: "Username is required." };
  }
  if (username.length < 3) {
    return { isValid: false, error: "Username must be at least 3 characters." };
  }
  if (username.length > 50) {
    return { isValid: false, error: "Username must be 50 characters or fewer." };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      isValid: false,
      error: "Username only supports letters, numbers, underscore, and hyphen.",
    };
  }
  return { isValid: true };
}

export function validateNickname(nickname: string): { isValid: boolean; error?: string } {
  if (!nickname.trim()) {
    return { isValid: false, error: "Nickname is required." };
  }
  if (nickname.length > 100) {
    return { isValid: false, error: "Nickname must be 100 characters or fewer." };
  }
  return { isValid: true };
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email.trim()) {
    return { isValid: false, error: "Email is required." };
  }
  if (email.length > 100) {
    return { isValid: false, error: "Email must be 100 characters or fewer." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { isValid: false, error: "Invalid email format." };
  }
  return { isValid: true };
}

export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  if (!phone.trim()) {
    return { isValid: false, error: "Phone number is required." };
  }
  if (phone.length > 20) {
    return { isValid: false, error: "Phone number must be 20 characters or fewer." };
  }
  if (!MAINLAND_CHINA_PHONE_PATTERN.test(phone)) {
    return { isValid: false, error: "Invalid phone number format." };
  }
  return { isValid: true };
}

function mapStoredSession(data: StoredAuthData, fallbackAuthToken?: string): AppAuthSession | null {
  const authToken = resolveStoredAuthToken(data) || normalizeToken(fallbackAuthToken || null);
  if (!authToken) {
    return null;
  }
  return {
    userId: data.user.id,
    username: data.user.username,
    displayName: data.user.nickname || data.user.username,
    authToken,
    accessToken: resolveAppSdkAccessToken(),
    refreshToken: data.refreshToken,
  };
}

export const appAuthService: IAppAuthService = {
  async login(input: AppAuthLoginInput): Promise<AppAuthSession> {
    const client = getAppSdkClientWithSession();
    const request: LoginForm = {
      username: input.username,
      password: input.password,
    };
    const response = await client.auth.login(request);
    const loginData = unwrapApiData<LoginVO>(response);
    const rawLoginData = unwrapApiData<Record<string, unknown>>(
      response as unknown as ApiEnvelope<Record<string, unknown>>
    );
    const userFields = await resolveProfileOrFallback(input.username, loginData.userInfo);
    const session = mapSessionFromLoginVO(loginData, userFields);
    const user = mapUserFromSessionFields(userFields, loginData.userInfo);
    const stored = loadStoredAuthData();
    const imConfig = resolveImConfig(rawLoginData, user.id, session.authToken, stored?.imConfig);

    await persistPcAuthSession(session, user, imConfig);
    return session;
  },

  async register(input: AppAuthRegisterInput): Promise<AppAuthSession> {
    const verifyCode = (input.verificationCode || "").trim();
    if (verifyCode && (input.phone || input.email)) {
      const valid = await this.verifyCode({
        target: (input.phone || input.email || "").trim(),
        verifyType: input.phone ? "PHONE" : "EMAIL",
        scene: "REGISTER",
        code: verifyCode,
      });
      if (!valid) {
        throw new Error("Verification code is invalid");
      }
    }

    const client = getAppSdkClientWithSession();
    const request: RegisterForm = {
      username: input.username,
      password: input.password,
      confirmPassword: input.confirmPassword || input.password,
      email: input.email || undefined,
      phone: input.phone || undefined,
    };
    await client.auth.register(request);

    return this.login({
      username: request.username,
      password: input.password,
    });
  },

  async logout(): Promise<void> {
    const client = getAppSdkClientWithSession();
    try {
      await client.auth.logout();
    } finally {
      destroySDK();
      clearPcAuthSession();
    }
  },

  async refreshToken(refreshToken?: string): Promise<AppAuthSession> {
    const client = getAppSdkClientWithSession();
    const stored = loadStoredAuthData();
    const sessionTokens = readAppSdkSessionTokens();
    const nextRefreshToken = (
      refreshToken ||
      stored?.refreshToken ||
      sessionTokens.refreshToken ||
      ""
    ).trim();
    if (!nextRefreshToken) {
      throw new Error("Refresh token is required");
    }

    const request: TokenRefreshForm = { refreshToken: nextRefreshToken };
    const response = await client.auth.refreshToken(request);
    const loginData = unwrapApiData<LoginVO>(response);
    const rawLoginData = unwrapApiData<Record<string, unknown>>(
      response as unknown as ApiEnvelope<Record<string, unknown>>
    );
    const currentSession = await this.getCurrentSession();
    const userFields = currentSession
      ? {
        userId: currentSession.userId,
        username: currentSession.username,
        displayName: currentSession.displayName,
      }
      : await resolveProfileOrFallback("");

    const session = mapSessionFromLoginVO(loginData, userFields);
    const nextSession: AppAuthSession = {
      ...session,
      refreshToken: session.refreshToken || nextRefreshToken,
    };
    const user = mapUserFromSessionFields(userFields, loginData.userInfo);
    const imConfig = resolveImConfig(rawLoginData, user.id, nextSession.authToken, stored?.imConfig);
    await persistPcAuthSession(nextSession, user, imConfig);
    return nextSession;
  },

  async sendVerifyCode(input: AppAuthSendVerifyCodeInput): Promise<void> {
    const client = getAppSdkClientWithSession();
    const request: VerifyCodeSendForm = {
      target: input.target.trim(),
      type: mapScene(input.scene),
      verifyType: mapVerifyType(input.verifyType),
    };
    await client.auth.sendSmsCode(request);
  },

  async verifyCode(input: AppAuthVerifyCodeInput): Promise<boolean> {
    const client = getAppSdkClientWithSession();
    const request: VerifyCodeCheckForm = {
      target: input.target.trim(),
      type: mapScene(input.scene),
      verifyType: mapVerifyType(input.verifyType),
      code: input.code.trim(),
    };
    const response = await client.auth.verifySmsCode(request);
    const data = unwrapApiData<VerifyResultVO>(response);
    return Boolean(data?.valid);
  },

  async requestPasswordReset(input: AppAuthPasswordResetRequestInput): Promise<void> {
    const client = getAppSdkClientWithSession();
    const account = (input.account || "").trim();
    if (!account) {
      throw new Error("Account is required");
    }
    const request: PasswordResetRequestForm = {
      account,
      channel: mapPasswordResetChannel(input.channel, account),
      deviceId: input.deviceId,
      locale: input.locale,
      redirectUri: input.redirectUri,
    };
    await client.auth.requestPasswordResetChallenge(request);
  },

  async resetPassword(input: AppAuthPasswordResetInput): Promise<void> {
    const client = getAppSdkClientWithSession();
    const request: PasswordResetForm = {
      account: (input.account || "").trim(),
      code: (input.code || "").trim(),
      newPassword: input.newPassword,
      confirmPassword: input.confirmPassword,
    };
    if (!request.account || !request.code || !request.newPassword || !request.confirmPassword) {
      throw new Error("Please complete all required fields");
    }
    await client.auth.resetPassword(request);
  },

  async loginWithSocial(input: AppAuthSocialLoginInput): Promise<AppAuthSession> {
    const client = getAppSdkClientWithSession();
    const provider = mapSocialProvider(input.provider);
    const redirectUri = input.redirectUri || resolveDefaultRedirectUri();
    if (!redirectUri) {
      throw new Error("Social login redirect URI is required");
    }

    let code = (input.code || "").trim();
    let state = (input.state || "").trim() || undefined;

    if (!code) {
      const oauthUrlResult = await client.auth.getOauthUrl({
        provider,
        redirectUri,
        scope: input.scope,
        state,
      });
      const oauthUrlData = unwrapApiData<OAuthUrlVO>(oauthUrlResult);
      const authUrl = (oauthUrlData?.authUrl || "").trim();
      if (!authUrl) {
        throw new Error("OAuth authorization URL is empty");
      }
      const popupResult = await openSocialOAuthPopup(authUrl, redirectUri);
      code = popupResult.code;
      state = popupResult.state || state;
    }

    const oauthLoginResult = await client.auth.oauthLogin({
      provider,
      code,
      state,
      deviceId: input.deviceId,
      deviceType: input.deviceType || resolveDefaultDeviceType(),
    });
    const loginData = unwrapApiData<LoginVO>(oauthLoginResult);
    const rawLoginData = unwrapApiData<Record<string, unknown>>(
      oauthLoginResult as unknown as ApiEnvelope<Record<string, unknown>>
    );
    const userFields = await resolveProfileOrFallback("", loginData.userInfo);
    const session = mapSessionFromLoginVO(loginData, userFields);
    const user = mapUserFromSessionFields(userFields, loginData.userInfo);
    const stored = loadStoredAuthData();
    const imConfig = resolveImConfig(rawLoginData, user.id, session.authToken, stored?.imConfig);
    await persistPcAuthSession(session, user, imConfig);
    return session;
  },

  async restoreAuth(): Promise<AppAuthRestoreResult | null> {
    const stored = loadStoredAuthData();
    if (!stored) {
      return null;
    }
    if (Date.now() - stored.timestamp > MAX_AUTH_AGE_MS) {
      clearPcAuthSession();
      return null;
    }

    const sessionTokens = readAppSdkSessionTokens();
    const session = mapStoredSession(stored, sessionTokens.authToken);
    if (!session) {
      clearPcAuthSession();
      return null;
    }

    try {
      if (isSDKInitialized()) {
        destroySDK();
      }
      await initializeSDK({
        apiBaseUrl: DEFAULT_HTTP_BASE,
        imWsUrl: stored.imConfig.wsUrl,
        uid: stored.imConfig.uid,
        token: stored.imConfig.token,
      });
      persistAppSdkSessionTokens({
        authToken: session.authToken,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      return {
        session,
        user: stored.user,
        imConfig: stored.imConfig,
      };
    } catch {
      clearPcAuthSession();
      return null;
    }
  },

  async getCurrentSession(): Promise<AppAuthSession | null> {
    const stored = loadStoredAuthData();
    if (stored) {
      const storedSession = mapStoredSession(stored, readAppSdkSessionTokens().authToken);
      if (storedSession) {
        return storedSession;
      }
    }

    const tokens = readAppSdkSessionTokens();
    const authToken = (tokens.authToken || "").trim();
    if (!authToken) {
      return null;
    }

    try {
      const client = getAppSdkClientWithSession();
      const profileResponse = await client.user.getUserProfile();
      const profile = unwrapApiData<UserProfileVO>(profileResponse);
      const userFields = mapUserSessionFields(profile, "");
      return {
        ...userFields,
        authToken,
        accessToken: resolveAppSdkAccessToken(),
        refreshToken: tokens.refreshToken,
      };
    } catch {
      return null;
    }
  },
};
