import { Component, type ErrorInfo, type ReactNode } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    if (import.meta.env.MODE === "production") {
      this.reportError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.state.hasError || !this.props.resetKeys || !prevProps.resetKeys) {
      return;
    }

    const hasResetKeyChanged = this.props.resetKeys.some(
      (key, index) => key !== prevProps.resetKeys?.[index],
    );

    if (hasResetKeyChanged) {
      this.reset();
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Reporting error", {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  const { tr } = useAppTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1E293B] p-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(239,68,68,0.1)]">
          <svg className="h-8 w-8 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-center text-xl font-semibold text-[#F8FAFC]">{tr("Something went wrong")}</h2>
        <p className="mb-4 text-center text-[#94A3B8]">
          {tr("The application encountered an unexpected issue. Please try again.")}
        </p>

        {import.meta.env.MODE === "development" && error ? (
          <div className="mb-4 overflow-auto rounded-lg bg-[#0F172A] p-3">
            <p className="break-all font-mono text-sm text-[#EF4444]">{error.message}</p>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 rounded-lg bg-[#0EA5E9] px-4 py-2 text-white transition-colors hover:bg-[#0284C7]"
          >
            {tr("Retry")}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#1E293B] px-4 py-2 text-[#F8FAFC] transition-colors hover:bg-[#334155]"
          >
            {tr("Reload page")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
