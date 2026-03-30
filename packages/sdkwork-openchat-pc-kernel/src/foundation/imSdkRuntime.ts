import {
  createClient,
  type SdkworkBackendClient,
  type SdkworkBackendConfig,
} from "../im-sdk/backend-sdk";
import type {
  OpenChatBackendClientLike,
  OpenChatConnectionState,
  OpenChatImSdk,
  OpenChatRealtimeSession,
} from "../im-sdk/composed-sdk";
import { OpenChatImSdk as OpenChatImSdkClient } from "../im-sdk/composed-sdk";
import { OpenChatWukongimAdapter } from "../im-sdk/wukongim-adapter";

export interface PcImSdkRuntimeConfig {
  baseUrl: string;
  timeout: number;
  apiKey?: string;
  accessToken?: string;
  tenantId?: string;
  organizationId?: string;
  platform?: string;
}

export interface PcImSessionIdentity {
  userId: string;
  username: string;
  displayName: string;
  authToken: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface PcImSdkSessionOptions {
  bootstrapRealtime?: boolean;
  realtimeSession?: OpenChatRealtimeSession;
}

let appImClient: SdkworkBackendClient | null = null;
let appImSdk: OpenChatImSdk | null = null;
let appImConfig: SdkworkBackendConfig | null = null;
let appImRuntimeConfig: PcImSdkRuntimeConfig | null = null;
let appImSessionIdentity: PcImSessionIdentity | null = null;
let appImConnectionState: OpenChatConnectionState = "idle";
let appImConnectionStateUnsubscribe: (() => void) | null = null;

const connectionStateListeners = new Set<(state: OpenChatConnectionState) => void>();

function readEnv(name: string): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const value = env?.[name];
  const processEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  const processValue = processEnv?.[name];
  const isVitestRuntime =
    Boolean(processEnv?.VITEST || processEnv?.NODE_ENV === "test");

  if (isVitestRuntime && processValue !== undefined) {
    return processValue;
  }

