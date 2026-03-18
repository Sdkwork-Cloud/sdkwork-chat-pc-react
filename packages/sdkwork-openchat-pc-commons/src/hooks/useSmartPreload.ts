

import { useCallback, useRef, useEffect, useState } from 'react';

enum UserAction {
  NAVIGATE = 'navigate',
  HOVER = 'hover',
  SCROLL = 'scroll',
  CLICK = 'click',
  FOCUS = 'focus',
}

interface BehaviorRecord {
  action: UserAction;
  target: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

interface TransitionProbability {
  from: string;
  to: string;
  probability: number;
  count: number;
}

  threshold: number;      
  timeout: number;        
}


class MarkovChainPredictor {
  private transitions: Map<string, Map<string, number>> = new Map();
  private totalTransitions: Map<string, number> = new Map();

  
  recordTransition(from: string, to: string): void {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Map());
      this.totalTransitions.set(from, 0);
    }

    const fromMap = this.transitions.get(from)!;
    fromMap.set(to, (fromMap.get(to) || 0) + 1);
    this.totalTransitions.set(from, (this.totalTransitions.get(from) || 0) + 1);
  }

  
  predictNext(current: string, topN: number = 3): Array<{ state: string; probability: number }> {
    const fromMap = this.transitions.get(current);
    const total = this.totalTransitions.get(current) || 0;

    if (!fromMap || total === 0) {
      return [];
    }

    const probabilities: Array<{ state: string; probability: number }> = [];

    fromMap.forEach((count, state) => {
      probabilities.push({
        state,
        probability: count / total,
      });
    });

    return probabilities
      .sort((a, b) => b.probability - a.probability)
      .slice(0, topN);
  }

  
  getTransitionMatrix(): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};

    this.transitions.forEach((toMap, from) => {
      matrix[from] = {};
      const total = this.totalTransitions.get(from) || 1;
      toMap.forEach((count, to) => {
        matrix[from][to] = count / total;
      });
    });

    return matrix;
  }
}


