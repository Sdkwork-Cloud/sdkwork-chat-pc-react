import {
  Component,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import type { LanguagePreference } from "@sdkwork/openchat-pc-core";
import { App } from "../../App";
import { APP_NAME } from "../../env";
import {
  getAppInfo,
  getDesktopWindow,
  isTauriRuntime,
  setAppLanguage,
} from "../tauriBridge";
import { DesktopProviders } from "../providers/DesktopProviders";
import { DesktopStartupScreen } from "./DesktopStartupScreen";
import {
  getStartupMinimumWaitMs,
  getStartupProgressModel,
  readStartupAppearanceSnapshot,
  resolveStartupBootstrapStage,
  type StartupAppearanceSnapshot,
  type StartupMilestoneSnapshot,
} from "./startupPresentation";

interface DesktopBootstrapAppProps {
  appName: string;
  initialAppearance: StartupAppearanceSnapshot;
}

const APP_STORAGE_KEY = "openchat-pc-app-storage";
const SPLASH_MINIMUM_VISIBLE_MS = 180;
const SPLASH_EXIT_DURATION_MS = 120;
const STARTUP_WINDOW_RETRY_DELAY_MS = 80;
const STARTUP_LOG_PREFIX = "[desktop-startup]";
const STARTUP_THEME_SCALE_MAP = {
  "tech-blue": { 200: "#bfdbfe", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 800: "#1e40af", 950: "#172554" },
  lobster: { 200: "#fecaca", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 800: "#991b1b", 950: "#450a0a" },
  "green-tech": { 200: "#a7f3d0", 400: "#34d399", 500: "#10b981", 600: "#059669", 800: "#065f46", 950: "#022c22" },
  zinc: { 200: "#e4e4e7", 400: "#a1a1aa", 500: "#71717a", 600: "#52525b", 800: "#27272a", 950: "#09090b" },
  violet: { 200: "#ddd6fe", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 800: "#5b21b6", 950: "#2e1065" },
  rose: { 200: "#fecdd3", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 800: "#9f1239", 950: "#4c0519" },
} as const;

const INITIAL_STARTUP_MILESTONES: StartupMilestoneSnapshot = {
  hasWindowPresented: false,
  hasRuntimeConnected: false,
  hasShellBootstrapped: false,
  hasShellMounted: false,
};

type StartupLogLevel = "info" | "warn" | "error";

function resolveErrorMessage(error: unknown, language: StartupAppearanceSnapshot["language"]) {
  const fallback =
    language === "zh"
      ? "\u65e0\u6cd5\u5b8c\u6210\u684c\u9762\u5de5\u4f5c\u53f0\u521d\u59cb\u5316\uff0c\u8bf7\u68c0\u67e5\u8fd0\u884c\u73af\u5883\u540e\u91cd\u8bd5\u3002"
      : "The desktop workspace could not be initialized. Review the runtime and try again.";

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function waitFor(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function writeStartupLog(
  level: StartupLogLevel,
  runId: number,
  elapsedMs: number,
  message: string,
  details?: unknown,
) {
  const logger =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  const prefix = `${STARTUP_LOG_PREFIX}[run:${runId}][${elapsedMs}ms] ${message}`;

  if (typeof details === "undefined") {
    logger(prefix);
    return;
  }

  logger(prefix, details);
}

interface DesktopShellErrorBoundaryProps {
  resetKey: number;
  onError: (error: Error) => void;
  children: ReactNode;
}

interface DesktopShellErrorBoundaryState {
  hasError: boolean;
}

class DesktopShellErrorBoundary extends Component<
  DesktopShellErrorBoundaryProps,
  DesktopShellErrorBoundaryState
> {
  state: DesktopShellErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): DesktopShellErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    this.props.onError(error);
  }

  componentDidUpdate(prevProps: DesktopShellErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export function readInitialStartupAppearance() {
  if (typeof window === "undefined") {
    return readStartupAppearanceSnapshot({
      storageValue: null,
      browserLanguage: "en-US",
      prefersDark: false,
    });
  }

  let storageValue: string | null = null;

  try {
    storageValue = window.localStorage.getItem(APP_STORAGE_KEY);
  } catch {
    storageValue = null;
  }

  return readStartupAppearanceSnapshot({
    storageValue,
    browserLanguage: window.navigator.language,
    prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  });
}

export function applyStartupAppearanceHints(appearance: StartupAppearanceSnapshot) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const scale = STARTUP_THEME_SCALE_MAP[appearance.themeColor];
  root.setAttribute("lang", appearance.language);
  root.setAttribute("data-theme", appearance.themeColor);
  root.style.colorScheme = appearance.isDark ? "dark" : "light";

  if (appearance.isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.style.setProperty("--theme-primary-200", scale[200]);
  root.style.setProperty("--theme-primary-400", scale[400]);
  root.style.setProperty("--theme-primary-500", scale[500]);
  root.style.setProperty("--theme-primary-600", scale[600]);
  root.style.setProperty("--theme-primary-800", scale[800]);
  root.style.setProperty("--theme-primary-950", scale[950]);
  root.style.setProperty("--ai-primary", scale[500]);
  root.style.setProperty("--ai-primary-soft", withAlpha(scale[500], appearance.isDark ? 0.16 : 0.1));
  root.style.setProperty("--ai-primary-glow", withAlpha(scale[500], 0.22));
  root.style.setProperty("--text-on-accent", "#ffffff");
  root.style.setProperty("--bg-primary", appearance.isDark ? "#09090b" : "#f4f4f5");
  root.style.setProperty("--bg-secondary", appearance.isDark ? "rgba(9, 9, 11, 0.78)" : "rgba(255, 255, 255, 0.72)");
  root.style.setProperty("--bg-hover", appearance.isDark ? "rgba(255,255,255,0.06)" : "rgba(24,24,27,0.05)");
  root.style.setProperty("--text-primary", appearance.isDark ? "#fafafa" : "#18181b");
  root.style.setProperty("--text-secondary", appearance.isDark ? "#d4d4d8" : "#3f3f46");
  root.style.setProperty("--shell-sidebar-brand-fg", "#ffffff");
  root.style.setProperty("--shell-sidebar-presence-bg", "#22c55e");
  root.style.setProperty("--shell-sidebar-badge-bg", "#ef4444");
  root.style.setProperty("--shell-sidebar-badge-text", "#ffffff");
  root.style.setProperty("--shell-danger-border-hover", "rgba(239,68,68,0.3)");

  document.body.style.backgroundColor = appearance.isDark ? "#09090b" : "#f4f4f5";
  document.body.style.color = appearance.isDark ? "#fafafa" : "#18181b";
}

export function DesktopBootstrapApp({
  appName,
  initialAppearance,
}: DesktopBootstrapAppProps) {
  const [appearance] = useState(initialAppearance);
  const [retrySeed, setRetrySeed] = useState(0);
  const [milestones, setMilestones] = useState<StartupMilestoneSnapshot>(
    INITIAL_STARTUP_MILESTONES,
  );
  const [shouldRenderShell, setShouldRenderShell] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [status, setStatus] = useState<"booting" | "launching" | "error">("booting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const bootRunIdRef = useRef(0);
  const splashHandoffRunIdRef = useRef(0);
  const stageLogSignatureRef = useRef("");

  const stage = useMemo(
    () => resolveStartupBootstrapStage(milestones),
    [milestones],
  );
  const progress = useMemo(
    () =>
      getStartupProgressModel({
        milestones,
        language: appearance.language,
        appName,
      }),
    [appName, appearance.language, milestones],
  );

  useEffect(() => {
    const signature = `${bootRunIdRef.current}:${stage}:${status}:${progress.progress}`;
    if (stageLogSignatureRef.current === signature) {
      return;
    }

    stageLogSignatureRef.current = signature;
    writeStartupLog(
      "info",
      bootRunIdRef.current,
      Math.max(0, Date.now() - startedAtRef.current),
      `Stage changed to "${stage}"`,
      {
        status,
        progress: progress.progress,
        isSplashVisible,
        shouldRenderShell,
        milestones,
      },
    );
  }, [isSplashVisible, milestones, progress.progress, shouldRenderShell, stage, status]);

  useEffect(() => {
    if (
      stage !== "ready"
      || status === "error"
      || splashHandoffRunIdRef.current === bootRunIdRef.current
    ) {
      return;
    }

    const runId = bootRunIdRef.current;
    splashHandoffRunIdRef.current = runId;
    let cancelled = false;

    void (async () => {
      writeStartupLog(
        "info",
        runId,
        Math.max(0, Date.now() - startedAtRef.current),
        "Startup marked ready. Waiting for splash handoff.",
      );
      await waitFor(
        getStartupMinimumWaitMs({
          currentTimeMs: Date.now(),
          startedAtMs: startedAtRef.current,
          minimumVisibleMs: SPLASH_MINIMUM_VISIBLE_MS,
        }),
      );
      if (cancelled || bootRunIdRef.current !== runId) {
        return;
      }

      writeStartupLog(
        "info",
        runId,
        Math.max(0, Date.now() - startedAtRef.current),
        "Hiding splash screen.",
      );
      setIsSplashVisible(false);
      await waitFor(SPLASH_EXIT_DURATION_MS);

      if (cancelled || bootRunIdRef.current !== runId) {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stage, status]);

  useEffect(() => {
    if (!shouldRenderShell || status !== "launching" || milestones.hasShellMounted) {
      return;
    }

    const runId = bootRunIdRef.current;
    let cancelled = false;

    void (async () => {
      writeStartupLog(
        "info",
        runId,
        Math.max(0, Date.now() - startedAtRef.current),
        "Shell render requested. Waiting for first paints.",
      );
      await waitForNextPaint();
      await waitForNextPaint();
      if (cancelled || bootRunIdRef.current !== runId) {
        return;
      }

      writeStartupLog(
        "info",
        runId,
        Math.max(0, Date.now() - startedAtRef.current),
        "Shell first paint confirmed.",
      );
      setMilestones((current) =>
        current.hasShellMounted ? current : { ...current, hasShellMounted: true },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [milestones.hasShellMounted, shouldRenderShell, status]);

  useEffect(() => {
    const runId = bootRunIdRef.current + 1;
    bootRunIdRef.current = runId;
    splashHandoffRunIdRef.current = 0;
    startedAtRef.current = Date.now();
    stageLogSignatureRef.current = "";
    setMilestones(INITIAL_STARTUP_MILESTONES);
    setStatus("booting");
    setErrorMessage(null);
    setShouldRenderShell(false);
    setIsSplashVisible(true);
    applyStartupAppearanceHints(appearance);

    let cancelled = false;

    const logElapsedMs = () => Math.max(0, Date.now() - startedAtRef.current);

    const prepareExistingWindow = async () => {
      const desktopWindow = await getDesktopWindow({ timeoutMs: 0 });
      writeStartupLog("info", runId, logElapsedMs(), "Bootstrap started.", {
        appName,
        isTauriRuntime: isTauriRuntime(),
        hasDesktopWindow: Boolean(desktopWindow),
      });

      if (!desktopWindow) {
        return;
      }

      await desktopWindow.setFullscreen(false).catch(() => {
        // Ignore startup fullscreen reset failures and continue booting.
      });

      await desktopWindow
        .isMaximized()
        .then((isMaximizedWindow) => {
          if (!isMaximizedWindow) {
            return;
          }

          writeStartupLog(
            "info",
            runId,
            logElapsedMs(),
            "Restoring maximized window to default startup size.",
          );
          return desktopWindow.unmaximize();
        })
        .catch(() => {
          // Ignore startup unmaximize failures and continue booting.
        });
    };

    const revealStartupWindow = async () => {
      writeStartupLog("info", runId, logElapsedMs(), "Preparing startup window.", {
        isTauriRuntime: isTauriRuntime(),
      });
      await waitForNextPaint();

      if (!isTauriRuntime()) {
        writeStartupLog(
          "warn",
          runId,
          logElapsedMs(),
          "Skipping native window reveal because Tauri runtime is unavailable.",
        );
        return;
      }

      let desktopWindow = await getDesktopWindow({ timeoutMs: 0 });
      let attempts = 0;

      while (!desktopWindow && attempts < 6) {
        attempts += 1;
        await waitFor(STARTUP_WINDOW_RETRY_DELAY_MS);
        desktopWindow = await getDesktopWindow({ timeoutMs: 0 });
      }

      if (!desktopWindow) {
        writeStartupLog(
          "error",
          runId,
          logElapsedMs(),
          "Desktop window handle was unavailable during startup.",
        );
        throw new Error("The desktop window handle was unavailable during startup.");
      }

      if (attempts > 0) {
        writeStartupLog("info", runId, logElapsedMs(), "Desktop window handle resolved after retries.", {
          attempts,
        });
      }

      await desktopWindow.show();
      await desktopWindow.setFocus().catch(() => {
        // Focus is best-effort after reveal.
      });
      writeStartupLog("info", runId, logElapsedMs(), "Startup window revealed.");
    };

    const connectDesktopRuntime = async () => {
      writeStartupLog("info", runId, logElapsedMs(), "Connecting desktop runtime.", {
        isTauriRuntime: isTauriRuntime(),
      });
      const appInfo = await getAppInfo();
      writeStartupLog("info", runId, logElapsedMs(), "app.getInfo() resolved.", appInfo);
      if (isTauriRuntime() && !appInfo) {
        writeStartupLog(
          "error",
          runId,
          logElapsedMs(),
          "Desktop runtime probe returned an empty payload.",
        );
        throw new Error("The desktop runtime did not respond during startup.");
      }
    };

    void (async () => {
      try {
        await prepareExistingWindow();
        if (cancelled || bootRunIdRef.current !== runId) {
          return;
        }

        await revealStartupWindow();
        if (cancelled || bootRunIdRef.current !== runId) {
          return;
        }

        setMilestones((current) => ({ ...current, hasWindowPresented: true }));

        await connectDesktopRuntime();
        if (cancelled || bootRunIdRef.current !== runId) {
          return;
        }

        setMilestones((current) => ({ ...current, hasRuntimeConnected: true }));
        await waitForNextPaint();
        if (cancelled || bootRunIdRef.current !== runId) {
          return;
        }

        writeStartupLog("info", runId, logElapsedMs(), "Bootstrapping shell runtime.");
        setMilestones((current) => ({ ...current, hasShellBootstrapped: true }));

        writeStartupLog("info", runId, logElapsedMs(), "Shell runtime bootstrapped. Requesting AppRoot render.");
        startTransition(() => {
          setShouldRenderShell(true);
          setStatus("launching");
        });
      } catch (error) {
        if (cancelled || bootRunIdRef.current !== runId) {
          return;
        }

        writeStartupLog("error", runId, logElapsedMs(), "Bootstrap failed.", error);
        setStatus("error");
        setErrorMessage(resolveErrorMessage(error, appearance.language));
        setShouldRenderShell(false);
        setIsSplashVisible(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appearance, retrySeed]);

  const handleShellRenderError = (error: Error) => {
    writeStartupLog(
      "error",
      bootRunIdRef.current,
      Math.max(0, Date.now() - startedAtRef.current),
      "Shell render failed.",
      error,
    );
    bootRunIdRef.current += 1;
    setStatus("error");
    setErrorMessage(resolveErrorMessage(error, appearance.language));
    setShouldRenderShell(false);
    setIsSplashVisible(true);
    setMilestones((current) =>
      current.hasShellMounted ? { ...current, hasShellMounted: false } : current,
    );
  };

  const handleLanguagePreferenceChange = (
    languagePreference: LanguagePreference,
  ) => {
    void setAppLanguage(languagePreference);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {shouldRenderShell ? (
        <DesktopProviders appName={appName}>
          <DesktopShellErrorBoundary
            resetKey={retrySeed}
            onError={handleShellRenderError}
          >
            <div className="h-full w-full">
              <App onLanguagePreferenceChange={handleLanguagePreferenceChange} />
            </div>
          </DesktopShellErrorBoundary>
        </DesktopProviders>
      ) : null}

      <DesktopStartupScreen
        appName={appName}
        language={appearance.language}
        progress={progress}
        status={status}
        errorMessage={errorMessage}
        isVisible={isSplashVisible || status === "error"}
        onRetry={() => {
          setRetrySeed((value) => value + 1);
        }}
      />
    </div>
  );
}

export function resolveDesktopBootstrapContext() {
  const baseAppName = APP_NAME.trim() || "OpenChat";

  return {
    appName: baseAppName.toLowerCase().includes("desktop")
      ? baseAppName
      : `${baseAppName} Desktop`,
    initialAppearance: readInitialStartupAppearance(),
  };
}
