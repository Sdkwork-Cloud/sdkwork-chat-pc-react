/**
 * Global error handling service.
 *
 * Responsibilities:
 * 1. Capture and normalize runtime errors.
 * 2. Emit error events for UI integrations.
 * 3. Report errors through SDK backend APIs.
 */

import { getAppSdkClientWithSession } from '@sdkwork/openchat-pc-kernel';

class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (!listeners) {
      return;
    }
    this.events.set(
      event,
      listeners.filter((item) => item !== listener),
    );
  }

  once(event: string, listener: Function): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
      return;
    }
    this.events.clear();
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }
}

export type ErrorType =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'server'
  | 'client'
  | 'timeout'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  code: string;
  message: string;
  originalError?: any;
  details?: Record<string, any>;
  timestamp: number;
  context?: string;
  userId?: string;
}

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  reportError?: boolean;
  logError?: boolean;
  context?: string;
}

export interface ErrorReport {
  error: AppError;
  userAgent: string;
  url: string;
  timestamp: number;
  sessionId: string;
}

export class ErrorService extends EventEmitter {
  private static instance: ErrorService;
  private errorCount = 0;
  private sessionId = this.generateSessionId();
  private isInitialized = false;

  private constructor() {
    super();
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupGlobalErrorHandlers();
    this.setupPromiseRejectionHandler();
    this.isInitialized = true;
    console.log('[ErrorService] Initialized');
  }

  handleError(error: any, options?: ErrorHandlerOptions): AppError {
    const {
      showNotification = true,
      reportError = true,
      logError = true,
      context = 'unknown',
    } = options || {};

    const appError = this.normalizeError(error, context);
    this.errorCount += 1;

    if (logError) {
      this.logError(appError);
    }

    if (reportError) {
      void this.reportError(appError);
    }

    if (showNotification) {
      this.showErrorNotification(appError);
    }

    this.emit('error', appError);
    this.emit(`error:${appError.type}`, appError);
    this.emit(`error:${appError.code}`, appError);

    return appError;
  }

  private normalizeError(error: any, context: string): AppError {
    if (error && error.type && error.code) {
      return {
        ...error,
        timestamp: error.timestamp || Date.now(),
        context: error.context || context,
      };
    }

    const status = Number(error?.status ?? error?.response?.status ?? 0);
    const message = String(error?.message || 'Unknown error');

    if (error?.name === 'NetworkError' || /network/i.test(message)) {
      return this.createError('network', 'NETWORK_ERROR', 'Network request failed.', error, context);
    }

    if (status === 401 || /unauthorized/i.test(message)) {
      return this.createError('authentication', 'AUTH_ERROR', 'Authentication is invalid or expired.', error, context);
    }

    if (status === 403 || /forbidden/i.test(message)) {
      return this.createError('authorization', 'AUTHZ_ERROR', 'Access denied.', error, context);
    }

    if (status === 400 || /validation/i.test(message)) {
      return this.createError('validation', 'VALIDATION_ERROR', 'Request validation failed.', error, context);
    }

    if (error?.name === 'TimeoutError' || /timeout/i.test(message)) {
      return this.createError('timeout', 'TIMEOUT_ERROR', 'Request timeout.', error, context);
    }

    if (status >= 500) {
      return this.createError('server', 'SERVER_ERROR', 'Internal server error.', error, context);
    }

    if (status >= 400 && status < 500) {
      return this.createError('client', 'CLIENT_ERROR', `Client error: ${message}`, error, context);
    }

    return this.createError('unknown', 'UNKNOWN_ERROR', message, error, context);
  }

  private createError(
    type: ErrorType,
    code: string,
    message: string,
    originalError?: any,
    context?: string,
  ): AppError {
    return {
      type,
      code,
      message,
      originalError,
      details: this.extractErrorDetails(originalError),
      timestamp: Date.now(),
      context,
      userId: this.getUserId(),
    };
  }

