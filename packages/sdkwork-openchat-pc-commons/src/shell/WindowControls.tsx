import { memo, useCallback, useEffect, useState, type ReactNode } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

interface WindowControlsProps {
  showTitleBar?: boolean;
  title?: ReactNode;
  className?: string;
  style?: "macos" | "windows";
}

type WindowState = "normal" | "maximized" | "minimized";

interface ControlLabels {
  close: string;
  minimize: string;
  maximize: string;
  restore: string;
}

interface ControlProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  windowState: WindowState;
  labels: ControlLabels;
}

function isDesktopEnv(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return "__TAURI_IPC__" in window;
}

async function callWindowApi(action: "minimize" | "toggleMaximize" | "close") {
  try {
    const { appWindow } = await import("@tauri-apps/api/window");
    if (action === "minimize") {
      await appWindow.minimize();
    } else if (action === "toggleMaximize") {
      await appWindow.toggleMaximize();
    } else {
      await appWindow.close();
    }
  } catch {
    // Ignore non-desktop or unavailable API.
  }
}

export const WindowControls = memo(function WindowControls({
  showTitleBar = true,
  title,
  className = "",
  style = "macos",
}: WindowControlsProps) {
  const { tr } = useAppTranslation();
  const [windowState, setWindowState] = useState<WindowState>("normal");
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isDesktopEnv());
  }, []);

  const handleMinimize = useCallback(async () => {
    await callWindowApi("minimize");
    setWindowState("minimized");
  }, []);

  const handleMaximize = useCallback(async () => {
    await callWindowApi("toggleMaximize");
    setWindowState((previous) => (previous === "maximized" ? "normal" : "maximized"));
  }, []);

  const handleClose = useCallback(async () => {
    await callWindowApi("close");
  }, []);

  if (!desktop) {
    return null;
  }

  const labels: ControlLabels = {
    close: tr("Close"),
    minimize: tr("Minimize"),
    maximize: tr("Maximize"),
    restore: tr("Restore"),
  };

  return (
    <div
      className={`z-[9999] ${
        showTitleBar
          ? "fixed top-0 right-0 flex h-10 w-full items-center border-b border-border bg-bg-secondary/80 backdrop-blur-sm"
          : "flex items-center"
      } ${className}`}
      onDoubleClick={showTitleBar ? handleMaximize : undefined}
      data-tauri-drag-region={showTitleBar ? true : undefined}
    >
      {showTitleBar ? (
        <div className="flex h-full flex-1 items-center px-4" data-tauri-drag-region>
          {title ? <span className="select-none text-sm font-medium text-text-secondary">{title}</span> : null}
        </div>
      ) : null}

      <div className={`flex items-center ${showTitleBar ? "h-full px-2" : ""}`}>
        {style === "macos" ? (
          <MacOSControls
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onClose={handleClose}
            windowState={windowState}
            labels={labels}
          />
        ) : (
          <WindowsControls
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onClose={handleClose}
            windowState={windowState}
            labels={labels}
          />
        )}
      </div>
    </div>
  );
});

const MacOSControls = memo(function MacOSControls({
  onMinimize,
  onMaximize,
  onClose,
  windowState,
  labels,
}: ControlProps) {
  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={onClose}
        className="h-3 w-3 rounded-full border border-[#E0443E]/30 bg-[#FF5F57]"
        title={labels.close}
        aria-label={labels.close}
      />
      <button
        type="button"
        onClick={onMinimize}
        className="h-3 w-3 rounded-full border border-[#DEA123]/30 bg-[#FFBD2E]"
        title={labels.minimize}
        aria-label={labels.minimize}
      />
      <button
        type="button"
        onClick={onMaximize}
        className="h-3 w-3 rounded-full border border-[#1AAB29]/30 bg-[#28C840]"
        title={windowState === "maximized" ? labels.restore : labels.maximize}
        aria-label={windowState === "maximized" ? labels.restore : labels.maximize}
      />
    </div>
  );
});

const WindowsControls = memo(function WindowsControls({
  onMinimize,
  onMaximize,
  onClose,
  windowState,
  labels,
}: ControlProps) {
  const buttonClass =
    "flex h-10 w-12 items-center justify-center text-[#94A3B8] transition-colors duration-200 hover:text-white";

  return (
    <div className="flex items-center -mr-2">
      <button
        type="button"
        onClick={onMinimize}
        className={`${buttonClass} hover:bg-[rgba(255,255,255,0.1)]`}
        title={labels.minimize}
        aria-label={labels.minimize}
      >
        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16">
          <path strokeLinecap="round" strokeWidth="1.5" d="M3 8h10" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onMaximize}
        className={`${buttonClass} hover:bg-[rgba(255,255,255,0.1)]`}
        title={windowState === "maximized" ? labels.restore : labels.maximize}
        aria-label={windowState === "maximized" ? labels.restore : labels.maximize}
      >
        {windowState === "maximized" ? (
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16">
            <path strokeWidth="1.2" d="M5 3.5h7.5V11" />
            <path strokeWidth="1.2" d="M3.5 5h7.5v7.5H3.5z" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16">
            <rect x="3.5" y="3.5" width="9" height="9" strokeWidth="1.2" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={onClose}
        className={`${buttonClass} hover:bg-[#E81123] hover:text-white`}
        title={labels.close}
        aria-label={labels.close}
      >
        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16">
          <path strokeLinecap="round" strokeWidth="1.5" d="M4 4l8 8m0-8l-8 8" />
        </svg>
      </button>
    </div>
  );
});

export default WindowControls;