class SmartPreloadManager {
  private predictor = new MarkovChainPredictor();
  private behaviorHistory: BehaviorRecord[] = [];
  private preloadedResources = new Set<string>();
  private loadingResources = new Map<string, AbortController>();
  private config: PreloadConfig;

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = {
      threshold: 0.3,
      maxConcurrent: 3,
      timeout: 5000,
      priority: 'auto',
      ...config,
    };
  }

  
  recordBehavior(action: UserAction, target: string, context?: Record<string, unknown>): void {
    const record: BehaviorRecord = {
      action,
      target,
      timestamp: Date.now(),
      context,
    };

    this.behaviorHistory.push(record);

      this.behaviorHistory.shift();
    }

    if (action === UserAction.NAVIGATE && this.behaviorHistory.length > 1) {
      const prevRecord = this.behaviorHistory[this.behaviorHistory.length - 2];
      if (prevRecord.action === UserAction.NAVIGATE) {
        this.predictor.recordTransition(prevRecord.target, target);
      }
    }

  }

  
  private predictAndPreload(current: string): void {
    const predictions = this.predictor.predictNext(current, 3);

    predictions.forEach(({ state, probability }) => {
      if (probability >= this.config.threshold) {
        this.preload(state, probability);
      }
    });
  }

  
  preload(url: string, priority: number = 0.5): void {
      return;
    }

    if (this.loadingResources.size >= this.config.maxConcurrent) {
      const lowestPriority = Array.from(this.loadingResources.entries())
        .sort((a, b) => (a[1] as any).priority - (b[1] as any).priority)[0];
      
      if (lowestPriority) {
        this.cancelPreload(lowestPriority[0]);
      }
    }

    const controller = new AbortController();
    this.loadingResources.set(url, controller);

      ? (priority > 0.7 ? 'high' : 'low')
      : this.config.priority;

    this.executePreload(url, controller.signal, preloadPriority)
      .then(() => {
        this.preloadedResources.add(url);
        console.log(`[SmartPreload] Preloaded: ${url}`);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.warn(`[SmartPreload] Failed to preload: ${url}`, error);
        }
      })
      .finally(() => {
        this.loadingResources.delete(url);
      });
  }

  
  private async executePreload(
    url: string,
    signal: AbortSignal,
    priority: 'high' | 'low'
  ): Promise<void> {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    
    if ('fetchPriority' in link) {
      (link as any).fetchPriority = priority;
    }

    document.head.appendChild(link);

    }, this.config.timeout);

    try {
      await fetch(url, {
        signal,
        priority: priority === 'high' ? 'high' : 'low',
      });
    } finally {
      clearTimeout(timeoutId);
      link.remove();
    }
  }

  
  cancelPreload(url: string): void {
    const controller = this.loadingResources.get(url);
    if (controller) {
      controller.abort();
      this.loadingResources.delete(url);
    }
  }

  
  preloadComponent(componentPath: string): void {
    this.preload(componentPath, 0.8);
  }

  
  preloadImage(imageUrl: string): void {
    if (this.preloadedResources.has(imageUrl)) return;

    const img = new Image();
    img.src = imageUrl;
    
    img.onload = () => {
      this.preloadedResources.add(imageUrl);
    };
  }

  
  async preloadData<T>(
    key: string,
    fetcher: () => Promise<T>,
    cache: Map<string, T>
  ): Promise<void> {
    if (cache.has(key)) return;

    try {
      const data = await fetcher();
      cache.set(key, data);
      this.preloadedResources.add(key);
    } catch (error) {
      console.warn(`[SmartPreload] Failed to preload data: ${key}`, error);
    }
  }

  
  getPredictions(current: string): Array<{ state: string; probability: number }> {
    return this.predictor.predictNext(current, 5);
  }

  
  getStats() {
    return {
      behaviorCount: this.behaviorHistory.length,
      preloadedCount: this.preloadedResources.size,
      loadingCount: this.loadingResources.size,
      transitionMatrix: this.predictor.getTransitionMatrix(),
    };
  }

  
  clear(): void {
    this.behaviorHistory = [];
    this.preloadedResources.clear();
    this.loadingResources.forEach((controller) => controller.abort());
    this.loadingResources.clear();
  }
}

let preloadManager: SmartPreloadManager | null = null;


export function getPreloadManager(): SmartPreloadManager {
  if (!preloadManager) {
    preloadManager = new SmartPreloadManager();
  }
  return preloadManager;
}


export function useSmartPreload(config?: Partial<PreloadConfig>) {
  const manager = useRef(new SmartPreloadManager(config));
  const [predictions, setPredictions] = useState<Array<{ state: string; probability: number }>>([]);

  
  const recordNavigation = useCallback((from: string, to: string) => {
    manager.current.recordBehavior(UserAction.NAVIGATE, to, { from });
    setPredictions(manager.current.getPredictions(to));
  }, []);

  
  const recordHover = useCallback((target: string) => {
    manager.current.recordBehavior(UserAction.HOVER, target);
    
    const predictions = manager.current.getPredictions(target);
    predictions.forEach(({ state, probability }) => {
      if (probability > 0.5) {
        manager.current.preloadComponent(state);
      }
    });
  }, []);

  
  const preload = useCallback((url: string, priority?: number) => {
    manager.current.preload(url, priority);
  }, []);

  
  const getStats = useCallback(() => {
    return manager.current.getStats();
  }, []);

  return {
    recordNavigation,
    recordHover,
    preload,
    predictions,
    getStats,
  };
}


export function useRoutePreload() {
  const { recordNavigation, recordHover, predictions } = useSmartPreload();

  
  useEffect(() => {
    predictions.forEach(({ state, probability }) => {
      if (probability > 0.4) {
export function useSmartImagePreload(imageUrls: string[]) {
  const manager = useRef(new SmartPreloadManager());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
      for (const url of imageUrls) {
        if (!loadedImages.has(url)) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              setLoadedImages((prev) => new Set([...prev, url]));
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          });
        }
      }
    };

    preloadBatch();
  }, [imageUrls]);

  return { loadedImages };
}

export default useSmartPreload;