  private extractErrorDetails(error: any): Record<string, any> {
    if (!error) {
      return {};
    }

    const details: Record<string, any> = {};

    if (error.status) {
      details.status = error.status;
    }

    if (error.statusText) {
      details.statusText = error.statusText;
    }

    if (error.response) {
      details.response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      };
    }

    if (error.request) {
      details.request = {
        url: error.request.url,
        method: error.request.method,
      };
    }

    if (error.stack) {
      details.stack = error.stack;
    }

    return details;
  }

  private logError(error: AppError): void {
    const level = error.type === 'server' ? 'error' : 'warn';
    console[level](`[ErrorService] ${error.type.toUpperCase()} ERROR:`, {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString(),
      details: error.details,
    });

    if (import.meta.env.DEV && error.originalError?.stack) {
      console.debug('[ErrorService] Original error stack:', error.originalError.stack);
    }
  }

  private async reportError(error: AppError): Promise<void> {
    try {
      const report: ErrorReport = {
        error,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        sessionId: this.sessionId,
      };

      // Use SDK method only. No direct fetch in service layer.
      await getAppSdkClientWithSession()
        .feedback.submitReport({
          type: `client-error:${error.type}`,
          targetId: error.code || 'unknown',
          content: JSON.stringify(report),
        } as any)
        .catch(() => {
          // Ignore reporting failures.
        });

      this.emit('errorReported', report);
    } catch (reportError) {
      console.warn('[ErrorService] Failed to report error:', reportError);
    }
  }

  private showErrorNotification(error: AppError): void {
    this.emit('errorNotification', error);
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        context: 'global',
        showNotification: true,
        reportError: true,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        context: 'promise',
        showNotification: true,
        reportError: true,
      });
    });
  }

  private setupPromiseRejectionHandler(): void {
    if (typeof window !== 'undefined' && 'onunhandledrejection' in window) {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          context: 'browser-promise',
          showNotification: false,
          reportError: true,
        });
      });
      return;
    }

    if (typeof process !== 'undefined' && typeof process.on === 'function') {
      process.on('unhandledRejection', (reason) => {
        this.handleError(reason, {
          context: 'node-promise',
          showNotification: false,
          reportError: true,
        });
      });
    }
  }

  private getUserId(): string | undefined {
    try {
      const authData = localStorage.getItem('openchat_auth_data');
      if (!authData) {
        return undefined;
      }
      const parsed = JSON.parse(authData) as { user?: { id?: string } };
      return parsed.user?.id;
    } catch {
      return undefined;
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  getErrorStats() {
    return {
      errorCount: this.errorCount,
      sessionId: this.sessionId,
      startTime: this.sessionId.split('-')[0],
    };
  }

  resetErrorStats(): void {
    this.errorCount = 0;
    this.sessionId = this.generateSessionId();
  }

  createNetworkError(_details?: Record<string, any>): AppError {
    return this.createError('network', 'NETWORK_ERROR', 'Network request failed.', null, 'network');
  }

  createAuthError(_details?: Record<string, any>): AppError {
    return this.createError('authentication', 'AUTH_ERROR', 'Authentication is invalid or expired.', null, 'auth');
  }

  createValidationError(message: string, _details?: Record<string, any>): AppError {
    return this.createError('validation', 'VALIDATION_ERROR', message, null, 'validation');
  }

  createServerError(_details?: Record<string, any>): AppError {
    return this.createError('server', 'SERVER_ERROR', 'Internal server error.', null, 'server');
  }
}

export const errorService = ErrorService.getInstance();

export function handleError(error: any, options?: ErrorHandlerOptions): AppError {
  return errorService.handleError(error, options);
}

export async function handleAsyncError<T>(
  fn: () => Promise<T>,
  options?: ErrorHandlerOptions,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    errorService.handleError(error, options);
    throw error;
  }
}

export function createApiErrorInterceptor() {
  return {
    response: (response: any) => response,
    error: (error: any) => {
      errorService.handleError(error, {
        context: 'api',
        showNotification: true,
        reportError: true,
      });
      return Promise.reject(error);
    },
  };
}

export default ErrorService;
