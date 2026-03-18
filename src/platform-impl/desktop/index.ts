

import { invoke } from '@tauri-apps/api/tauri';
import type { PlatformAPI, FileFilter } from '../../platform';


export class DesktopPlatform implements PlatformAPI {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  getPlatform(): 'desktop' {
    return 'desktop';
  }

  async getDeviceId(): Promise<string> {
    const { platform } = await import('@tauri-apps/api/os');
    const platformName = await platform();
    return `desktop-${platformName}-${Date.now()}`;
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
    const { writeText } = await import('@tauri-apps/api/clipboard');
    await writeText(text);
  }

  async readClipboard(): Promise<string> {
    const { readText } = await import('@tauri-apps/api/clipboard');
    const text = await readText();
    return text || '';
  }


  async openExternal(url: string): Promise<void> {
    const { open } = await import('@tauri-apps/api/shell');
    await open(url);
  }

  async showNotification(options: { title: string; body: string; icon?: string }): Promise<void> {
    const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/api/notification');
    
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (permissionGranted) {
      sendNotification({
        title: options.title,
        body: options.body,
        icon: options.icon,
      });
    }
  }


  async selectFile(options?: { multiple?: boolean; filters?: FileFilter[] }): Promise<string[]> {
    const { open } = await import('@tauri-apps/api/dialog');
    const selected = await open({
      multiple: options?.multiple,
      filters: options?.filters,
    });
    
    if (selected === null) {
      return [];
    }
    
    return Array.isArray(selected) ? selected : [selected];
  }

  async saveFile(data: Blob, filename: string): Promise<void> {
    const { save } = await import('@tauri-apps/api/dialog');
    const { writeBinaryFile } = await import('@tauri-apps/api/fs');
    
    const filePath = await save({
      defaultPath: filename,
    });
    
    if (filePath) {
      const arrayBuffer = await data.arrayBuffer();
      await writeBinaryFile(filePath, new Uint8Array(arrayBuffer));
    }
  }

  async readFile(path: string): Promise<string> {
    const { readTextFile } = await import('@tauri-apps/api/fs');
    return readTextFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const { writeTextFile } = await import('@tauri-apps/api/fs');
    await writeTextFile(path, content);
  }


  async minimizeWindow(): Promise<void> {
    await invoke('minimize_window');
  }

  async maximizeWindow(): Promise<void> {
    await invoke('maximize_window');
  }

  async closeWindow(): Promise<void> {
    await invoke('close_window');
  }

  async setFullscreen(fullscreen: boolean): Promise<void> {
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.setFullscreen(fullscreen);
  }


  async createPty(id: string, shell?: string): Promise<void> {
    await invoke('create_pty', { id, shell });
  }

  async writePty(id: string, data: string): Promise<void> {
    await invoke('write_pty', { id, data });
  }

  async resizePty(id: string, cols: number, rows: number): Promise<void> {
    await invoke('resize_pty', { id, cols, rows });
  }

  async destroyPty(id: string): Promise<void> {
    await invoke('destroy_pty', { id });
  }

  onPtyData(id: string, _callback: (data: string) => void): () => void {
    console.log('Listening PTY data for:', id);
    return () => {};
  }


  isOnline(): boolean {
    return navigator.onLine;
  }

  onNetworkChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
