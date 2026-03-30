import { Minus, Square, X } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

export interface WindowControlsProps {
  variant?: "header" | "floating";
  className?: string;
  controller?: WindowControlsController | null;
}

export interface WindowControlsController {
  getPlatform(): "web" | "desktop";
  minimizeWindow(): Promise<void>;
  maximizeWindow(): Promise<void>;
  restoreWindow(): Promise<void>;
  isWindowMaximized(): Promise<boolean>;
  subscribeWindowMaximized(
    callback: (isMaximized: boolean) => void,
  ): Promise<() => void | Promise<void>>;
  closeWindow(): Promise<void>;
}

type WindowUnsubscribe = () => void | Promise<void>;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function WindowSizeGlyph({ isMaximized }: { isMaximized: boolean }) {
  if (!isMaximized) {
    return <Square className="h-3.5 w-3.5" />;
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5">
      <path
        d="M9 5h10v10M5 9h10v10H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useDesktopWindowMaximized(
  controller: WindowControlsController | null | undefined,
  isDesktop: boolean,
) {
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  useEffect(() => {
    if (!isDesktop) {
      setIsWindowMaximized(false);
      return;
    }

    if (!controller) {
      setIsWindowMaximized(false);
      return;
    }

    let active = true;
    let unsubscribe: WindowUnsubscribe = () => {};

    void (async () => {
      setIsWindowMaximized(await controller.isWindowMaximized());
      unsubscribe = await controller.subscribeWindowMaximized((nextState) => {
        if (!active) {
          return;
        }

        setIsWindowMaximized(nextState);
      });
    })();

    return () => {
      active = false;
      void unsubscribe();
    };
  }, [controller, isDesktop]);

  return isWindowMaximized;
}

function getRootClassName(
  variant: NonNullable<WindowControlsProps["variant"]>,
  className?: string,
) {
  return joinClasses(
    "flex items-stretch",
    variant === "header"
      ? "h-full"
      : "overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[var(--bg-secondary)] shadow-[var(--shadow-lg)] backdrop-blur-xl",
    className,
  );
}

function getButtonClassName(params: {
  variant: NonNullable<WindowControlsProps["variant"]>;
  intent?: "default" | "danger";
  withDivider?: boolean;
}) {
  const { intent = "default", variant, withDivider = false } = params;

  return joinClasses(
    "flex items-center justify-center transition-colors",
    variant === "header"
      ? "h-full w-11 text-[var(--text-secondary)]"
      : "h-10 w-10 text-[var(--text-secondary)]",
    intent === "danger"
      ? "hover:bg-rose-500 hover:text-white"
      : variant === "header"
        ? "hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        : "hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
    withDivider && variant === "floating"
      ? "border-r border-[color:var(--border-color)]"
      : "",
  );
}

export const WindowControls = memo(function WindowControls({
  variant = "header",
  className,
  controller,
}: WindowControlsProps) {
  const { tr } = useAppTranslation();
  const isDesktop = controller?.getPlatform() === "desktop";
  const isWindowMaximized = useDesktopWindowMaximized(controller, isDesktop);

  if (!controller || !isDesktop) {
    return null;
  }

  const maximizeLabel = isWindowMaximized ? tr("Restore") : tr("Maximize");

  return (
    <div
      data-tauri-drag-region="false"
      className={getRootClassName(variant, className)}
    >
      <button
        type="button"
        data-tauri-drag-region="false"
        title={tr("Minimize")}
        aria-label={tr("Minimize")}
        onClick={() => {
          void controller.minimizeWindow();
        }}
        className={getButtonClassName({
          variant,
          withDivider: true,
        })}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        title={maximizeLabel}
        aria-label={maximizeLabel}
        onClick={() => {
          void (isWindowMaximized ? controller.restoreWindow() : controller.maximizeWindow());
        }}
        className={getButtonClassName({
          variant,
          withDivider: true,
        })}
      >
        <WindowSizeGlyph isMaximized={isWindowMaximized} />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        title={tr("Close")}
        aria-label={tr("Close")}
        onClick={() => {
          void controller.closeWindow();
        }}
        className={getButtonClassName({
          variant,
          intent: "danger",
        })}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

export default WindowControls;
