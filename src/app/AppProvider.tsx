
import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { OpenChatProvider } from '@sdkwork/openchat-pc-im';
import { useAuth } from '@sdkwork/openchat-pc-auth';
import { ThemeProvider, Toaster } from '@sdkwork/openchat-pc-ui';

interface AppProviderProps {
  children: ReactNode;
}

import { createContext, useContext } from 'react';
import type { UseAuthReturn } from '@sdkwork/openchat-pc-auth';

const AuthContext = createContext<UseAuthReturn | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AppProvider');
  }
  return context;
}


export function AppProvider({ children }: AppProviderProps) {
  const auth = useAuth();

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <OpenChatProvider>
            {children}
            <Toaster />
          </OpenChatProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default AppProvider;
