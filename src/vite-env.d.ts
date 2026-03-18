/// <reference types="vite/client" />

/**
 * Vite environment variable declarations.
 */
interface ImportMetaEnv {
  /**
   * Application metadata.
   */
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_DEBUG: string;
  readonly VITE_LOG_LEVEL: string;

  /**
   * Service endpoints.
   */
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ACCESS_TOKEN: string;
  readonly VITE_IM_WS_URL: string;
  readonly VITE_I18N_DEFAULT_LANGUAGE?: string;
  readonly VITE_APP_DEFAULT_LOCALE?: string;

  /**
   * RTC configuration.
   */
  readonly VITE_RTC_APP_ID: string;
  readonly VITE_RTC_PROVIDER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
