import type { LanguagePreference } from "@sdkwork/openchat-pc-core";
import { APP_NAME, APP_VERSION } from "../env";
import { initializePlatform } from "../../platform";
import { createDesktopPlatform } from "../../platform-impl/desktop";
import { DESKTOP_COMMANDS } from "./catalog";
import {
  getDesktopDeviceId,
  getDesktopWindow as getRuntimeDesktopWindow,
  invokeDesktopCommand,
  isTauriRuntime,
  runDesktopOrFallback,
  waitForTauriRuntime,
} from "./runtime";

let desktopBridgeConfigured = false;

interface TauriRuntimeWaitOptions {
  timeoutMs?: number;
  pollMs?: number;
}

interface DesktopFileDialogOptions {
  multiple?: boolean;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

export interface DesktopAppInfo {
  platform: "desktop";
  deviceId: string;
  name: string;
  version: string;
  tauri: boolean;
}

type WindowUnsubscribe = () => void | Promise<void>;

export { getDesktopDeviceId, isTauriRuntime, waitForTauriRuntime };

function normalizeDialogPaths(selected: string | string[] | null) {
  if (selected === null) {
    return [];
  }

  return Array.isArray(selected) ? selected : [selected];
}

async function selectFilesInBrowser(options?: DesktopFileDialogOptions): Promise<string[]> {
  if (typeof document === "undefined") {
    return [];
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = options?.multiple ?? false;

    if (options?.filters?.length) {
      const accept = options.filters
        .flatMap((filter) =>
          filter.extensions.map((extension) =>
            extension.startsWith(".") ? extension : `.${extension}`,
          ),
        )
        .join(",");
      if (accept) {
        input.accept = accept;
      }
    }

    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      resolve(files.map((file) => file.name));
    };

    input.click();
  });
}

async function saveFileInBrowser(data: Blob, filename: string): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function readTextFileInBrowser(): Promise<string> {
  throw new Error("Web platform does not support readFile. Use selectFile instead.");
}

async function writeTextFileInBrowser(): Promise<void> {
  throw new Error("Web platform does not support writeFile. Use saveFile instead.");
}

async function showNotificationInBrowser(options: DesktopNotificationOptions): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    new Notification(options.title, {
      body: options.body,
      icon: options.icon,
    });
  }
}

export function configureDesktopPlatformBridge() {
  if (desktopBridgeConfigured) {
    return;
  }

  initializePlatform(createDesktopPlatform());
  desktopBridgeConfigured = true;
}

export async function getDesktopWindow(options?: TauriRuntimeWaitOptions) {
  return getRuntimeDesktopWindow(options);
}

export async function getAppInfo(options?: TauriRuntimeWaitOptions): Promise<DesktopAppInfo | null> {
  return runDesktopOrFallback(
    "app.getInfo",
    async () => {
      if (!(await waitForTauriRuntime(options))) {
        return null;
      }

      const [{ getName, getVersion }, deviceId] = await Promise.all([
        import("@tauri-apps/api/app"),
        getDesktopDeviceId(),
      ]);
      const [name, version] = await Promise.all([
        getName().catch(() => APP_NAME),
        getVersion().catch(() => APP_VERSION),
      ]);

      return {
        platform: "desktop",
        deviceId,
        name,
        version,
        tauri: true,
      };
    },
    async () => null,
  );
}

export async function setAppLanguage(languagePreference: LanguagePreference): Promise<void> {
  await runDesktopOrFallback(
    "app.setLanguage",
    () =>
      invokeDesktopCommand<void>(
        DESKTOP_COMMANDS.setAppLanguage,
        { language: languagePreference },
        { operation: "app.setLanguage" },
      ),
    async () => {},
  );
}

async function withDesktopWindow(
  operation: string,
  callback: (desktopWindow: NonNullable<Awaited<ReturnType<typeof getDesktopWindow>>>) => Promise<void>,
) {
  return runDesktopOrFallback(
    operation,
    async () => {
      const desktopWindow = await getDesktopWindow();
      if (!desktopWindow) {
        return;
      }

      await callback(desktopWindow);
    },
    async () => {},
  );
}

