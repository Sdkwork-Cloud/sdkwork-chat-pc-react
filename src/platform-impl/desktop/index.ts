import type { FileFilter, PlatformAPI } from "../../platform";
import {
  closeWindow as closeDesktopWindow,
  copyText,
  createDesktopPty,
  destroyDesktopPty,
  getDesktopDeviceId,
  isWindowMaximized as isDesktopWindowMaximized,
  maximizeWindow as maximizeDesktopWindow,
  minimizeWindow as minimizeDesktopWindow,
  openExternalUrl,
  readClipboardText,
  readDesktopTextFile,
  resizeDesktopPty,
  restoreWindow as restoreDesktopWindow,
  saveDesktopFile,
  selectDesktopFiles,
  setDesktopFullscreen,
  showDesktopNotification,
  subscribeWindowMaximized as subscribeDesktopWindowMaximized,
  writeDesktopPty,
  writeDesktopTextFile,
} from "../../app/desktop/tauriBridge";

export class DesktopPlatform implements PlatformAPI {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private deviceId: string | null = null;

  getPlatform(): "desktop" {
    return "desktop";
  }

  async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    this.deviceId = await getDesktopDeviceId();
    return this.deviceId;
  }

  async setStorage(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async getStorage(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async removeStorage(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async copy(text: string): Promise<void> {
    await copyText(text);
  }

  async readClipboard(): Promise<string> {
    return readClipboardText();
  }

  async openExternal(url: string): Promise<void> {
    await openExternalUrl(url);
  }

  async showNotification(options: { title: string; body: string; icon?: string }): Promise<void> {
    await showDesktopNotification(options);
  }

  async selectFile(options?: { multiple?: boolean; filters?: FileFilter[] }): Promise<string[]> {
    return selectDesktopFiles(options);
  }

  async saveFile(data: Blob, filename: string): Promise<void> {
    await saveDesktopFile(data, filename);
  }

  async readFile(path: string): Promise<string> {
    return readDesktopTextFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await writeDesktopTextFile(path, content);
  }

  async minimizeWindow(): Promise<void> {
    await minimizeDesktopWindow();
  }

  async maximizeWindow(): Promise<void> {
    await maximizeDesktopWindow();
  }

  async restoreWindow(): Promise<void> {
    await restoreDesktopWindow();
  }

  async isWindowMaximized(): Promise<boolean> {
    return isDesktopWindowMaximized();
  }

  async subscribeWindowMaximized(
    callback: (isMaximized: boolean) => void,
  ): Promise<() => void | Promise<void>> {
    return subscribeDesktopWindowMaximized(callback);
  }

  async closeWindow(): Promise<void> {
    await closeDesktopWindow();
  }

  async setFullscreen(fullscreen: boolean): Promise<void> {
    await setDesktopFullscreen(fullscreen);
  }

  async createPty(id: string, shell?: string): Promise<void> {
    await createDesktopPty(id, shell);
  }

  async writePty(id: string, data: string): Promise<void> {
    await writeDesktopPty(id, data);
  }

  async resizePty(id: string, cols: number, rows: number): Promise<void> {
    await resizeDesktopPty(id, cols, rows);
  }

  async destroyPty(id: string): Promise<void> {
    await destroyDesktopPty(id);
  }

  onPtyData(id: string, _callback: (data: string) => void): () => void {
    console.log("Listening PTY data for:", id);
    return () => {};
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  onNetworkChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }

  onEvent(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }
}

export function createDesktopPlatform(): PlatformAPI {
  return new DesktopPlatform();
}

export default createDesktopPlatform;
