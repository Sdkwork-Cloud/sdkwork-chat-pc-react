import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { ErrorBoundary } from "../ErrorBoundary";

interface AsyncComponentOptions {
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  retryDelay?: number;
  maxRetries?: number;
}

function DefaultLoadingFallback() {
  const { tr } = useAppTranslation();

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex items-center space-x-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0EA5E9] border-t-transparent" />
        <span className="text-sm text-[#94A3B8]">{tr("Loading...")}</span>
      </div>
    </div>
  );
}

function DefaultErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { tr } = useAppTranslation();

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center p-4">
      <div className="mb-3 text-[#EF4444]">
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <p className="mb-4 text-[#94A3B8]">{tr("Failed to load component.")}</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-[#0EA5E9] px-4 py-2 text-white transition-colors hover:bg-[#0284C7]"
      >
        {tr("Retry")}
      </button>
    </div>
  );
}

export function createAsyncComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: AsyncComponentOptions = {},
) {
  const { fallback, errorFallback, retryDelay = 1000, maxRetries = 3 } = options;

  const LazyComponent = lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      let retries = 0;

      const load = () => {
        void importFn()
          .then(resolve)
          .catch((error) => {
            retries += 1;
            if (retries <= maxRetries) {
              window.setTimeout(load, retryDelay * retries);
              return;
            }
            reject(error);
          });
      };

      load();
    });
  });

  return function AsyncComponent(props: React.ComponentProps<T>) {
    return (
      <ErrorBoundary fallback={errorFallback}>
        <Suspense fallback={fallback ?? <DefaultLoadingFallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

export function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
): Promise<{ default: T }> {
  return importFn();
}

export function createRouteComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: AsyncComponentOptions = {},
) {
  const { fallback, errorFallback } = options;
  const LazyComponent = lazy(importFn);

  return function RouteComponent(props: React.ComponentProps<T>) {
    return (
      <ErrorBoundary
        fallback={
          errorFallback ?? (
            <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
              <DefaultErrorFallback onRetry={() => window.location.reload()} />
            </div>
          )
        }
      >
        <Suspense
          fallback={
            fallback ?? (
              <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
                <DefaultLoadingFallback />
              </div>
            )
          }
        >
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

export default createAsyncComponent;
