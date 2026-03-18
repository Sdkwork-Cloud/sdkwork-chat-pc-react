

import { getGlobalCache, clearAllGlobalCaches } from '../utils/lruCache';

class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (listeners) {
      this.events.set(event, listeners.filter(l => l !== listener));
    }
  }

  once(event: string, listener: Function): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }
}

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryUsagePercent: number;
  timestamp: number;
}

export interface CacheStats {
  name: string;
  size: number;
  maxSize: number;
  utilization: number;
  byteSize: number;
  maxByteSize: number;
  byteUtilization: number;
}

export interface MemoryOptimizationOptions {
  cacheSizeLimit?: number;
  cacheByteLimit?: number;
  memoryThreshold?: number;
  gcInterval?: number;
  leakDetectionInterval?: number;
}

export class MemoryService extends EventEmitter {
  private static instance: MemoryService;
  private isInitialized = false;
  private gcTimer: number | null = null;
  private leakDetectionTimer: number | null = null;
  private options: Required<MemoryOptimizationOptions>;
  private memoryHistory: MemoryStats[] = [];

  private constructor() {
    super();
    this.options = {
      cacheSizeLimit: 1000,
      cacheByteLimit: 50 * 1024 * 1024, // 50MB
      memoryThreshold: 80,
      gcInterval: 60 * 1000, 
      leakDetectionInterval: 5 * 60 * 1000, 
    };
  }

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  
  initialize(options?: MemoryOptimizationOptions): void {
    if (this.isInitialized) {
      return;
    }

    this.options = {
      ...this.options,
      ...options,
    };

    this.startMemoryMonitoring();
    
    
    
    this.isInitialized = true;
    console.log('[MemoryService] Initialized');
  }

  
  getMemoryStats(): MemoryStats {
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      const memory = (window as any).performance.memory;
      const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      const stats: MemoryStats = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsagePercent,
        timestamp: Date.now(),
      };

      this.memoryHistory.push(stats);
      if (this.memoryHistory.length > 100) {
        this.memoryHistory.shift();
      }

        this.emit('memoryWarning', stats);
        this.optimizeMemory();
      }

      return stats;
    }

    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      memoryUsagePercent: 0,
      timestamp: Date.now(),
    };
  }

  
  getCacheStats(): CacheStats[] {
    const caches = [
      getGlobalCache('messages'),
      getGlobalCache('users'),
      getGlobalCache('conversations'),
      getGlobalCache('files'),
      getGlobalCache('markdown'),
    ];

    return caches.map((cache, index) => {
      const stats = cache.getStats();
      return {
        name: ['messages', 'users', 'conversations', 'files', 'markdown'][index] || `cache_${index}`,
        size: stats.size,
        maxSize: stats.maxSize,
        utilization: stats.utilization,
        byteSize: stats.bytes,
        maxByteSize: stats.maxBytes,
        byteUtilization: stats.byteUtilization,
      };
    });
  }

  
  optimizeMemory(): void {
    console.log('[MemoryService] Optimizing memory usage');
    
    this.cleanupCaches();
    
    this.triggerGC();
    
    this.memoryHistory = this.memoryHistory.slice(-20);
    
    let memoryStats = this.getMemoryStatsWithoutOptimization();
    this.emit('memoryOptimized', memoryStats);
  }

  
  private getMemoryStatsWithoutOptimization(): MemoryStats {
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      const memory = (window as any).performance.memory;
      const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsagePercent,
        timestamp: Date.now(),
      };
    }

    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      memoryUsagePercent: 0,
      timestamp: Date.now(),
    };
  }

  
  cleanupCaches(): void {
    const cacheStats = this.getCacheStats();
    
    cacheStats.forEach(stats => {
      if (stats.utilization > 0.8) {
        console.log(`[MemoryService] Cleaning up cache: ${stats.name}`);
      }
    });
    
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      const memory = (window as any).performance.memory;
      const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (memoryUsagePercent > 90) {
        console.log('[MemoryService] Clearing all caches due to high memory usage');
        clearAllGlobalCaches();
      }
    }
  }

  
  triggerGC(): void {
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        console.log('[MemoryService] Garbage collection triggered');
      } catch (error) {
        console.warn('[MemoryService] Failed to trigger garbage collection:', error);
      }
    }
  }

  
  detectMemoryLeaks(): void {
    const recentStats = this.memoryHistory.slice(-5);
    
    if (recentStats.length >= 5) {
      const isIncreasing = recentStats.every((stat, index) => {
        if (index === 0) return true;
        return stat.usedJSHeapSize > recentStats[index - 1].usedJSHeapSize;
      });
      
      if (isIncreasing) {
        console.warn('[MemoryService] Possible memory leak detected - memory usage is continuously increasing');
        this.emit('memoryLeakDetected', stats);
      }
    }
  }

  
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const stats = this.getMemoryStats();
      this.emit('memoryStats', stats);
    }, 5000);
  }

  
  private startGCTimer(): void {
    this.gcTimer = window.setInterval(() => {
      this.triggerGC();
    }, this.options.gcInterval);
  }

  
  private startLeakDetection(): void {
    this.leakDetectionTimer = window.setInterval(() => {
      this.detectMemoryLeaks();
    }, this.options.leakDetectionInterval);
  }

  
  getMemoryTrend(): MemoryStats[] {
    return this.memoryHistory;
  }

  
  optimizeCacheConfig(): void {
    const memoryStats = this.getMemoryStats();
    const cacheLimit = memoryStats.memoryUsagePercent > 70 
      ? Math.floor(this.options.cacheSizeLimit * 0.7)
      : this.options.cacheSizeLimit;
    
    const byteLimit = memoryStats.memoryUsagePercent > 70
      ? Math.floor(this.options.cacheByteLimit * 0.7)
      : this.options.cacheByteLimit;

    console.log(`[MemoryService] Optimizing cache config - size: ${cacheLimit}, bytes: ${byteLimit}`);
  }

  
  cleanupResources(): void {
    
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = null;
    }
    
    clearAllGlobalCaches();
    
    
    console.log('[MemoryService] Resources cleaned up');
  }

  
  getStatus() {
    return {
      initialized: this.isInitialized,
      memoryStats: this.getMemoryStats(),
      cacheStats: this.getCacheStats(),
      memoryHistoryLength: this.memoryHistory.length,
    };
  }
}

export const memoryService = MemoryService.getInstance();


export function optimizeMemory(): void {
  memoryService.optimizeMemory();
}


export function cleanupCaches(): void {
  memoryService.cleanupCaches();
}

export default MemoryService;
