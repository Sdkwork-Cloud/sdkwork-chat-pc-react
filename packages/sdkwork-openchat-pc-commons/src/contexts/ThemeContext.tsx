import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "openchat.theme";

export type ThemeType = "dark" | "light" | "blue" | "purple" | "green" | "system";

export interface ThemeConfig {
  name: string;
  type: ThemeType;
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryDark: string;
    primarySoft: string;
    primaryMedium: string;
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgElevated: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textMuted: string;
    borderColor: string;
    borderLight: string;
    borderMedium: string;
  };
}

export const themes: Record<ThemeType, ThemeConfig> = {
  dark: {
    name: "Dark",
    type: "dark",
    colors: {
      primary: "#3B82F6",
      primaryHover: "#2563EB",
      primaryLight: "#60A5FA",
      primaryDark: "#1D4ED8",
      primarySoft: "rgba(59, 130, 246, 0.12)",
      primaryMedium: "rgba(59, 130, 246, 0.25)",
      bgPrimary: "#000000",
      bgSecondary: "#0A0A0A",
      bgTertiary: "#141414",
      bgElevated: "#1C1C1C",
      textPrimary: "#FFFFFF",
      textSecondary: "#E8E8E8",
      textTertiary: "#A0A0A0",
      textMuted: "#6B6B6B",
      borderColor: "rgba(255, 255, 255, 0.08)",
      borderLight: "rgba(255, 255, 255, 0.04)",
      borderMedium: "rgba(255, 255, 255, 0.12)",
    },
  },
  light: {
    name: "Light",
    type: "light",
    colors: {
      primary: "#3B82F6",
      primaryHover: "#2563EB",
      primaryLight: "#60A5FA",
      primaryDark: "#1D4ED8",
      primarySoft: "rgba(59, 130, 246, 0.1)",
      primaryMedium: "rgba(59, 130, 246, 0.2)",
      bgPrimary: "#FFFFFF",
      bgSecondary: "#F8FAFC",
      bgTertiary: "#F1F5F9",
      bgElevated: "#E2E8F0",
      textPrimary: "#0F172A",
      textSecondary: "#334155",
      textTertiary: "#64748B",
      textMuted: "#94A3B8",
      borderColor: "rgba(0, 0, 0, 0.08)",
      borderLight: "rgba(0, 0, 0, 0.04)",
      borderMedium: "rgba(0, 0, 0, 0.12)",
    },
  },
  blue: {
    name: "Ocean",
    type: "blue",
    colors: {
      primary: "#06B6D4",
      primaryHover: "#0891B2",
      primaryLight: "#22D3EE",
      primaryDark: "#0E7490",
      primarySoft: "rgba(6, 182, 212, 0.12)",
      primaryMedium: "rgba(6, 182, 212, 0.25)",
      bgPrimary: "#0C1E2A",
      bgSecondary: "#122B3D",
      bgTertiary: "#1A3A52",
      bgElevated: "#234868",
      textPrimary: "#FFFFFF",
      textSecondary: "#E0F2FE",
      textTertiary: "#7DD3FC",
      textMuted: "#38BDF8",
      borderColor: "rgba(125, 211, 252, 0.15)",
      borderLight: "rgba(125, 211, 252, 0.08)",
      borderMedium: "rgba(125, 211, 252, 0.2)",
    },
  },
  purple: {
    name: "Nebula",
    type: "purple",
    colors: {
      primary: "#8B5CF6",
      primaryHover: "#7C3AED",
      primaryLight: "#A78BFA",
      primaryDark: "#6D28D9",
      primarySoft: "rgba(139, 92, 246, 0.12)",
      primaryMedium: "rgba(139, 92, 246, 0.25)",
      bgPrimary: "#1A1425",
      bgSecondary: "#251B35",
      bgTertiary: "#35254A",
      bgElevated: "#452F5F",
      textPrimary: "#FFFFFF",
      textSecondary: "#F3E8FF",
      textTertiary: "#D8B4FE",
      textMuted: "#A855F7",
      borderColor: "rgba(216, 180, 254, 0.15)",
      borderLight: "rgba(216, 180, 254, 0.08)",
      borderMedium: "rgba(216, 180, 254, 0.2)",
    },
  },
  green: {
    name: "Forest",
    type: "green",
    colors: {
      primary: "#10B981",
      primaryHover: "#059669",
      primaryLight: "#34D399",
      primaryDark: "#047857",
      primarySoft: "rgba(16, 185, 129, 0.12)",
      primaryMedium: "rgba(16, 185, 129, 0.25)",
      bgPrimary: "#0A1F15",
      bgSecondary: "#0F2E1F",
      bgTertiary: "#163D29",
      bgElevated: "#1D4C33",
      textPrimary: "#FFFFFF",
      textSecondary: "#D1FAE5",
      textTertiary: "#6EE7B7",
      textMuted: "#34D399",
      borderColor: "rgba(110, 231, 183, 0.15)",
      borderLight: "rgba(110, 231, 183, 0.08)",
      borderMedium: "rgba(110, 231, 183, 0.2)",
    },
  },
  system: {
    name: "System",
    type: "light",
    colors: {
      primary: "#3B82F6",
      primaryHover: "#2563EB",
      primaryLight: "#60A5FA",
      primaryDark: "#1D4ED8",
      primarySoft: "rgba(59, 130, 246, 0.1)",
      primaryMedium: "rgba(59, 130, 246, 0.2)",
      bgPrimary: "#FFFFFF",
      bgSecondary: "#F8FAFC",
      bgTertiary: "#F1F5F9",
      bgElevated: "#E2E8F0",
      textPrimary: "#0F172A",
      textSecondary: "#334155",
      textTertiary: "#64748B",
      textMuted: "#94A3B8",
      borderColor: "rgba(0, 0, 0, 0.08)",
      borderLight: "rgba(0, 0, 0, 0.04)",
      borderMedium: "rgba(0, 0, 0, 0.12)",
    },
  },
};

