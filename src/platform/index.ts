


export interface PlatformAPI {
  
  
  getPlatform(): 'web' | 'desktop';
  
  
  getDeviceId(): Promise<string>;
  
  
  
  setStorage(key: string, value: string): Promise<void>;
  
  
  getStorage(key: string): Promise<string | null>;
  
  
  removeStorage(key: string): Promise<void>;
  
  
  
  copy(text: string): Promise<void>;
  
  
  readClipboard(): Promise<string>;
  
  
  
  openExternal(url: string): Promise<void>;
  
  
  
  selectFile(options?: { multiple?: boolean; filters?: FileFilter[] }): Promise<string[]>;
  
  
  saveFile(data: Blob, filename: string): Promise<void>;
  
  
  readFile(path: string): Promise<string>;
  
  
  writeFile(path: string, content: string): Promise<void>;
  
  
  
  minimizeWindow(): Promise<void>;
  
  
  maximizeWindow(): Promise<void>;


  restoreWindow(): Promise<void>;


  isWindowMaximized(): Promise<boolean>;


  subscribeWindowMaximized(
    callback: (isMaximized: boolean) => void,
  ): Promise<() => void | Promise<void>>;
  
  
  closeWindow(): Promise<void>;
  
  
  setFullscreen(fullscreen: boolean): Promise<void>;
  
  
  
  createPty(id: string, shell?: string): Promise<void>;
  
  
  writePty(id: string, data: string): Promise<void>;
  
  
  resizePty(id: string, cols: number, rows: number): Promise<void>;
  
  
  destroyPty(id: string): Promise<void>;
  
  
  onPtyData(id: string, callback: (data: string) => void): () => void;
  
  
  
  showNotification(options: { title: string; body: string; icon?: string }): Promise<void>;
  
  
  
  isOnline(): boolean;
  
  
  onNetworkChange(callback: (online: boolean) => void): () => void;
}


export interface FileFilter {
  name: string;
  extensions: string[];
}


let platformInstance: PlatformAPI | null = null;


export function initializePlatform(instance: PlatformAPI): void {
  platformInstance = instance;
}


export function getPlatform(): PlatformAPI {
  if (!platformInstance) {
    throw new Error('Platform not initialized. Call initializePlatform() first.');
  }
  return platformInstance;
}


export function isDesktop(): boolean {
  return getPlatform().getPlatform() === 'desktop';
}


export function isWeb(): boolean {
  return getPlatform().getPlatform() === 'web';
}

export default getPlatform;
