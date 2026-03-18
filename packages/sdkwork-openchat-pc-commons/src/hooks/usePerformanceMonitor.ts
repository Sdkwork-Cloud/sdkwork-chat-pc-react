

import { useEffect, useCallback, useRef } from 'react';
import { onCLS, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

interface PerformanceMetrics {
  // Web Vitals
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  fid?: number; // First Input Delay
  lcp?: number; // Largest Contentful Paint
  ttfb?: number; // Time to First Byte

  memoryUsage?: number;
  longTasks?: number;
}

type PerformanceReporter = (metrics: PerformanceMetrics) => void;


export function usePerformanceMonitor(reporter?: PerformanceReporter) {
  const metricsRef = useRef<PerformanceMetrics>({});

  const reportMetrics = useCallback(() => {
    if (reporter) {
      reporter({ ...metricsRef.current });
    }

      console.log('[Performance]', metricsRef.current);
    }
  }, [reporter]);

  useEffect(() => {
    onCLS((metric: Metric) => {
      metricsRef.current.cls = metric.value;
      reportMetrics();
    });

    onFCP((metric: Metric) => {
      metricsRef.current.fcp = metric.value;
      reportMetrics();
    });

    // onFID is deprecated in web-vitals v4, using INP instead
    // @ts-ignore - for backwards compatibility
    if (typeof onFID === 'function') {
      // @ts-ignore
      onFID((metric: Metric) => {
        metricsRef.current.fid = metric.value;
        reportMetrics();
      });
    }

    onLCP((metric: Metric) => {
      metricsRef.current.lcp = metric.value;
      reportMetrics();
    });

    onTTFB((metric: Metric) => {
      metricsRef.current.ttfb = metric.value;
      reportMetrics();
    });

    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        if (memory) {
          metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1048576; // MB
        }
      }
    };

    const memoryInterval = setInterval(monitorMemory, 30000);

      try {
        const observer = new PerformanceObserver((list) => {
          let longTasks = 0;
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
            }
          }
          metricsRef.current.longTasks = longTasks;
        });

        observer.observe({ entryTypes: ['longtask'] });

        return () => {
          observer.disconnect();
          clearInterval(memoryInterval);
        };
      } catch (e) {
      }
    }

    return () => {
      clearInterval(memoryInterval);
    };
  }, [reportMetrics]);

  return metricsRef;
}


export function useRenderPerformance(componentName: string, threshold: number = 16) {
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;

    if (renderTime > threshold) {
      console.warn(
        `[Render Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render (threshold: ${threshold}ms)`
      );
    }
  });

  renderStartRef.current = performance.now();
}


export function getPerformanceReport(): PerformanceMetrics {
  const report: PerformanceMetrics = {};

  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      report.ttfb = navigation.responseStart - navigation.startTime;
    }
  }

  if ('memory' in performance) {
    const memory = (performance as any).memory;
    if (memory) {
      report.memoryUsage = memory.usedJSHeapSize / 1048576;
    }
  }

  return report;
}


export class PerformanceMeasure {
  private marks: Map<string, number> = new Map();

  
  start(name: string): void {
    this.marks.set(name, performance.now());
  }

  
  end(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.marks.delete(name);

      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  
  measure<T>(name: string, fn: () => T): T {
    this.start(name);
    const result = fn();
    this.end(name);
    return result;
  }

  
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    const result = await fn();
    this.end(name);
    return result;
  }
}

export const perf = new PerformanceMeasure();