interface ThemeContextType {
  currentTheme: ThemeType;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_THEMES = new Set<ThemeType>(["dark", "blue", "purple", "green"]);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeType | null;
      if (saved && themes[saved]) {
        return saved;
      }
    }
    return "dark";
  });

  const themeConfig = themes[currentTheme];
  const isDark = DARK_THEMES.has(currentTheme);

  useEffect(() => {
    const root = document.documentElement;
    const { colors } = themeConfig;

    root.style.setProperty("--ai-primary", colors.primary);
    root.style.setProperty("--ai-primary-hover", colors.primaryHover);
    root.style.setProperty("--ai-primary-light", colors.primaryLight);
    root.style.setProperty("--ai-primary-dark", colors.primaryDark);
    root.style.setProperty("--ai-primary-soft", colors.primarySoft);
    root.style.setProperty("--ai-primary-medium", colors.primaryMedium);
    root.style.setProperty("--bg-primary", colors.bgPrimary);
    root.style.setProperty("--bg-secondary", colors.bgSecondary);
    root.style.setProperty("--bg-tertiary", colors.bgTertiary);
    root.style.setProperty("--bg-elevated", colors.bgElevated);
    root.style.setProperty("--text-primary", colors.textPrimary);
    root.style.setProperty("--text-secondary", colors.textSecondary);
    root.style.setProperty("--text-tertiary", colors.textTertiary);
    root.style.setProperty("--text-muted", colors.textMuted);
    root.style.setProperty("--border-color", colors.borderColor);
    root.style.setProperty("--border-light", colors.borderLight);
    root.style.setProperty("--border-medium", colors.borderMedium);
    root.style.setProperty("--ai-warning", "#F59E0B");
    root.style.setProperty("--ai-error", "#EF4444");
    root.style.setProperty("--ai-purple", "#8B5CF6");
    root.style.setProperty("--ai-cyan", "#06B6D4");
    root.style.setProperty("--ai-purple-hover", "#7C3AED");
    root.style.setProperty("--ai-purple-soft", "rgba(139, 92, 246, 0.12)");

    root.style.setProperty(
      "--shadow-sm",
      isDark
        ? "0 1px 2px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4)"
        : "0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
    );
    root.style.setProperty(
      "--shadow-md",
      isDark
        ? "0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.5)"
        : "0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    );
    root.style.setProperty("--shadow-glow", `0 0 20px ${colors.primarySoft}`);

    window.localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  }, [currentTheme, isDark, themeConfig]);

  const setTheme = useCallback((theme: ThemeType) => {
    if (themes[theme]) setCurrentTheme(theme);
  }, []);

  const toggleTheme = useCallback(() => {
    setCurrentTheme((prev) => {
      const themeList = Object.keys(themes) as ThemeType[];
      const currentIndex = themeList.indexOf(prev);
      return themeList[(currentIndex + 1) % themeList.length];
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeConfig,
        setTheme,
        toggleTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
