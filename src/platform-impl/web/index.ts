

import type { PlatformAPI, FileFilter } from '../../platform';


function generateDeviceId(): string {
  return 'web_' + Math.random().toString(36).substring(2, 15);
}


export function createWebPlatform(): PlatformAPI {
  let deviceId: string | null = null;

  return {
    
    getPlatform(): 'web' | 'desktop' {
      return 'web';
    },
    
    async getDeviceId(): Promise<string> {
      if (!deviceId) {
        deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
          deviceId = generateDeviceId();
          localStorage.setItem('device_id', deviceId);
        }
      }
      return deviceId;
    },
    
    
    async setStorage(key: string, value: string): Promise<void> {
      localStorage.setItem(key, value);
    },
    
    async getStorage(key: string): Promise<string | null> {
      return localStorage.getItem(key);
    },
    
    async removeStorage(key: string): Promise<void> {
      localStorage.removeItem(key);
    },
    
    
    async copy(text: string): Promise<void> {
      await navigator.clipboard.writeText(text);
    },
    
    async readClipboard(): Promise<string> {
      return await navigator.clipboard.readText();
    },
    
    
    async openExternal(url: string): Promise<void> {
      window.open(url, '_blank');
    },
    
    
    async selectFile(options?: { multiple?: boolean; filters?: FileFilter[] }): Promise<string[]> {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options?.multiple ?? false;
        
        if (options?.filters) {
          const accept = options.filters
            .flatMap(f => f.extensions.map(e => `.${e}`))
            .join(',');
          input.accept = accept;
        }
        
        input.onchange = () => {
          const files = Array.from(input.files || []);
          const paths = files.map(f => f.name);
          resolve(paths);
        };
        
        input.click();
      });
    },
    
    async saveFile(data: Blob, filename: string): Promise<void> {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    
    async readFile(_path: string): Promise<string> {
      throw new Error('Web platform does not support readFile. Use selectFile instead.');
    },
    
    async writeFile(_path: string, _content: string): Promise<void> {
      throw new Error('Web platform does not support writeFile. Use saveFile instead.');
    },
    
    
    async minimizeWindow(): Promise<void> {
      console.warn('Web platform does not support window controls');
    },
    
    async maximizeWindow(): Promise<void> {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    },

    async restoreWindow(): Promise<void> {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    },

    async isWindowMaximized(): Promise<boolean> {
      return Boolean(document.fullscreenElement);
    },

    async subscribeWindowMaximized(
      callback: (isMaximized: boolean) => void,
    ): Promise<() => void> {
      const emit = () => {
        callback(Boolean(document.fullscreenElement));
      };

      emit();
      document.addEventListener("fullscreenchange", emit);

      return () => {
        document.removeEventListener("fullscreenchange", emit);
      };
    },
    
    async closeWindow(): Promise<void> {
      window.close();
    },
    
    async setFullscreen(fullscreen: boolean): Promise<void> {
      if (fullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    },
    
    
    async createPty(_id: string, _shell?: string): Promise<void> {
      console.warn('Web platform does not support PTY');
    },
    
    async writePty(_id: string, _data: string): Promise<void> {
      console.warn('Web platform does not support PTY');
    },
    
    async resizePty(_id: string, _cols: number, _rows: number): Promise<void> {
      console.warn('Web platform does not support PTY');
    },
    
    async destroyPty(_id: string): Promise<void> {
      console.warn('Web platform does not support PTY');
    },
    
    onPtyData(_id: string, _callback: (data: string) => void): () => void {
      console.warn('Web platform does not support PTY');
      return () => {};
    },
    
    
    async showNotification(options: { title: string; body: string; icon?: string }): Promise<void> {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: options.icon,
          });
        }
      }
    },
    
    
    isOnline(): boolean {
      return navigator.onLine;
    },
    
    onNetworkChange(callback: (online: boolean) => void): () => void {
      const handleOnline = () => callback(true);
      const handleOffline = () => callback(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    },
  };
}

export default createWebPlatform;