export async function copyText(text: string): Promise<void> {
  await runDesktopOrFallback(
    "shell.copyText",
    async () => {
      const { writeText } = await import("@tauri-apps/api/clipboard");
      await writeText(text);
    },
    async () => {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    },
  );
}

export async function readClipboardText(): Promise<string> {
  return runDesktopOrFallback(
    "shell.readClipboardText",
    async () => {
      const { readText } = await import("@tauri-apps/api/clipboard");
      return (await readText()) || "";
    },
    async () => {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        return navigator.clipboard.readText();
      }

      return "";
    },
  );
}

export async function openExternalUrl(url: string): Promise<void> {
  await runDesktopOrFallback(
    "shell.openExternalUrl",
    async () => {
      const { open } = await import("@tauri-apps/api/shell");
      await open(url);
    },
    async () => {
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
    },
  );
}

export async function showDesktopNotification(
  options: DesktopNotificationOptions,
): Promise<void> {
  await runDesktopOrFallback(
    "shell.showNotification",
    async () => {
      const { isPermissionGranted, requestPermission, sendNotification } = await import(
        "@tauri-apps/api/notification"
      );

      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }

      if (permissionGranted) {
        await sendNotification({
          title: options.title,
          body: options.body,
          icon: options.icon,
        });
      }
    },
    async () => {
      await showNotificationInBrowser(options);
    },
  );
}

export async function selectDesktopFiles(
  options?: DesktopFileDialogOptions,
): Promise<string[]> {
  return runDesktopOrFallback(
    "shell.selectFiles",
    async () => {
      const { open } = await import("@tauri-apps/api/dialog");
      const selected = await open({
        multiple: options?.multiple,
        filters: options?.filters,
      });

      return normalizeDialogPaths(selected);
    },
    () => selectFilesInBrowser(options),
  );
}

export async function saveDesktopFile(data: Blob, filename: string): Promise<void> {
  await runDesktopOrFallback(
    "shell.saveFile",
    async () => {
      const { save } = await import("@tauri-apps/api/dialog");
      const { writeBinaryFile } = await import("@tauri-apps/api/fs");

      const filePath = await save({
        defaultPath: filename,
      });

      if (!filePath) {
        return;
      }

      const arrayBuffer = await data.arrayBuffer();
      await writeBinaryFile(filePath, new Uint8Array(arrayBuffer));
    },
    () => saveFileInBrowser(data, filename),
  );
}

export async function readDesktopTextFile(path: string): Promise<string> {
  return runDesktopOrFallback(
    "filesystem.readTextFile",
    async () => {
      const { readTextFile } = await import("@tauri-apps/api/fs");
      return readTextFile(path);
    },
    () => readTextFileInBrowser(),
  );
}

export async function writeDesktopTextFile(path: string, content: string): Promise<void> {
  await runDesktopOrFallback(
    "filesystem.writeTextFile",
    async () => {
      const { writeTextFile } = await import("@tauri-apps/api/fs");
      await writeTextFile(path, content);
    },
    () => writeTextFileInBrowser(),
  );
}

export async function minimizeWindow(): Promise<void> {
  await withDesktopWindow("shell.minimizeWindow", (desktopWindow) => desktopWindow.minimize());
}

export async function maximizeWindow(): Promise<void> {
  await withDesktopWindow("shell.maximizeWindow", async (desktopWindow) => {
    if (await desktopWindow.isFullscreen()) {
      await desktopWindow.setFullscreen(false);
    }

    await desktopWindow.maximize();
  });
}

export async function restoreWindow(): Promise<void> {
  await withDesktopWindow("shell.restoreWindow", async (desktopWindow) => {
    const [isFullscreen, isMaximized, isMinimized, isVisible] = await Promise.all([
      desktopWindow.isFullscreen(),
      desktopWindow.isMaximized(),
      desktopWindow.isMinimized(),
      desktopWindow.isVisible(),
    ]);

    if (!isVisible) {
      await desktopWindow.show();
    }

    if (isFullscreen) {
      await desktopWindow.setFullscreen(false);
    }

    if (isMinimized) {
      await desktopWindow.unminimize();
    }

    if (isMaximized) {
      await desktopWindow.unmaximize();
    }

    if (isFullscreen || isMinimized || !isVisible) {
      await desktopWindow.setFocus().catch(() => {
        // Focus is best-effort when restoring the desktop shell.
      });
    }
  });
}

