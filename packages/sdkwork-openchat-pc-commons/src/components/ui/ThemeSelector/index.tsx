import React from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { useTheme, themes, type ThemeType } from "../../../contexts/ThemeContext";
import { cn } from "../../../utils/cn";

export interface ThemeSelectorProps {
  className?: string;
  direction?: "horizontal" | "vertical";
  size?: "small" | "medium" | "large";
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className,
  direction = "horizontal",
  size = "medium",
}) => {
  const { tr } = useAppTranslation();
  const { currentTheme, setTheme } = useTheme();

  const sizeClasses = {
    small: { container: "gap-2", item: "w-8 h-8", label: "text-xs" },
    medium: { container: "gap-3", item: "w-12 h-12", label: "text-sm" },
    large: { container: "gap-4", item: "w-16 h-16", label: "text-base" },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        currentSize.container,
        className,
      )}
    >
      {(Object.keys(themes) as ThemeType[]).map((themeKey) => {
        const theme = themes[themeKey];
        const isActive = currentTheme === themeKey;
        const label = tr(theme.name);

        return (
          <button
            key={themeKey}
            onClick={() => setTheme(themeKey)}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl transition-all duration-200",
              direction === "vertical" && "w-full flex-row p-3 hover:bg-bg-hover",
              isActive && direction === "vertical" && "bg-bg-hover",
            )}
            title={label}
          >
            <div
              className={cn(
                "relative overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-bg-primary transition-all duration-200",
                currentSize.item,
                isActive ? "scale-110 ring-primary shadow-glow-primary" : "ring-transparent hover:ring-border-medium",
              )}
              style={{
                background: `linear-gradient(135deg, ${theme.colors.bgPrimary} 50%, ${theme.colors.primary} 50%)`,
              }}
            >
              {isActive ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <svg className="h-5 w-5 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ) : null}
            </div>

            <span
              className={cn(
                currentSize.label,
                "font-medium transition-colors",
                isActive ? "text-primary" : "text-text-secondary group-hover:text-text-primary",
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { tr } = useAppTranslation();
  const { toggleTheme, themeConfig } = useTheme();
  const themeName = tr(themeConfig.name);

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 transition-colors hover:bg-bg-hover",
        className,
      )}
      title={tr("Current theme: {{name}}", { name: themeName })}
    >
      <div
        className="h-5 w-5 rounded-md"
        style={{
          background: `linear-gradient(135deg, ${themeConfig.colors.bgPrimary} 50%, ${themeConfig.colors.primary} 50%)`,
        }}
      />
      <span className="text-sm text-text-secondary">{themeName}</span>
      <svg className="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    </button>
  );
};

export default ThemeSelector;
