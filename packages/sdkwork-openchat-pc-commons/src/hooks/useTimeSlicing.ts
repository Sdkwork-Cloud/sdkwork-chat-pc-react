

import { useCallback, useRef, useEffect, useState } from 'react';

  IMMEDIATE = 1,    
  USER_BLOCKING = 2, 
  NORMAL = 3,       
  LOW = 4,          
  IDLE = 5,         

interface TaskConfig {
  priority: TaskPriority;
  deadline: number;  
}

const DEFAULT_CONFIG: TaskConfig = {
  priority: TaskPriority.NORMAL,
  deadline: 1000,
  chunkSize: 10,
};


const scheduler = {
  schedule: (callback: IdleRequestCallback, options?: IdleRequestOptions): number => {
    if ('requestIdleCallback' in window) {
      return requestIdleCallback(callback, options);
    }
    return (window as any).setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    }, 1) as unknown as number;
  },

  cancel: (id: number): void => {
    if ('cancelIdleCallback' in window) {
      cancelIdleCallback(id);
    } else {
      clearTimeout(id);
    }
  },
};


export function useTimeSlicing<T>(config: Partial<TaskConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const scheduledTasks = useRef<Set<number>>(new Set());
  const isRunning = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      scheduledTasks.current.forEach((id) => scheduler.cancel(id));
      scheduledTasks.current.clear();
    };
  }, []);

  
  const runTimeSliced = useCallback(
    async (
      items: T[],
      processor: (item: T, index: number) => void | Promise<void>,
      onProgress?: (completed: number, total: number) => void,
      onComplete?: () => void
    ): Promise<void> => {
      if (isRunning.current) {
        console.warn('[TimeSlicing] Task already running');
        return;
      }

      isRunning.current = true;
      setProgress(0);

      const total = items.length;
      let completed = 0;

      return new Promise((resolve) => {
        const processChunk = (deadline: IdleDeadline) => {
          const startTime = performance.now();
          const timeLimit = deadline.timeRemaining();

            completed < total &&
            (deadline.timeRemaining() > 0 || deadline.didTimeout)
          ) {
            const endIndex = Math.min(completed + finalConfig.chunkSize, total);

            for (let i = completed; i < endIndex; i++) {
              processor(items[i], i);
              completed++;
            }

              break;
            }
          }

          const currentProgress = Math.floor((completed / total) * 100);
          setProgress(currentProgress);
          onProgress?.(completed, total);

          if (completed < total) {
              timeout: finalConfig.deadline,
            });
            scheduledTasks.current.add(taskId);
          } else {
            isRunning.current = false;
            onComplete?.();
            resolve();
          }
        };

        const taskId = scheduler.schedule(processChunk);
        scheduledTasks.current.add(taskId);
      });
    },
    [finalConfig.chunkSize, finalConfig.deadline]
  );

  
  const batchUpdate = useCallback(
    async <U extends unknown>(
      items: U[],
      updateFn: (batch: U[]) => void,
      onComplete?: () => void
    ): Promise<void> => {
      const batches: U[][] = [];
      
      for (let i = 0; i < items.length; i += finalConfig.chunkSize) {
        batches.push(items.slice(i, i + finalConfig.chunkSize));
      }

      let batchIndex = 0;

      return new Promise((resolve) => {
        const processBatch = (deadline: IdleDeadline) => {
          while (
            batchIndex < batches.length &&
            (deadline.timeRemaining() > 0 || deadline.didTimeout)
          ) {
            updateFn(batches[batchIndex]);
            batchIndex++;
            setProgress(Math.floor((batchIndex / batches.length) * 100));
          }

          if (batchIndex < batches.length) {
            const taskId = scheduler.schedule(processBatch, {
              timeout: finalConfig.deadline,
            });
            scheduledTasks.current.add(taskId);
          } else {
            onComplete?.();
            resolve();
          }
        };

        const taskId = scheduler.schedule(processBatch);
        scheduledTasks.current.add(taskId);
      });
    },
    [finalConfig.chunkSize, finalConfig.deadline]
  );

  
  const cancel = useCallback(() => {
    scheduledTasks.current.forEach((id) => scheduler.cancel(id));
    scheduledTasks.current.clear();
    isRunning.current = false;
    setProgress(0);
  }, []);

  return {
    runTimeSliced,
    batchUpdate,
    cancel,
    progress,
    isRunning: () => isRunning.current,
  };
}


export function useVirtualListTimeSlicing<T>(
  items: T[],
  renderFn: (item: T, index: number) => React.ReactNode,
  config: Partial<TaskConfig> = {}
) {
  const [visibleItems, setVisibleItems] = useState<Array<{ item: T; index: number; node: React.ReactNode }>>([]);
  const { runTimeSliced, progress, cancel } = useTimeSlicing<T>(config);
  const isFirstRender = useRef(true);

  useEffect(() => {
      const initialItems = items.slice(0, 50).map((item, index) => ({
        item,
        index,
        node: renderFn(item, index),
      }));
      setVisibleItems(initialItems);
      isFirstRender.current = false;

      if (items.length > 50) {
        const remainingItems = items.slice(50);
        runTimeSliced(
          remainingItems,
          (item, index) => {
            setVisibleItems((prev) => [
              ...prev,
              {
                item,
                index: index + 50,
                node: renderFn(item, index + 50),
              },
            ]);
          },
          undefined,
          () => {
            console.log('[VirtualListTimeSlicing] Render complete');
          }
        );
      }
    }

    return () => cancel();
  }, [items, renderFn, runTimeSliced, cancel]);

  return { visibleItems, progress };
}


export function useProgressiveImageLoading(imageUrls: string[]) {
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const { runTimeSliced } = useTimeSlicing<string>({ chunkSize: 3 });

  useEffect(() => {
    runTimeSliced(
      imageUrls,
      async (url) => {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            setLoadedImages((prev) => [...prev, url]);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        });
      },
      (completed, total) => {
        setProgress(Math.floor((completed / total) * 100));
      }
    );
  }, [imageUrls, runTimeSliced]);

  return { loadedImages, progress };
}


export function usePriorityScheduler() {
  const taskQueue = useRef<Array<{ fn: () => void; priority: TaskPriority }>>([]);
  const isProcessing = useRef(false);

  const schedule = useCallback((fn: () => void, priority: TaskPriority = TaskPriority.NORMAL) => {
    taskQueue.current.push({ fn, priority });
    taskQueue.current.sort((a, b) => a.priority - b.priority);

    if (!isProcessing.current) {
      processQueue();
    }
  }, []);

  const processQueue = useCallback(() => {
    if (taskQueue.current.length === 0) {
      isProcessing.current = false;
      return;
    }

    isProcessing.current = true;
    const task = taskQueue.current.shift();

    if (task) {
      channel.port1.onmessage = () => {
        task.fn();
        processQueue();
      };
      channel.port2.postMessage(null);
    }
  }, []);

  return { schedule };
}


export function useConcurrentTransition() {
  const [isPending, startTransition] = useState(false);
  const [value, setValue] = useState<any>(null);

  const updateValue = useCallback((newValue: any) => {
    if ('startTransition' in React) {
      // @ts-ignore
      React.startTransition(() => {
        setValue(newValue);
      });
    } else {
      setValue(newValue);
    }
  }, []);

  return { value, updateValue, isPending };
}

import React from 'react';

export default useTimeSlicing;

