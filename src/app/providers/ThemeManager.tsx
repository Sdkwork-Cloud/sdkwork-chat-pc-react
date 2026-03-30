import { useEffect } from "react";
import { useAppStore } from "@sdkwork/openchat-pc-core";

const THEME_SCALE_MAP = {
  "tech-blue": {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  lobster: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  "green-tech": {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },
  zinc: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  violet: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95",
    950: "#2e1065",
  },
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
    900: "#881337",
    950: "#4c0519",
  },
} as const;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveThemeMode(themeMode: "light" | "dark" | "system") {
  if (themeMode !== "system") {
    return themeMode;
  }

  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function ThemeManager() {
  const themeMode = useAppStore((state) => state.themeMode);
  const themeColor = useAppStore((state) => state.themeColor);

  useEffect(() => {
    const root = document.documentElement;
    const scale = THEME_SCALE_MAP[themeColor];

    const applyTheme = () => {
      const resolvedMode = resolveThemeMode(themeMode);
      const isDark = resolvedMode === "dark";
      const themePrimary50 = scale[50];
      const themePrimary100 = scale[100];
      const themePrimary200 = scale[200];
      const themePrimary300 = scale[300];
      const themePrimary400 = scale[400];
      const themePrimary500 = scale[500];
      const themePrimary600 = scale[600];
      const themePrimary700 = scale[700];
      const themePrimary800 = scale[800];
      const themePrimary900 = scale[900];
      const themePrimary950 = scale[950];
      const scrollbarTrack = isDark
        ? withAlpha(themePrimary800, 0.16)
        : withAlpha(themePrimary200, 0.1);
      const scrollbarThumb = isDark
        ? withAlpha(themePrimary400, 0.26)
        : withAlpha(themePrimary500, 0.18);
      const scrollbarThumbHover = isDark
        ? withAlpha(themePrimary300, 0.34)
        : withAlpha(themePrimary600, 0.3);

      root.setAttribute("data-theme", themeColor);
      root.style.colorScheme = isDark ? "dark" : "light";

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      root.style.setProperty("--theme-primary-50", themePrimary50);
      root.style.setProperty("--theme-primary-100", themePrimary100);
      root.style.setProperty("--theme-primary-200", themePrimary200);
      root.style.setProperty("--theme-primary-300", themePrimary300);
      root.style.setProperty("--theme-primary-400", themePrimary400);
      root.style.setProperty("--theme-primary-500", themePrimary500);
      root.style.setProperty("--theme-primary-600", themePrimary600);
      root.style.setProperty("--theme-primary-700", themePrimary700);
      root.style.setProperty("--theme-primary-800", themePrimary800);
      root.style.setProperty("--theme-primary-900", themePrimary900);
      root.style.setProperty("--theme-primary-950", themePrimary950);

      root.style.setProperty("--ai-primary", themePrimary500);
      root.style.setProperty("--ai-primary-hover", themePrimary600);
      root.style.setProperty("--ai-primary-light", themePrimary400);
      root.style.setProperty("--ai-primary-dark", themePrimary700);
      root.style.setProperty("--ai-primary-soft", withAlpha(themePrimary500, isDark ? 0.16 : 0.1));
      root.style.setProperty("--ai-primary-medium", withAlpha(themePrimary500, isDark ? 0.24 : 0.16));
      root.style.setProperty("--ai-primary-glow", withAlpha(themePrimary500, isDark ? 0.28 : 0.22));

      root.style.setProperty("--bg-primary", isDark ? "#09090b" : "#f4f4f5");
      root.style.setProperty("--bg-secondary", isDark ? "rgba(9, 9, 11, 0.78)" : "rgba(255, 255, 255, 0.72)");
      root.style.setProperty("--bg-tertiary", isDark ? "#18181b" : "#fafafa");
      root.style.setProperty("--bg-elevated", isDark ? "#18181b" : "#ffffff");
      root.style.setProperty("--bg-overlay", isDark ? "rgba(9, 9, 11, 0.45)" : "rgba(24, 24, 27, 0.22)");
      root.style.setProperty("--bg-hover", isDark ? "rgba(255,255,255,0.06)" : "rgba(24,24,27,0.05)");
      root.style.setProperty("--bg-active", withAlpha(themePrimary500, isDark ? 0.16 : 0.12));
      root.style.setProperty("--bg-selected", withAlpha(themePrimary500, isDark ? 0.22 : 0.16));
      root.style.setProperty("--bg-disabled", isDark ? "rgba(255,255,255,0.04)" : "rgba(24,24,27,0.04)");

      root.style.setProperty("--text-primary", isDark ? "#fafafa" : "#18181b");
      root.style.setProperty("--text-secondary", isDark ? "#d4d4d8" : "#3f3f46");
      root.style.setProperty("--text-tertiary", isDark ? "#a1a1aa" : "#71717a");
      root.style.setProperty("--text-muted", isDark ? "#71717a" : "#a1a1aa");
      root.style.setProperty("--text-placeholder", isDark ? "#71717a" : "#a1a1aa");
      root.style.setProperty("--text-inverse", isDark ? "#09090b" : "#ffffff");
      root.style.setProperty("--text-disabled", isDark ? "rgba(255,255,255,0.32)" : "rgba(24,24,27,0.32)");

      root.style.setProperty("--border-color", isDark ? "rgba(255,255,255,0.08)" : "rgba(228,228,231,0.9)");
      root.style.setProperty("--border-light", isDark ? "rgba(255,255,255,0.05)" : "rgba(244,244,245,0.92)");
      root.style.setProperty("--border-medium", isDark ? "rgba(255,255,255,0.12)" : "rgba(212,212,216,0.9)");
      root.style.setProperty("--border-strong", isDark ? "rgba(255,255,255,0.18)" : "rgba(161,161,170,0.42)");
      root.style.setProperty("--border-focus", withAlpha(themePrimary500, isDark ? 0.45 : 0.35));
      root.style.setProperty("--border-error", "rgba(239,68,68,0.6)");
      root.style.setProperty("--border-success", "rgba(34,197,94,0.6)");

      root.style.setProperty(
        "--shadow-sm",
        isDark
          ? "0 1px 2px rgba(9, 9, 11, 0.24)"
          : "0 1px 2px rgba(24, 24, 27, 0.06)",
      );
      root.style.setProperty(
        "--shadow-md",
        isDark
          ? "0 12px 30px rgba(9, 9, 11, 0.24)"
          : "0 12px 30px rgba(15, 23, 42, 0.08)",
      );
      root.style.setProperty(
        "--shadow-lg",
        isDark
          ? "0 18px 44px rgba(9, 9, 11, 0.34)"
          : "0 18px 44px rgba(15, 23, 42, 0.12)",
      );
      root.style.setProperty(
        "--shadow-xl",
        isDark
          ? "0 24px 80px rgba(9, 9, 11, 0.4)"
          : "0 24px 80px rgba(15, 23, 42, 0.14)",
      );
      root.style.setProperty("--shadow-focus", `0 0 0 4px ${withAlpha(themePrimary500, 0.18)}`);
      root.style.setProperty("--shadow-glow", `0 18px 44px ${withAlpha(themePrimary500, isDark ? 0.18 : 0.12)}`);

      root.style.setProperty("--glow-primary", `0 0 24px ${withAlpha(themePrimary500, 0.22)}`);
      root.style.setProperty("--glow-success", "0 0 24px rgba(34, 197, 94, 0.2)");
      root.style.setProperty("--glow-error", "0 0 24px rgba(239, 68, 68, 0.2)");
      root.style.setProperty("--glow-cyan", "0 0 24px rgba(6, 182, 212, 0.18)");
      root.style.setProperty("--glow-purple", "0 0 24px rgba(139, 92, 246, 0.18)");

      root.style.setProperty("--text-on-accent", "#ffffff");
      root.style.setProperty("--shell-sidebar-text", "#d4d4d8");
      root.style.setProperty("--shell-sidebar-muted", "#71717a");
      root.style.setProperty("--shell-sidebar-border", withAlpha(themePrimary300, isDark ? 0.18 : 0.16));
      root.style.setProperty("--shell-sidebar-divider", isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)");
      root.style.setProperty("--shell-sidebar-hover", withAlpha(themePrimary400, isDark ? 0.12 : 0.1));
      root.style.setProperty("--shell-sidebar-active", withAlpha(themePrimary400, isDark ? 0.18 : 0.14));
      root.style.setProperty("--shell-sidebar-active-border", "rgba(255,255,255,0.05)");
      root.style.setProperty("--shell-sidebar-brand-fg", "#ffffff");
      root.style.setProperty("--shell-sidebar-presence-bg", "#22c55e");
      root.style.setProperty("--shell-sidebar-badge-bg", "#ef4444");
      root.style.setProperty("--shell-sidebar-badge-text", "#ffffff");
      root.style.setProperty("--shell-sidebar-panel-bg", isDark ? "rgba(9,9,11,0.96)" : "rgba(9,9,11,0.94)");
      root.style.setProperty("--shell-sidebar-panel-border", withAlpha(themePrimary300, isDark ? 0.18 : 0.16));
      root.style.setProperty("--shell-sidebar-panel-text", "#e4e4e7");
      root.style.setProperty("--shell-sidebar-panel-muted", "#71717a");
      root.style.setProperty("--shell-sidebar-badge-ring", "#09090b");
      root.style.setProperty("--shell-sidebar-shadow", "0 20px 48px rgba(9,9,11,0.34)");
      root.style.setProperty("--shell-danger-border-hover", "rgba(239,68,68,0.3)");

      root.style.setProperty("--scrollbar-track", scrollbarTrack);
      root.style.setProperty("--scrollbar-thumb", scrollbarThumb);
      root.style.setProperty("--scrollbar-thumb-hover", scrollbarThumbHover);
      root.style.setProperty("--scrollbar-thumb-border", isDark ? "rgba(24, 24, 27, 0.8)" : "rgba(255, 255, 255, 0.72)");
    };

    applyTheme();

    if (themeMode !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeColor, themeMode]);

  return null;
}
