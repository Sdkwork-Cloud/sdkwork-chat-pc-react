

import { useEffect, useState, useCallback, useRef } from 'react';

interface WasmModule {
  parse_markdown: (markdown: string) => ParseResult;
  parse_markdown_with_options: (
    markdown: string,
    enableTables: boolean,
    enableStrikethrough: boolean,
    enableTasklists: boolean
  ) => ParseResult;
  batch_parse_markdown: (markdowns: string[]) => Promise<ParseResult[]>;
  get_word_count: (markdown: string) => number;
  get_reading_time: (markdown: string, wordsPerMinute?: number) => number;
  extract_headings: (markdown: string) => Promise<Array<[number, string]>>;
}

interface ParseResult {
  html: string;
  success: boolean;
  error: string;
}

interface WasmState {
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  module: WasmModule | null;
}

 "/wasm/markdown-parser/pkg"
        );

        if (!isMounted) return;

        moduleRef.current = wasmModule as unknown as WasmModule;

        setState({
          isLoading: false,
          isReady: true,
          error: null,
          module: moduleRef.current,
        });

        console.log('[WASM] Module loaded successfully');
      } catch (error) {
        console.error('[WASM] Failed to load module:', error);

        if (!isMounted) return;

        setState({
          isLoading: false,
          isReady: false,
          error: error instanceof Error ? error : new Error('Failed to load WASM module'),
          module: null,
        });
      }
    };

    loadWasm();

    return () => {
      isMounted = false;
    };
  }, []);

  const parseMarkdown = useCallback((markdown: string): ParseResult | null => {
    if (!moduleRef.current) {
      return null;
    }

    try {
      const result = moduleRef.current.parse_markdown(markdown);
      return {
        html: result.html,
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      console.error('[WASM] Parse error:', error);
      return null;
    }
  }, []);

  const parseMarkdownAsync = useCallback(
    async (markdown: string): Promise<ParseResult | null> => {
      if (!moduleRef.current) {
        return null;
      }

      try {
          setTimeout(() => {
            const result = moduleRef.current?.parse_markdown(markdown);
            resolve(
              result
                ? {
                    html: result.html,
                    success: result.success,
                    error: result.error,
                  }
                : null
            );
          }, 0);
        });
      } catch (error) {
        console.error('[WASM] Parse error:', error);
        return null;
      }
    },
    []
  );

  const getWordCount = useCallback((markdown: string): number | null => {
    if (!moduleRef.current) {
      return null;
    }

    try {
      return moduleRef.current.get_word_count(markdown);
    } catch (error) {
      console.error('[WASM] Word count error:', error);
      return null;
    }
  }, []);

  const getReadingTime = useCallback(
    (markdown: string, wordsPerMinute?: number): number | null => {
      if (!moduleRef.current) {
        return null;
      }

      try {
        return moduleRef.current.get_reading_time(markdown, wordsPerMinute);
      } catch (error) {
        console.error('[WASM] Reading time error:', error);
        return null;
      }
    },
    []
  );

  return {
    ...state,
    parseMarkdown,
    parseMarkdownAsync,
    getWordCount,
    getReadingTime,
  };
}


export function useWasmMarkdownParser() {
  const wasm = useWasm();
  const cacheRef = useRef<Map<string, string>>(new Map());

  const parseMarkdown = useCallback(
    async (markdown: string): Promise<string> => {
      if (cached) {
        return cached;
      }

      if (wasm.isReady) {
        const result = await wasm.parseMarkdownAsync(markdown);
        if (result?.success) {
          cacheRef.current.set(markdown, result.html);
          return result.html;
        }
      }

      return markdown;
    },
    [wasm]
  );

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    parseMarkdown,
    clearCache,
    isReady: wasm.isReady,
    isLoading: wasm.isLoading,
  };
}

export default useWasm;

