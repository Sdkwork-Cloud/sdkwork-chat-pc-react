import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { OpenChatClient } from "@openchat/typescript-sdk";
import { translate } from "@sdkwork/openchat-pc-i18n";
import {
  destroySDK,
  initializeSDK,
  isSDKInitialized,
  type SDKAdapterConfig,
} from "../adapters/sdk-adapter";
import { MessageResultService } from "../services";

interface SDKContextType {
  client: OpenChatClient | null;
  isInitialized: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  reconnect: () => Promise<void>;
}

const SDKContext = createContext<SDKContextType | undefined>(undefined);

interface SDKProviderProps {
  children: ReactNode;
  config: SDKAdapterConfig;
  onInitialized?: () => void;
  onError?: (error: Error) => void;
}

export function SDKProvider({
  children,
  config,
  onInitialized,
  onError,
}: SDKProviderProps) {
  const [client, setClient] = useState<OpenChatClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initSDK = useCallback(async () => {
    if (isSDKInitialized()) {
      console.log("SDK already initialized");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const sdkClient = await initializeSDK(config);
      setClient(sdkClient);
      setIsInitialized(true);
      setIsConnected(true);

      const registerResult =
        MessageResultService.registerMessageEventListeners();
      if (!registerResult.success) {
        console.warn(
          "Failed to register message event listeners:",
          registerResult.error,
        );
      }

      onInitialized?.();
    } catch (cause) {
      const nextError =
        cause instanceof Error
          ? cause
          : new Error(translate("SDK initialization failed."));
      setError(nextError);
      onError?.(nextError);
      console.error("SDK initialization failed:", nextError);
    } finally {
      setIsConnecting(false);
    }
  }, [config, onError, onInitialized]);

  const reconnect = useCallback(async () => {
    if (isConnecting) {
      return;
    }

    destroySDK();
    setClient(null);
    setIsInitialized(false);
    setIsConnected(false);

    await initSDK();
  }, [initSDK, isConnecting]);

  useEffect(() => {
    void initSDK();

    return () => {
      destroySDK();
    };
  }, [initSDK]);

  useEffect(() => {
    if (!client) {
      return;
    }

    const timer = setInterval(() => {
      setIsConnected(client.isConnected());
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [client]);

  return (
    <SDKContext.Provider
      value={{
        client,
        isInitialized,
        isConnected,
        isConnecting,
        error,
        reconnect,
      }}
    >
      {children}
    </SDKContext.Provider>
  );
}

export function useSDK(): SDKContextType {
  const context = useContext(SDKContext);
  if (!context) {
    throw new Error("useSDK must be used within a SDKProvider");
  }
  return context;
}

export function useSDKReady(): boolean {
  return useContext(SDKContext)?.isInitialized ?? false;
}

export default SDKProvider;
