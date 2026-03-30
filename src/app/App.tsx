import type { LanguagePreference } from "@sdkwork/openchat-pc-core";
import { AppProvider } from "./AppProvider";
import { AppRoot } from "./AppRoot";

interface AppProps {
  onLanguagePreferenceChange?: (languagePreference: LanguagePreference) => void;
}

export function App({ onLanguagePreferenceChange }: AppProps) {
  return (
    <AppProvider onLanguagePreferenceChange={onLanguagePreferenceChange}>
      <AppRoot />
    </AppProvider>
  );
}

export default App;
