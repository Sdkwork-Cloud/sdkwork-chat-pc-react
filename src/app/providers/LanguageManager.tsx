import { useEffect } from "react";
import { setAppLanguage } from "@sdkwork/openchat-pc-i18n";
import { useAppStore, type LanguagePreference } from "@sdkwork/openchat-pc-core";

interface LanguageManagerProps {
  onLanguagePreferenceChange?: (languagePreference: LanguagePreference) => void;
}

export function LanguageManager({ onLanguagePreferenceChange }: LanguageManagerProps) {
  const language = useAppStore((state) => state.language);
  const languagePreference = useAppStore((state) => state.languagePreference);

  useEffect(() => {
    document.documentElement.setAttribute("lang", language);
    void setAppLanguage(language);
  }, [language]);

  useEffect(() => {
    onLanguagePreferenceChange?.(languagePreference);
  }, [languagePreference, onLanguagePreferenceChange]);

  return null;
}
