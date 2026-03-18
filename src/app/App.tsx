import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { initializePlatform } from "../platform";
import { createWebPlatform } from "../platform-impl/web";
import { AppProvider, useAuthContext } from "./AppProvider";
import { AppRouter } from "../router";

function isTauri(): boolean {
  return !!(window as { __TAURI__?: unknown }).__TAURI__;
}

async function initPlatform() {
  if (isTauri()) {
    const { createDesktopPlatform } = await import("../platform-impl/desktop");
    initializePlatform(createDesktopPlatform());
    return;
  }

  initializePlatform(createWebPlatform());
}

function FullScreenLoading({ label }: { label: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-text-secondary">{label}</span>
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoading } = useAuthContext();
  const { tr } = useAppTranslation();

  if (isLoading) {
    return <FullScreenLoading label={tr("Initializing...")} />;
  }

  return <AppRouter />;
}

export function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { tr } = useAppTranslation();

  useEffect(() => {
    initPlatform()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error("Failed to initialize platform:", err);
        setError(err);
      });
  }, []);

  if (!isReady && !error) {
    return <FullScreenLoading label={tr("Initializing...")} />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="mb-2 text-lg text-error">{tr("Initialization failed")}</div>
          <div className="text-sm text-text-secondary">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
