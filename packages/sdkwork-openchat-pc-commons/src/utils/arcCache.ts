

export interface ARCCacheOptions<K, V> {
  capacity: number;
  onEvict?: (key: K, value: V) => void;
  sizeFunction?: (value: V) => number;
}

export class ARCCache<K, V> {
  private _capacity: number;
  private onEvict?: (key: K, value: V) => void;
  private sizeFunction?: (value: V) => number;
  
  private t1: Map<K, V> = new Map(); 
  private t2: Map<K, V> = new Map(); 
  private b2: Set<K> = new Set(); 
  
  private p: number = 0; 
  private n: number = 0; 
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(options: ARCCacheOptions<K, V>) {
    this._capacity = options.capacity;
    this.onEvict = options.onEvict;
    this.sizeFunction = options.sizeFunction || (() => 1);
  }

  
  get(key: K): V | undefined {
    if (this.t1.has(key)) {
      const value = this.t1.get(key)!;
      this.t1.delete(key);
      this.t2.set(key, value);
      this.hits++;
      return value;
    }

    if (this.t2.has(key)) {
      this.hits++;
      return this.t2.get(key);
    }

    return undefined;
  }

  
  set(key: K, value: V): void {
    const size = this.sizeFunction!(value);
    
      this.t1.delete(key);
    } else if (this.t2.has(key)) {
      this.t2.delete(key);
    }

    if (this.b1.has(key)) {
      const delta = Math.max(1, Math.floor(this.b1.size / this.b2.size)) || 1;
      this.p = Math.min(this.p + delta, this._capacity);
      
      
      this.b1.delete(key);
      this.t2.set(key, value);
      this.n += size;
      return;
    }

    if (this.b2.has(key)) {
      const delta = Math.max(1, Math.floor(this.b2.size / this.b1.size)) || 1;
      this.p = Math.max(this.p - delta, 0);
      
      
      this.b2.delete(key);
      this.t2.set(key, value);
      this.n += size;
      return;
    }

      if (this.t1.size < this._capacity) {
        this.b1.delete(this.getOldest(this.b1));
        this.replace();
      } else {
        const evictedKey = this.getOldest(this.t1);
        const evictedValue = this.t1.get(evictedKey)!;
        this.t1.delete(evictedKey);
        this.evict(evictedKey, evictedValue);
      }
    } else if (this.t1.size + this.t2.size + this.b1.size + this.b2.size >= this._capacity) {
        this.b1.delete(this.getOldest(this.b1));
      } else {
        this.b2.delete(this.getOldest(this.b2));
      }
      this.replace();
    }

    this.t1.set(key, value);
    this.n += size;
  }

  
  delete(key: K): boolean {
    let removed = false;
    let value: V | undefined;

    if (this.t1.has(key)) {
      value = this.t1.get(key);
      this.t1.delete(key);
      removed = true;
    } else if (this.t2.has(key)) {
      value = this.t2.get(key);
      this.t2.delete(key);
      removed = true;
    } else if (this.b1.has(key)) {
      this.b1.delete(key);
      removed = true;
    } else if (this.b2.has(key)) {
      this.b2.delete(key);
      removed = true;
    }

    if (removed && value && this.onEvict) {
      this.onEvict(key, value);
    }

    return removed;
  }

  
  clear(): void {
    if (this.onEvict) {
      for (const [key, value] of this.t1) {
        this.onEvict(key, value);
      }
      for (const [key, value] of this.t2) {
        this.onEvict(key, value);
      }
    }

    this.t1.clear();
    this.t2.clear();
    this.b1.clear();
    this.b2.clear();
    this.p = 0;
    this.n = 0;
  }

  
  has(key: K): boolean {
    return this.t1.has(key) || this.t2.has(key);
  }

  
  get size(): number {
    return this.t1.size + this.t2.size;
  }

  
  get capacity(): number {
    return this._capacity;
  }

  
  get stats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      evictions: this.evictions,
      size: this.size,
      capacity: this.capacity,
      t1Size: this.t1.size,
      t2Size: this.t2.size,
      b1Size: this.b1.size,
      b2Size: this.b2.size,
      p: this.p
    };
  }

  
  private replace(): void {
    if (this.t1.size > 0 && (this.t1.size > this.p || (this.t1.size === this.p && this.b2.has(this.getOldest(this.t1))))) {
      const evictedValue = this.t1.get(evictedKey)!;
      this.t1.delete(evictedKey);
      this.b1.add(evictedKey);
      this.evict(evictedKey, evictedValue);
    } else if (this.t2.size > 0) {
      const evictedValue = this.t2.get(evictedKey)!;
      this.t2.delete(evictedKey);
      this.b2.add(evictedKey);
      this.evict(evictedKey, evictedValue);
    }
  }

  
  private evict(key: K, value: V): void {
    this.evictions++;
    this.n -= this.sizeFunction!(value);
    if (this.onEvict) {
      this.onEvict(key, value);
    }
  }

  
  private getOldest(collection: Map<K, V> | Set<K>): K {
    const result = collection.keys().next().value;
    return result as K;
  }
}

export default ARCCache;

