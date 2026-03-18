

import { ARCCache } from './arcCache';

export interface CacheLayer<K, V> {
  get(key: K): Promise<V | undefined>;
  set(key: K, value: V): Promise<void>;
  delete(key: K): Promise<boolean>;
  clear(): Promise<void>;
  has(key: K): Promise<boolean>;
  get size(): Promise<number>;
}

export interface LayeredCacheOptions<K, V> {
  layers: CacheLayer<K, V>[];
  onEvict?: (key: K, value: V) => void;
  serializer?: (value: V) => string;
  deserializer?: (data: string) => V;
}

export class MemoryCacheLayer<K, V> implements CacheLayer<K, V> {
  private cache: ARCCache<K, V>;

  constructor(capacity: number = 1000) {
    this.cache = new ARCCache({ capacity });
  }

  async get(key: K): Promise<V | undefined> {
    return this.cache.get(key);
  }

  async set(key: K, value: V): Promise<void> {
    this.cache.set(key, value);
  }

  async delete(key: K): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: K): Promise<boolean> {
    return this.cache.has(key);
  }

  get size(): Promise<number> {
    return Promise.resolve(this.cache.size);
  }

  get stats() {
    return this.cache.stats;
  }
}

export class LocalStorageCacheLayer<K, V> implements CacheLayer<K, V> {
  private prefix: string;
  private serializer: (value: V) => string;
  private deserializer: (data: string) => V;

  constructor(
    prefix: string = 'cache:',
    serializer: (value: V) => string = JSON.stringify,
    deserializer: (data: string) => V = JSON.parse
  ) {
    this.prefix = prefix;
    this.serializer = serializer;
    this.deserializer = deserializer;
  }

  private getKey(key: K): string {
    return `${this.prefix}${String(key)}`;
  }

  async get(key: K): Promise<V | undefined> {
    try {
      const stored = localStorage.getItem(this.getKey(key));
      if (stored === null) {
        return undefined;
      }
      return this.deserializer(stored);
    } catch (error) {
      console.warn('LocalStorage get error:', error);
      return undefined;
    }
  }

  async set(key: K, value: V): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), this.serializer(value));
    } catch (error) {
      console.warn('LocalStorage set error:', error);
    }
  }

  async delete(key: K): Promise<boolean> {
    try {
      const existed = await this.has(key);
      localStorage.removeItem(this.getKey(key));
      return existed;
    } catch (error) {
      console.warn('LocalStorage delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('LocalStorage clear error:', error);
    }
  }

  async has(key: K): Promise<boolean> {
    try {
      return localStorage.getItem(this.getKey(key)) !== null;
    } catch (error) {
      console.warn('LocalStorage has error:', error);
      return false;
    }
  }

  get size(): Promise<number> {
    try {
      const keys = Object.keys(localStorage);
      return Promise.resolve(keys.filter(key => key.startsWith(this.prefix)).length);
    } catch (error) {
      console.warn('LocalStorage size error:', error);
      return Promise.resolve(0);
    }
  }
}

export class LayeredCache<K, V> implements CacheLayer<K, V> {
  private layers: CacheLayer<K, V>[];
  private onEvict?: (key: K, value: V) => void;

  constructor(options: LayeredCacheOptions<K, V>) {
    this.layers = options.layers;
    this.onEvict = options.onEvict;
  }

  
  async get(key: K): Promise<V | undefined> {
    let value: V | undefined;
    let foundAt = -1;

      const layer = this.layers[i];
      value = await layer.get(key);
      
      if (value !== undefined) {
        foundAt = i;
        break;
      }
    }

      for (let i = 0; i < foundAt; i++) {
        await this.layers[i].set(key, value);
      }
    }

    return value;
  }

  
  async set(key: K, value: V): Promise<void> {
    for (const layer of this.layers) {
      await layer.set(key, value);
    }
  }

  
  async delete(key: K): Promise<boolean> {
    let deleted = false;

    for (const layer of this.layers) {
      const layerDeleted = await layer.delete(key);
      deleted = deleted || layerDeleted;
    }

    if (deleted && this.onEvict) {

    return deleted;
  }

  
  async clear(): Promise<void> {
    for (const layer of this.layers) {
      await layer.clear();
    }
  }

  
  async has(key: K): Promise<boolean> {
    for (const layer of this.layers) {
      if (await layer.has(key)) {
        return true;
      }
    }
    return false;
  }

  
  get size(): Promise<number> {
    return this.layers[0].size;
  }

  
  addLayer(layer: CacheLayer<K, V>): void {
    this.layers.push(layer);
  }

  
  removeLayer(index: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers.splice(index, 1);
    }
  }

  
  getLayer(index: number): CacheLayer<K, V> | undefined {
    return this.layers[index];
  }
}

  const memoryLayer = new MemoryCacheLayer<K, V>(capacity);
  const localStorageLayer = new LocalStorageCacheLayer<K, V>();

  return new LayeredCache({
    layers: [memoryLayer, localStorageLayer],
  });
}

export default LayeredCache;

