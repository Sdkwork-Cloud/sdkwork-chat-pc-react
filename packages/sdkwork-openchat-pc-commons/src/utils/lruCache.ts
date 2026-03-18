

interface CacheEntry<V> {
  value: V;
  size: number;
  lastAccessed: number;
}

interface LRUCacheOptions {
  maxSize?: number;        
  maxBytes?: number;       
  ttl?: number;            
}


export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private currentSize = 0;
  private currentBytes = 0;
  private options: Required<LRUCacheOptions>;

  constructor(options: LRUCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      maxBytes: options.maxBytes ?? 50 * 1024 * 1024, // 50MB
      ttl: options.ttl ?? 0, 
  }

  
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

      const now = Date.now();
      if (now - entry.lastAccessed > this.options.ttl) {
        this.delete(key);
        return undefined;
      }
    }

    entry.lastAccessed = Date.now();
    
    this.cache.set(key, entry);

    return entry.value;
  }

  
  set(key: K, value: V, size?: number): boolean {
    const entrySize = size ?? this.estimateSize(value);

      return false;
    }

      this.delete(key);
    }

    while (
      this.currentSize >= this.options.maxSize ||
      this.currentBytes + entrySize > this.options.maxBytes
    ) {
      this.evictLRU();
    }

      value,
      size: entrySize,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.currentSize++;
    this.currentBytes += entrySize;

    return true;
  }

  
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.currentSize--;
    this.currentBytes -= entry.size;

    return true;
  }

  
  has(key: K): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

      const now = Date.now();
      if (now - entry.lastAccessed > this.options.ttl) {
        this.delete(key);
        return false;
      }
    }

    return true;
  }

  
  getOrSet(key: K, factory: () => V, size?: number): V {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();
    this.set(key, value, size);
    return value;
  }

  
  async getOrSetAsync(key: K, factory: () => Promise<V>, size?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, size);
    return value;
  }

  
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.delete(firstKey);
    }
  }

  
  purgeStale(): number {
    if (this.options.ttl <= 0) {
      return 0;
    }

    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > this.options.ttl) {
        this.delete(key);
        purged++;
      }
    }

    return purged;
  }

  
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.currentBytes = 0;
  }

  
  getStats() {
    return {
      size: this.currentSize,
      bytes: this.currentBytes,
      maxSize: this.options.maxSize,
      maxBytes: this.options.maxBytes,
      utilization: this.currentSize / this.options.maxSize,
      byteUtilization: this.currentBytes / this.options.maxBytes,
    };
  }

  
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  
  values(): V[] {
    return Array.from(this.cache.values()).map((entry) => entry.value);
  }

  
  entries(): [K, V][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  
  forEach(callback: (value: V, key: K) => void): void {
    this.cache.forEach((entry, key) => {
      callback(entry.value, key);
    });
  }

  
  private estimateSize(value: V): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const type = typeof value;

    switch (type) {
      case 'boolean':
        return 4;
      case 'number':
        return 8;
      case 'string':
        return (value as string).length * 2;
      case 'object':
        if (value instanceof ArrayBuffer) {
          return value.byteLength;
        }
        if (value instanceof Blob) {
          return value.size;
        }
        return JSON.stringify(value).length * 2;
      default:
        return 0;
    }
  }
}


export function createNamespacedCache<V>(
  _namespace: string,
  options: LRUCacheOptions = {}
): LRUCache<string, V> {
  return new LRUCache<string, V>(options);
}

const globalCaches = new Map<string, LRUCache<string, unknown>>();


export function getGlobalCache<V>(name: string, options?: LRUCacheOptions): LRUCache<string, V> {
  if (!globalCaches.has(name)) {
    globalCaches.set(name, new LRUCache<string, V>(options));
  }
  return globalCaches.get(name) as LRUCache<string, V>;
}


export function clearAllGlobalCaches(): void {
  globalCaches.forEach((cache) => cache.clear());
}


export function getAllCacheStats(): Record<string, ReturnType<LRUCache<string, unknown>['getStats']>> {
  const stats: Record<string, ReturnType<LRUCache<string, unknown>['getStats']>> = {};
  globalCaches.forEach((cache, name) => {
    stats[name] = cache.getStats();
  });
  return stats;
}

