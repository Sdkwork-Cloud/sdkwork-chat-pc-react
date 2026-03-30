import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@sdkwork/openchat-pc-ui";
import { useAppStore, type LanguagePreference } from "@sdkwork/openchat-pc-core";
import { initializeI18n } from "@sdkwork/openchat-pc-i18n";
import { LanguageManager } from "./LanguageManager";
import { ThemeManager } from "./ThemeManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export interface AppProvidersProps {
  children: ReactNode;
  onLanguagePreferenceChange?: (languagePreference: LanguagePreference) => void;
}

export function AppProviders({
  children,
  onLanguagePreferenceChange,
}: AppProvidersProps) {
  const themeMode = useAppStore((state) => state.themeMode);

  useEffect(() => {
    void initializeI18n();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager />
      <LanguageManager onLanguagePreferenceChange={onLanguagePreferenceChange} />
      <BrowserRouter>
        {children}
        <Toaster
          position="bottom-right"
          theme={themeMode === "system" ? "system" : themeMode === "dark" ? "dark" : "light"}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