export async function setDesktopFullscreen(fullscreen: boolean): Promise<void> {
  await runDesktopOrFallback(
    "shell.setFullscreen",
    async () => {
      const desktopWindow = await getDesktopWindow();
      if (!desktopWindow) {
        return;
      }

      await desktopWindow.setFullscreen(fullscreen);
    },
    async () => {
      if (typeof document === "undefined") {
        return;
      }

      if (fullscreen) {
        await document.documentElement.requestFullscreen?.();
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    },
  );
}

export async function isWindowMaximized(): Promise<boolean> {
  return runDesktopOrFallback(
    "shell.isWindowMaximized",
    async () => {
      const desktopWindow = await getDesktopWindow();
      if (!desktopWindow) {
        return false;
      }

      const [isFullscreen, isMaximized] = await Promise.all([
        desktopWindow.isFullscreen(),
        desktopWindow.isMaximized(),
      ]);

      return isFullscreen || isMaximized;
    },
    async () => false,
  );
}

export async function subscribeWindowMaximized(
  listener: (isMaximized: boolean) => void,
): Promise<WindowUnsubscribe> {
  return runDesktopOrFallback(
    "shell.subscribeWindowMaximized",
    async () => {
      const desktopWindow = await getDesktopWindow();
      if (!desktopWindow) {
        return () => {};
      }

      let active = true;

      const emitWindowState = async () => {
        if (!active) {
          return;
        }

        listener(await isWindowMaximized());
      };

      await emitWindowState();

      const unlistenResize = await desktopWindow.onResized(() => {
        void emitWindowState();
      });

      const unlistenMove = await desktopWindow.onMoved(() => {
        void emitWindowState();
      });

      return async () => {
        active = false;
        await Promise.all([unlistenResize(), unlistenMove()]);
      };
    },
    async () => () => {},
  );
}

export async function closeWindow(): Promise<void> {
  await withDesktopWindow("shell.closeWindow", (desktopWindow) => desktopWindow.hide());
}

export async function createDesktopPty(id: string, shell?: string): Promise<void> {
  await runDesktopOrFallback(
    "pty.create",
    () =>
      invokeDesktopCommand<void>(
        DESKTOP_COMMANDS.createPty,
        { id, shell },
        { operation: "pty.create" },
      ),
    async () => {},
  );
}

export async function writeDesktopPty(id: string, data: string): Promise<void> {
  await runDesktopOrFallback(
    "pty.write",
    () =>
      invokeDesktopCommand<void>(
        DESKTOP_COMMANDS.writePty,
        { id, data },
        { operation: "pty.write" },
      ),
    async () => {},
  );
}

export async function resizeDesktopPty(id: string, cols: number, rows: number): Promise<void> {
  await runDesktopOrFallback(
    "pty.resize",
    () =>
      invokeDesktopCommand<void>(
        DESKTOP_COMMANDS.resizePty,
        { id, cols, rows },
        { operation: "pty.resize" },
      ),
    async () => {},
  );
}

export async function destroyDesktopPty(id: string): Promise<void> {
  await runDesktopOrFallback(
    "pty.destroy",
    () =>
      invokeDesktopCommand<void>(
        DESKTOP_COMMANDS.destroyPty,
        { id },
        { operation: "pty.destroy" },
      ),
    async () => {},
  );
}

export const desktopTemplateApi = {
  app: {
    getInfo: getAppInfo,
    setLanguage: setAppLanguage,
    getDeviceId: getDesktopDeviceId,
  },
  meta: {
    isTauriRuntime,
    getDesktopWindow,
  },
  shell: {
    copyText,
    readClipboardText,
    openExternalUrl,
    showDesktopNotification,
    selectDesktopFiles,
    saveDesktopFile,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    setDesktopFullscreen,
    isWindowMaximized,
    subscribeWindowMaximized,
    closeWindow,
  },
  filesystem: {
    readDesktopTextFile,
    writeDesktopTextFile,
  },
  terminal: {
    createDesktopPty,
    writeDesktopPty,
    resizeDesktopPty,
    destroyDesktopPty,
  },
};
