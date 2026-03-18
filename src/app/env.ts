

// ============================================
// ============================================

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'OpenChat';

export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// ============================================
// ============================================

export const IS_DEV = import.meta.env.DEV;

export const IS_PROD = import.meta.env.PROD;

export const MODE = import.meta.env.MODE;

// ============================================
// ============================================

export const DEBUG = import.meta.env.VITE_DEBUG === 'true' || IS_DEV;

export const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || (IS_DEV ? 'debug' : 'error');

// ============================================
// ============================================

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_APP_API_BASE_URL ||
  'http://localhost:3000';

export const IM_WS_URL =
  import.meta.env.VITE_IM_WS_URL ||
  import.meta.env.VITE_APP_IM_WS_URL ||
  'ws://localhost:3000/ws';

export const SDK_ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN || "";

// ============================================
// ============================================

export const RTC_CONFIG = {
  appId: import.meta.env.VITE_RTC_APP_ID || '',
  provider: import.meta.env.VITE_RTC_PROVIDER || 'volcengine',
};

// ============================================
// ============================================

if (IS_DEV || DEBUG) {
  console.log('[Env] ========================================');
  console.log('[Env] APP_NAME:', APP_NAME);
  console.log('[Env] APP_VERSION:', APP_VERSION);
  console.log('[Env] MODE:', MODE);
  console.log('[Env] IS_DEV:', IS_DEV);
  console.log('[Env] IS_PROD:', IS_PROD);
  console.log('[Env] DEBUG:', DEBUG);
  console.log('[Env] LOG_LEVEL:', LOG_LEVEL);
  console.log('[Env] API_BASE_URL:', API_BASE_URL);
  console.log('[Env] IM_WS_URL:', IM_WS_URL);
  console.log('[Env] RTC_PROVIDER:', RTC_CONFIG.provider);
  console.log('[Env] ========================================');
}
