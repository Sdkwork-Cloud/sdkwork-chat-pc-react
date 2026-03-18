

import { useEffect, useRef, useCallback, useState } from 'react';

interface ParseRequest {
  id: string;
  content: string;
  type?: 'full' | 'chunks';
}

interface ParseResult {
  result?: string | string[];
  error?: string;
  success: boolean;
}


export function useMarkdownWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, (result: ParseResult) => void>>(new Map());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../workers/markdown.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event: MessageEvent) => {
        const { id, result, error, success } = event.data;
        const resolver = pendingRef.current.get(id);

        if (resolver) {
          resolver({ result, error, success });
          pendingRef.current.delete(id);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Markdown Worker error:', error);
      };

      setIsReady(true);

      return () => {
        workerRef.current?.terminate();
        workerRef.current = null;
        pendingRef.current.clear();
      };
    } catch (error) {
      console.error('Failed to initialize Markdown Worker:', error);
      setIsReady(false);
    }
  }, []);

  
  const parseMarkdown = useCallback(
    async (content: string, type: 'full' | 'chunks' = 'full'): Promise<ParseResult> => {
      if (!workerRef.current || !isReady) {
        return {
          result: content,
          success: true,
        };
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return new Promise((resolve) => {
        pendingRef.current.set(id, resolve);

          id,
          content,
          type,
        });

        setTimeout(() => {
          if (pendingRef.current.has(id)) {
            pendingRef.current.delete(id);
            resolve({
              result: content,
              error: 'Parse timeout',
              success: false,
            });
          }
        }, 5000);
      });
    },
    [isReady]
  );

  return {
    parseMarkdown,
    isReady,
  };
}


export function useCachedMarkdownWorker() {
  const { parseMarkdown, isReady } = useMarkdownWorker();
  const cacheRef = useRef<Map<string, string | string[]>>(new Map());

  const parseMarkdownCached = useCallback(
    async (content: string, type: 'full' | 'chunks' = 'full'): Promise<ParseResult> => {
      if (cached) {
        return {
          result: cached,
          success: true,
        };
      }

      if (result.success && result.result) {
        cacheRef.current.set(content, result.result);

          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) {
            cacheRef.current.delete(firstKey);
          }
        }
      }

      return result;
    },
    [parseMarkdown]
  );

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    parseMarkdown: parseMarkdownCached,
    clearCache,
    isReady,
  };
}

