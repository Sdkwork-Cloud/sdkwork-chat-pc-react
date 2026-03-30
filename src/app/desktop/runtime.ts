import type { DesktopCommandName, DesktopEventName } from "./catalog";

type DesktopBridgeRuntime = "desktop" | "web";
type RuntimeEventUnsubscribe = () => void | Promise<void>;

interface TauriInternalsLike {
  invoke?: unknown;
}

interface DesktopBridgeErrorOptions {
  operation: string;
  runtime: DesktopBridgeRuntime;
  command?: DesktopCommandName;
  event?: DesktopEventName;
  cause?: unknown;
}

interface TauriRuntimeWaitOptions {
  timeoutMs?: number;
  pollMs?: number;
}

const TAURI_RUNTIME_WAIT_TIMEOUT_MS = 600;
const TAURI_RUNTIME_WAIT_POLL_MS = 20;
const DESKTOP_DEVICE_ID_STORAGE_KEY = "openchat.desktop.device-id";

function formatCause(cause: unknown) {
  if (!cause) {
    return "Unknown bridge failure";
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === "string") {
    return cause;
  }

  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

function buildBridgeMessage(options: DesktopBridgeErrorOptions) {
  const scope = options.command ?? options.event ?? options.operation;
  return `${options.operation} failed for ${scope}: ${formatCause(options.cause)}`;
}

function generateDesktopDeviceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `desktop-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function readDesktopStorage(key: string) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeDesktopStorage(key: string, value: string) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

export class DesktopBridgeError extends Error {
  readonly operation: string;
  readonly runtime: DesktopBridgeRuntime;
  readonly command?: DesktopCommandName;
  readonly event?: DesktopEventName;
  readonly causeMessage: string;

  constructor(options: DesktopBridgeErrorOptions) {
    super(buildBridgeMessage(options));
    this.name = "DesktopBridgeError";
    this.operation = options.operation;
    this.runtime = options.runtime;
    this.command = options.command;
    this.event = options.event;
    this.causeMessage = formatCause(options.cause);
  }
}

export function isTauriRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const runtimeWindow = window as Window & {
    __TAURI__?: unknown;
    __TAURI_IPC__?: unknown;
    __TAURI_INTERNALS__?: TauriInternalsLike;
  };

  return Boolean(
    runtimeWindow.__TAURI__
      || runtimeWindow.__TAURI_IPC__
      || runtimeWindow.__TAURI_INTERNALS__,
  );
}

export async function waitForTauriRuntime(
  options?: TauriRuntimeWaitOptions,
): Promise<boolean> {
  if (isTauriRuntime()) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const timeoutMs = Math.max(0, options?.timeoutMs ?? TAURI_RUNTIME_WAIT_TIMEOUT_MS);
  const pollMs = Math.max(1, options?.pollMs ?? TAURI_RUNTIME_WAIT_POLL_MS);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(pollMs);
    if (isTauriRuntime()) {
      return true;
    }
  }

  return isTauriRuntime();
}

export async function getDesktopWindow(options?: TauriRuntimeWaitOptions) {
  if (!(await waitForTauriRuntime(options))) {
    return null;
  }

  const { appWindow } = await import("@tauri-apps/api/window");
  return appWindow;
}

export async function invokeDesktopCommand<T>(
  command: DesktopCommandName,
  payload?: Record<string, unknown>,
  options?: { operation?: string },
): Promise<T> {
  const operation = options?.operation ?? command;
  if (!(await waitForTauriRuntime())) {
    throw new DesktopBridgeError({
      operation,
      runtime: "web",
      command,
      cause: "Tauri runtime is unavailable.",
    });
  }

  try {
    const { invoke } = await import("@tauri-apps/api/tauri");
    return await invoke<T>(command, payload);
  } catch (cause) {
    throw new DesktopBridgeError({
      operation,
      runtime: "desktop",
      command,
      cause,
    });
  }
}

export async function listenDesktopEvent<T>(
  event: DesktopEventName,
  listener: (payload: T) => void,
  options?: { operation?: string },
): Promise<RuntimeEventUnsubscribe> {
  if (!(await waitForTauriRuntime())) {
    return () => {};
  }

  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<T>(event, (nextEvent) => {
      listener(nextEvent.payload);
    });
  } catch (cause) {
    throw new DesktopBridgeError({
      operation: options?.operation ?? event,
      runtime: "desktop",
      event,
      cause,
    });
  }
}

export async function runDesktopOrFallback<T>(
  operation: string,
  desktopCall: () => Promise<T>,
  webFallback: () => Promise<T>,
): Promise<T> {
  if (!(await waitForTauriRuntime())) {
    return webFallback();
  }

  try {
    return await desktopCall();
  } catch (cause) {
    if (cause instanceof DesktopBridgeError) {
      throw cause;
    }

    throw new DesktopBridgeError({
      operation,
      runtime: "desktop",
      cause,
    });
  }
}

export async function getDesktopDeviceId(): Promise<string> {
  const cachedDeviceId = readDesktopStorage(DESKTOP_DEVICE_ID_STORAGE_KEY);
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const { platform } = await import("@tauri-apps/api/os");
  const platformName = await platform().catch(() => "desktop");
  const nextDeviceId = `${platformName}-${generateDesktopDeviceId()}`;
  writeDesktopStorage(DESKTOP_DEVICE_ID_STORAGE_KEY, nextDeviceId);
  return nextDeviceId;
}
