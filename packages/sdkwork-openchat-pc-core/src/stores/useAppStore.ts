import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  detectAppLanguage,
  type AppLanguage,
  SUPPORTED_LANGUAGES,
} from "@sdkwork/openchat-pc-i18n";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeColor = "lobster" | "tech-blue" | "green-tech" | "zinc" | "violet" | "rose";
export type Language = AppLanguage;
export type LanguagePreference = Language | "system";

interface AppState {
  sidebarVisibilityVersion: number;
  hiddenSidebarItems: string[];
  toggleSidebarItem: (id: string) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  language: Language;
  languagePreference: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
}

const APP_STORAGE_KEY = "openchat-pc-app-storage";
const SIDEBAR_VISIBILITY_VERSION = 1;

function normalizeLanguagePreference(value?: string | null): LanguagePreference {
  if (value === "system") {
    return "system";
  }

  const matched = SUPPORTED_LANGUAGES.find((language) => language === value);
  return matched ?? detectAppLanguage();
}

function resolveLanguageFromPreference(preference: LanguagePreference): Language {
  if (preference === "system") {
    return detectAppLanguage();
  }

  return preference;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarVisibilityVersion: SIDEBAR_VISIBILITY_VERSION,
      hiddenSidebarItems: [],
      toggleSidebarItem: (id) =>
        set((state) => ({
          hiddenSidebarItems: state.hiddenSidebarItems.includes(id)
            ? state.hiddenSidebarItems.filter((itemId) => itemId !== id)
            : [...state.hiddenSidebarItems, id],
        })),
      themeMode: "system",
      setThemeMode: (themeMode) => set({ themeMode }),
      themeColor: "lobster",
      setThemeColor: (themeColor) => set({ themeColor }),
      languagePreference: "system",
      language: detectAppLanguage(),
      setLanguage: (languagePreference) => {
        const nextLanguagePreference = normalizeLanguagePreference(languagePreference);
        set({
          languagePreference: nextLanguagePreference,
          language: resolveLanguageFromPreference(nextLanguagePreference),
        });
      },
    }),
    {
      name: APP_STORAGE_KEY,
      partialize: (state) => ({
        sidebarVisibilityVersion: state.sidebarVisibilityVersion,
        hiddenSidebarItems: state.hiddenSidebarItems,
        themeMode: state.themeMode,
        themeColor: state.themeColor,
        language: state.language,
        languagePreference: state.languagePreference,
      }),
      merge: (persistedState, currentState) => {
        const nextState = (persistedState as Partial<{
          sidebarVisibilityVersion: number;
          hiddenSidebarItems: string[];
          themeMode: ThemeMode;
          themeColor: ThemeColor;
          language: Language;
          languagePreference: LanguagePreference;
        }>) || {};
        const languagePreference = normalizeLanguagePreference(
          nextState.languagePreference ?? nextState.language ?? "system",
        );

        return {
          ...currentState,
          ...nextState,
          sidebarVisibilityVersion: SIDEBAR_VISIBILITY_VERSION,
          hiddenSidebarItems:
            nextState.sidebarVisibilityVersion === SIDEBAR_VISIBILITY_VERSION
              ? Array.from(new Set(nextState.hiddenSidebarItems ?? currentState.hiddenSidebarItems))
              : currentState.hiddenSidebarItems,
          languagePreference,
          language: resolveLanguageFromPreference(languagePreference),
        };
      },
    },
  ),
);
