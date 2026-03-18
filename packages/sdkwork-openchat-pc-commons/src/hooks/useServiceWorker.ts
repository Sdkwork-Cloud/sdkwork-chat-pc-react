

import { useEffect, useState, useCallback, useRef } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  hasUpdate: boolean;
  offlineReady: boolean;
}


  const updateServiceWorker = useCallback(async () => {
    if (!registrationRef.current) return;

    setState((prev) => ({ ...prev, isUpdating: true }));

    try {
      await registrationRef.current.update();

      if (registrationRef.current.waiting) {
        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      setState((prev) => ({
        ...prev,
        isUpdating: false,
        hasUpdate: false,
      }));
    } catch (error) {
      console.error('[SW] Update failed:', error);
      setState((prev) => ({ ...prev, isUpdating: false }));
    }
  }, []);

  
  const skipWaitingAndReload = useCallback(() => {
    if (!registrationRef.current?.waiting) return;

    registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });

      window.location.reload();
    });
  }, []);

  
  const sync = useCallback(async (tag: string = 'sync-messages') => {
    if (!registrationRef.current) return false;

    try {
      // @ts-ignore - sync may not be available in all browsers
      if (registrationRef.current.sync) {
        // @ts-ignore
        await registrationRef.current.sync.register(tag);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SW] Sync registration failed:', error);
      return false;
    }
  }, []);

  
  const postMessage = useCallback((message: unknown) => {
    if (!registrationRef.current?.active) return;

    registrationRef.current.active?.postMessage(message);
  }, []);

  
  const getCacheVersion = useCallback(async (): Promise<string | null> => {
    if (!registrationRef.current?.active) return null;

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        resolve(event.data?.version || null);
      };

      const activeWorker = registrationRef.current?.active;
      if (activeWorker) {
        activeWorker.postMessage(
          { type: 'GET_VERSION' },
          [channel.port2]
        );
      }
    });
  }, []);

  
  const clearCache = useCallback(async () => {
    postMessage({ type: 'CLEAR_CACHE' });
  }, [postMessage]);

  return {
    ...state,
    updateServiceWorker,
    skipWaitingAndReload,
    sync,
    postMessage,
    getCacheVersion,
    clearCache,
  };
}


export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');

      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType || 'unknown');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}


export function useBackgroundSync() {
  const { sync } = useServiceWorker();

  const scheduleSync = useCallback(
    async (tag: string = 'sync-messages') => {
      return sync(tag);
    },
    [sync]
  );

  return { scheduleSync };
}

