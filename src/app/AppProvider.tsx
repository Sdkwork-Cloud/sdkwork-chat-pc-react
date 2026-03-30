import { createContext, useContext, type ReactNode } from "react";
import { OpenChatProvider } from "@sdkwork/openchat-pc-im";
import type { LanguagePreference } from "@sdkwork/openchat-pc-core";
import type { UseAuthReturn } from "@sdkwork/openchat-pc-auth";
import { useAuth } from "@sdkwork/openchat-pc-auth";
import { AppProviders } from "./providers/AppProviders";

interface AppProviderProps {
  children: ReactNode;
  onLanguagePreferenceChange?: (languagePreference: LanguagePreference) => void;
}

const AuthContext = createContext<UseAuthReturn | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AppProvider");
  }
  return context;
}

export function AppProvider({
  children,
  onLanguagePreferenceChange,
}: AppProviderProps) {
  const auth = useAuth();

  return (
    <AppProviders onLanguagePreferenceChange={onLanguagePreferenceChange}>
      <AuthContext.Provider value={auth}>
        <OpenChatProvider>{children}</OpenChatProvider>
      </AuthContext.Provider>
    </AppProviders>
  );
}

export default AppProvider;
