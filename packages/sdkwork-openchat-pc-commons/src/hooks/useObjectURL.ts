

import { useEffect, useRef, useCallback } from 'react';

interface ObjectURLManager {
  create: (blob: Blob) => string;
  revoke: (url: string) => void;
  revokeAll: () => void;
}


export function useObjectURL(): ObjectURLManager {
  const urlsRef = useRef<Set<string>>(new Set());

  const create = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);

  const revoke = useCallback((url: string): void => {
    if (urlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(url);
    }
  }, []);

  const revokeAll = useCallback((): void => {
    urlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    urlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      revokeAll();
    };
  }, [revokeAll]);

  return { create, revoke, revokeAll };
}


export function useFileObjectURL(file: File | null | undefined): string | null {
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (file) {
      urlRef.current = URL.createObjectURL(file);
    }

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file]);

  return urlRef.current;
}

