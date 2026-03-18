

import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import { errorService } from './error.service';

class EventEmitter {
  private events: Map<string, Function[]>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  once(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
    return this;
  }

  off(event: string, listener: Function): this {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      for (const listener of listeners) {
        listener(...args);
      }
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  getMaxListeners(): number {
    return 0;
  }

  setMaxListeners(_n: number): this {
    return this;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  rawListeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  prependListener(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(onceListener);
    return this;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

export interface FileUploadOptions {
  chunkSize?: number;
  concurrentChunks?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onComplete?: (fileId: string, fileUrl: string) => void;
  onError?: (error: Error) => void;
}

export interface FileChunk {
  index: number;
  start: number;
  end: number;
  size: number;
  data: Blob;
}

export interface UploadSession {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  uploadUrl: string;
  progress: number;
  startTime: number;
  lastActivity: number;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  uploadTime: number;
  uploaderId?: string;
  [key: string]: any;
}

export class FileService extends EventEmitter {
  private static instance: FileService;
  private uploadSessions: Map<string, UploadSession> = new Map();
  private isInitialized = false;

  private constructor() {
    super();
  }

  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.restoreUploadSessions();
    
    this.isInitialized = true;
    console.log('[FileService] Initialized');
  }

  
  async uploadFile(file: File, options: FileUploadOptions = {}): Promise<string> {
    const {
      chunkSize = 1024 * 1024, // 1MB
      concurrentChunks = 3,
      retryAttempts = 3,
      retryDelay = 1000,
    } = options;

    try {
      const session = await this.createUploadSession(file, chunkSize);
      this.uploadSessions.set(session.id, session);
      this.saveUploadSessions();

      await this.uploadChunks(session, {
        concurrentChunks,
        retryAttempts,
        retryDelay,
        onProgress: options.onProgress,
        onChunkComplete: options.onChunkComplete,
      });

      const fileUrl = await this.completeUpload(session);
      
      this.uploadSessions.delete(session.id);
      this.saveUploadSessions();

      options.onComplete?.(session.fileId, fileUrl);
      this.emit('uploadComplete', session.fileId, fileUrl);

      return fileUrl;
    } catch (error: any) {
      options.onError?.(error);
      this.emit('uploadError', error);
      errorService.handleError(error, {
        context: 'file:upload',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  private async createUploadSession(file: File, chunkSize: number): Promise<UploadSession> {
    try {
      const response = await getAppSdkClientWithSession().upload.initChunk({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        chunkSize,
      } as any);
      const data = (response as { data?: any }).data ?? response;
      return {
        id: data.sessionId,
        fileId: data.fileId,
        fileName: file.name,
        fileSize: file.size,
        chunkSize,
        totalChunks: Math.ceil(file.size / chunkSize),
        uploadedChunks: new Set(),
        uploadUrl: data.uploadUrl,
        progress: 0,
        startTime: Date.now(),
        lastActivity: Date.now(),
      };
    } catch (error) {
      throw new Error('Failed to create upload session');
    }
  }

  
  private async uploadChunks(session: UploadSession, options: {
    concurrentChunks: number;
    retryAttempts: number;
    retryDelay: number;
    onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void;
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  }): Promise<void> {
    const chunks = this.createChunks(session);
    const uploadedChunks = session.uploadedChunks;
    const totalChunks = chunks.length;
    let uploadedBytes = Array.from(uploadedChunks).reduce((sum, index) => sum + chunks[index].size, 0);

    const pendingChunks = chunks.filter((_, index) => !uploadedChunks.has(index));

    const chunkQueue = [...pendingChunks];
    const activeUploads: Promise<void>[] = [];

    while (chunkQueue.length > 0 || activeUploads.length > 0) {
      while (activeUploads.length < options.concurrentChunks && chunkQueue.length > 0) {
        const chunk = chunkQueue.shift()!;
        const uploadPromise = this.uploadChunk(session, chunk, options.retryAttempts, options.retryDelay)
          .then(() => {
            uploadedChunks.add(chunk.index);
            uploadedBytes += chunk.size;
            const progress = Math.min((uploadedBytes / session.fileSize) * 100, 100);
            
            session.progress = progress;
            session.lastActivity = Date.now();
            this.saveUploadSessions();

            options.onProgress?.(progress, uploadedBytes, session.fileSize);
            options.onChunkComplete?.(chunk.index, totalChunks);
            this.emit('chunkUploaded', session.id, chunk.index, progress);
          })
          .finally(() => {
            const index = activeUploads.indexOf(uploadPromise);
            if (index > -1) {
              activeUploads.splice(index, 1);
            }
          });

        activeUploads.push(uploadPromise);
      }

        await Promise.race(activeUploads);
      }
    }
  }

  
  private async uploadChunk(session: UploadSession, chunk: FileChunk, retryAttempts: number, retryDelay: number): Promise<void> {
    let attempts = 0;

    while (attempts < retryAttempts) {
      try {
        const formData = new FormData();
        formData.append('sessionId', session.id);
        formData.append('chunkIndex', chunk.index.toString());
        formData.append('totalChunks', session.totalChunks.toString());
        formData.append('file', chunk.data, session.fileName);

        await getAppSdkClientWithSession().upload.chunk(formData as any);

        return;
      } catch (error) {
        attempts++;
        if (attempts >= retryAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1)));
      }
    }
  }

  
  private async completeUpload(session: UploadSession): Promise<string> {
    try {
      const response = await getAppSdkClientWithSession().upload.mergeChunks({
        sessionId: session.id,
        fileId: session.fileId,
      } as any);
      const data = (response as { data?: any }).data ?? response;
      return data.fileUrl;
    } catch (error) {
      throw new Error('Failed to complete upload');
    }
  }

  
  private createChunks(session: UploadSession): FileChunk[] {
    const chunks: FileChunk[] = [];
    const { fileSize, chunkSize } = session;

    for (let i = 0; i < session.totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const size = end - start;

      chunks.push({
        index: i,
        start,
        end,
        size,
        data: new Blob([], { type: 'application/octet-stream' }), 
    }

    return chunks;
  }

  
  pauseUpload(sessionId: string): void {
    const session = this.uploadSessions.get(sessionId);
    if (session) {
      this.emit('uploadPaused', sessionId);
    }
  }

  
  async resumeUpload(sessionId: string, options?: FileUploadOptions): Promise<void> {
    const session = this.uploadSessions.get(sessionId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    try {
      session.uploadedChunks = new Set(uploadedChunks);

      await this.uploadChunks(session, {
        concurrentChunks: options?.concurrentChunks || 3,
        retryAttempts: options?.retryAttempts || 3,
        retryDelay: options?.retryDelay || 1000,
        onProgress: options?.onProgress,
        onChunkComplete: options?.onChunkComplete,
      });

      const fileUrl = await this.completeUpload(session);
      
      this.uploadSessions.delete(session.id);
      this.saveUploadSessions();

      options?.onComplete?.(session.fileId, fileUrl);
      this.emit('uploadComplete', session.fileId, fileUrl);
    } catch (error: any) {
      options?.onError?.(error);
      this.emit('uploadError', error);
      throw error;
    }
  }

  
  private async getUploadedChunks(sessionId: string): Promise<number[]> {
    try {
      const response = await getAppSdkClientWithSession().upload.getChunkStatus({ sessionId } as any);
      const data = (response as { data?: any }).data ?? response;
      return data.chunks || [];
    } catch (error) {
      return [];
    }
  }

  
  async downloadFile(fileUrl: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(fileUrl, { method: 'GET' });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.emit('downloadComplete', fileName);
    } catch (error: any) {
      this.emit('downloadError', error);
      errorService.handleError(error, {
        context: 'file:download',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async getFileInfo(fileId: string): Promise<FileInfo> {
    try {
      const response = await getAppSdkClientWithSession().upload.getFileDetail(fileId);
      const data = (response as { data?: any }).data ?? response;
      return {
        id: data.id,
        name: data.name,
        size: data.size,
        type: data.type,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        uploadTime: data.uploadTime,
        uploaderId: data.uploaderId,
        ...data,
      };
    } catch (error: any) {
      errorService.handleError(error, {
        context: 'file:getInfo',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async deleteFile(fileId: string): Promise<void> {
    try {
      await getAppSdkClientWithSession().upload.deleteFile(fileId);

      this.emit('fileDeleted', fileId);
    } catch (error: any) {
      errorService.handleError(error, {
        context: 'file:delete',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async getFileList(options?: {
    page?: number;
    pageSize?: number;
    type?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ files: FileInfo[]; total: number }> {
    try {
      const response = await getAppSdkClientWithSession().upload.listFiles({
        page: options?.page || 1,
        pageSize: options?.pageSize || 20,
        type: options?.type,
        sortBy: options?.sortBy,
        sortOrder: options?.sortOrder,
      } as Record<string, string | number | boolean>);
      const data = (response as { data?: any }).data ?? response;
      return {
        files: data.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
          uploadTime: file.uploadTime,
          uploaderId: file.uploaderId,
          ...file,
        })),
        total: data.total,
      };
    } catch (error: any) {
      errorService.handleError(error, {
        context: 'file:getList',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  private saveUploadSessions(): void {
    try {
      const sessions = Array.from(this.uploadSessions.values()).map(session => ({
        ...session,
        uploadedChunks: Array.from(session.uploadedChunks),
      }));
      localStorage.setItem('file_upload_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to save upload sessions:', error);
    }
  }

  
  private restoreUploadSessions(): void {
    try {
      const sessionsData = localStorage.getItem('file_upload_sessions');
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        sessions.forEach((sessionData: any) => {
          const session: UploadSession = {
            ...sessionData,
            uploadedChunks: new Set(sessionData.uploadedChunks),
          };
          this.uploadSessions.set(session.id, session);
        });
      }
    } catch (error) {
      console.warn('Failed to restore upload sessions:', error);
    }
  }

  
  getUploadSession(sessionId: string): UploadSession | null {
    return this.uploadSessions.get(sessionId) || null;
  }

  
  getUploadSessions(): UploadSession[] {
    return Array.from(this.uploadSessions.values());
  }

  
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.uploadSessions) {
      if (now - session.lastActivity > 24 * 60 * 60 * 1000) { 
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.uploadSessions.delete(sessionId);
      this.emit('sessionExpired', sessionId);
    });

    if (expiredSessions.length > 0) {
      this.saveUploadSessions();
    }
  }

  
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeUploads: this.uploadSessions.size,
      totalUploads: this.uploadSessions.size,
    };
  }
}

export const fileService = FileService.getInstance();

export default FileService;