  return value ?? processValue;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeAuthToken(value?: string): string {
  const token = (value || "").trim();
  if (!token) {
    return "";
  }
  return token.replace(/^Bearer\s+/i, "").trim();
}

function emitConnectionState(state: OpenChatConnectionState): void {
  appImConnectionState = state;
  for (const listener of connectionStateListeners) {
    listener(state);
  }
}

function cloneSessionIdentity(session: PcImSessionIdentity): PcImSessionIdentity {
  return {
    userId: session.userId,
    username: session.username,
    displayName: session.displayName,
    authToken: session.authToken,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

export function createPcImSdkRuntimeConfig(
  overrides: Partial<PcImSdkRuntimeConfig> = {},
): PcImSdkRuntimeConfig {
  const baseUrl = trimTrailingSlash(
    (
      overrides.baseUrl ||
      readEnv("VITE_API_BASE_URL") ||
      readEnv("VITE_APP_API_BASE_URL") ||
      "http://localhost:3000"
    ).trim(),
  );
  const timeoutRaw = overrides.timeout ?? Number.parseInt(readEnv("VITE_TIMEOUT") || "", 10);
  const timeout = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 30000;
  const accessToken = (overrides.accessToken || readEnv("VITE_ACCESS_TOKEN") || "").trim();

  return {
    baseUrl,
    timeout,
    ...(overrides.apiKey ? { apiKey: overrides.apiKey } : {}),
    ...(accessToken ? { accessToken } : {}),
    ...(overrides.tenantId ? { tenantId: overrides.tenantId } : {}),
    ...(overrides.organizationId ? { organizationId: overrides.organizationId } : {}),
    ...(overrides.platform ? { platform: overrides.platform } : {}),
  };
}

export function createPcImSdkClientConfig(
  overrides: Partial<SdkworkBackendConfig> = {},
): SdkworkBackendConfig {
  const runtime = createPcImSdkRuntimeConfig({
    baseUrl: overrides.baseUrl,
    timeout: overrides.timeout,
    apiKey: overrides.apiKey,
    accessToken: overrides.accessToken,
    tenantId: overrides.tenantId,
    organizationId: overrides.organizationId,
    platform: overrides.platform,
  });

  appImRuntimeConfig = runtime;

  return {
    baseUrl: runtime.baseUrl,
    timeout: runtime.timeout,
    apiKey: runtime.apiKey,
    accessToken: runtime.accessToken,
    tenantId: runtime.tenantId,
    organizationId: runtime.organizationId,
    platform: runtime.platform,
    authToken: overrides.authToken,
    tokenManager: overrides.tokenManager,
    authMode: overrides.authMode,
    headers: overrides.headers,
  };
}

export function initPcImSdkClient(
  overrides: Partial<SdkworkBackendConfig> = {},
): SdkworkBackendClient {
  appImConfig = createPcImSdkClientConfig(overrides);
  appImClient = createClient(appImConfig);
  return appImClient;
}

export function getPcImSdkClient(): SdkworkBackendClient {
  if (!appImClient) {
    return initPcImSdkClient();
  }
  return appImClient;
}

export function getPcImSdkClientConfig(): SdkworkBackendConfig | null {
  return appImConfig;
}

export function getPcImSdkRuntimeConfig(): PcImSdkRuntimeConfig {
  if (!appImRuntimeConfig) {
    appImRuntimeConfig = createPcImSdkRuntimeConfig();
  }
  return appImRuntimeConfig;
}

function bindConnectionState(runtime: OpenChatImSdk): void {
  appImConnectionStateUnsubscribe?.();
  appImConnectionStateUnsubscribe = runtime.realtime.onConnectionStateChange((state) => {
    emitConnectionState(state as OpenChatConnectionState);
  });
}

export function initPcImSdk(
  overrides: Partial<SdkworkBackendConfig> = {},
): OpenChatImSdk {
  const backendClient = initPcImSdkClient(overrides) as unknown as OpenChatBackendClientLike;
  appImSdk = new OpenChatImSdkClient({
    backendClient,
    realtimeAdapter: new OpenChatWukongimAdapter(),
  });
  bindConnectionState(appImSdk);
  emitConnectionState("idle");
  return appImSdk;
}

export function getPcImSdk(): OpenChatImSdk {
  if (!appImSdk) {
    return initPcImSdk();
  }
  return appImSdk;
}

export function getPcImSessionIdentity(): PcImSessionIdentity | null {
  return appImSessionIdentity ? cloneSessionIdentity(appImSessionIdentity) : null;
}

export function getPcImSdkConnectionState(): OpenChatConnectionState {
  return appImConnectionState;
}

export function subscribePcImSdkConnectionState(
  listener: (state: OpenChatConnectionState) => void,
): () => void {
  connectionStateListeners.add(listener);
  listener(appImConnectionState);
  return () => {
    connectionStateListeners.delete(listener);
  };
}

export async function syncPcImSdkSession(
  session: PcImSessionIdentity,
  options: PcImSdkSessionOptions = {},
): Promise<PcImSessionIdentity> {
  const normalizedAuthToken = normalizeAuthToken(session.authToken);
  if (!normalizedAuthToken) {
    throw new Error("IM auth token is required");
  }

  const runtimeAccessToken = (createPcImSdkRuntimeConfig().accessToken || "").trim();
  const accessToken = (session.accessToken || runtimeAccessToken || "").trim() || undefined;

  const normalizedSession: PcImSessionIdentity = {
    userId: (session.userId || "").trim(),
    username: (session.username || "").trim(),
    displayName: (session.displayName || "").trim(),
    authToken: normalizedAuthToken,
    ...(accessToken ? { accessToken } : {}),
    ...(session.refreshToken ? { refreshToken: session.refreshToken.trim() } : {}),
  };

  appImSessionIdentity = normalizedSession;

  const backendClient = getPcImSdkClient();
  backendClient.setAuthToken(normalizedAuthToken);
  backendClient.setAccessToken(accessToken || normalizedAuthToken);

  const runtime = getPcImSdk();
  runtime.session.setAuthToken?.(normalizedAuthToken);
  runtime.session.setAccessToken(normalizedAuthToken);

  if (accessToken && accessToken !== normalizedAuthToken) {
    backendClient.setAccessToken(accessToken);
  }

  if (options.bootstrapRealtime !== false) {
    try {
      await runtime.session.connectRealtime(options.realtimeSession);
    } catch (error) {
      emitConnectionState("error");
      throw error;
    }
  }

  return cloneSessionIdentity(normalizedSession);
}

export async function clearPcImSdkSession(): Promise<void> {
  const runtime = appImSdk;
  if (runtime) {
    try {
      await runtime.session.disconnectRealtime();
    } catch {
      // Keep local cleanup authoritative even if realtime teardown fails.
    }
  }

  appImSessionIdentity = null;
  resetPcImSdkRuntime();
}

export function resetPcImSdkRuntime(): void {
  appImConnectionStateUnsubscribe?.();
  appImConnectionStateUnsubscribe = null;
  appImClient = null;
  appImSdk = null;
  appImConfig = null;
  appImRuntimeConfig = null;
  appImSessionIdentity = null;
  emitConnectionState("idle");
}
