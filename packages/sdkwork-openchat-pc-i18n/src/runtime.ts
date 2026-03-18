import { useCallback, useMemo } from "react";
import i18n, { type TOptions } from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";

import enUS from "./resources/en-US";
import zhCN from "./resources/zh-CN";

export const APP_LOCALE_STORAGE_KEY = "openchat.locale";
export const SUPPORTED_LANGUAGES = ["zh-CN", "en-US"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
type DateLike = string | number | Date;

function normalizeLanguage(input?: string | null): AppLanguage | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalized.startsWith("en")) {
    return "en-US";
  }

  return null;
}

function resolveDefaultLocale(): AppLanguage {
  const configured =
    typeof import.meta !== "undefined"
      ? normalizeLanguage(
          ((import.meta.env?.VITE_I18N_DEFAULT_LANGUAGE as string | undefined)
            ?? (import.meta.env?.VITE_APP_DEFAULT_LOCALE as string | undefined)
            ?? null),
        )
      : null;

  return configured ?? "zh-CN";
}

export const DEFAULT_LOCALE = resolveDefaultLocale();

const resources = {
  "en-US": { translation: enUS },
  "zh-CN": { translation: zhCN },
} as const;

let initializationPromise: Promise<typeof i18n> | null = null;

function getUrlLocale(): AppLanguage | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeLanguage(params.get("lang"));
}

function getStoredLocale(): AppLanguage | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  return normalizeLanguage(window.localStorage.getItem(APP_LOCALE_STORAGE_KEY));
}

function getNavigatorLocale(): AppLanguage | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  for (const value of navigator.languages || []) {
    const locale = normalizeLanguage(value);
    if (locale) {
      return locale;
    }
  }

  return normalizeLanguage(navigator.language);
}

function getHtmlLocale(): AppLanguage | null {
  if (typeof document === "undefined") {
    return null;
  }

  return normalizeLanguage(document.documentElement.getAttribute("lang"));
}

export function detectAppLanguage(): AppLanguage {
  return getUrlLocale() ?? getStoredLocale() ?? getHtmlLocale() ?? DEFAULT_LOCALE;
}

function syncDocumentLanguage(locale: AppLanguage): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
  document.documentElement.dir = "ltr";
}

function persistLanguage(locale: AppLanguage): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
}

function parseDate(value: DateLike): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function getFormatterLocale(locale?: AppLanguage): AppLanguage {
  return locale ?? getAppLanguage();
}

export async function initializeI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    syncDocumentLanguage(getAppLanguage());
    return i18n;
  }

  if (!initializationPromise) {
    initializationPromise = i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: detectAppLanguage(),
        fallbackLng: "en-US",
        supportedLngs: [...SUPPORTED_LANGUAGES],
        interpolation: {
          escapeValue: false,
        },
        keySeparator: false,
        nsSeparator: false,
        returnNull: false,
      })
      .then(() => i18n);
  }

  await initializationPromise;
  syncDocumentLanguage(getAppLanguage());
  return i18n;
}

export function getAppLanguage(): AppLanguage {
  return normalizeLanguage(i18n.resolvedLanguage || i18n.language) ?? DEFAULT_LOCALE;
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await initializeI18n();
  persistLanguage(language);
  await i18n.changeLanguage(language);
  syncDocumentLanguage(language);
}

export function translate(key: string, options?: TOptions): string {
  return i18n.t(key, {
    defaultValue: key,
    ...options,
  });
}

export function formatDate(value: DateLike, options?: Intl.DateTimeFormatOptions, locale?: AppLanguage): string {
  const parsed = parseDate(value);
  if (!parsed) {
    return typeof value === "string" ? value : "";
  }

  return new Intl.DateTimeFormat(getFormatterLocale(locale), options).format(parsed);
}

export function formatTime(value: DateLike, options?: Intl.DateTimeFormatOptions, locale?: AppLanguage): string {
  return formatDate(value, {
    timeStyle: "short",
    ...options,
  }, locale);
}

export function formatDateTime(value: DateLike, options?: Intl.DateTimeFormatOptions, locale?: AppLanguage): string {
  return formatDate(value, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }, locale);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: AppLanguage): string {
  return new Intl.NumberFormat(getFormatterLocale(locale), options).format(value);
}

export function formatCurrency(
  value: number,
  currency = "CNY",
  options?: Omit<Intl.NumberFormatOptions, "currency" | "style">,
  locale?: AppLanguage,
): string {
  return formatNumber(
    value,
    {
      style: "currency",
      currency,
      ...options,
    },
    locale,
  );
}

export function useAppTranslation() {
  const { t, i18n: runtime } = useTranslation();
  const language = normalizeLanguage(runtime.resolvedLanguage || runtime.language) ?? DEFAULT_LOCALE;
  const tr = useCallback((key: string, options?: TOptions) => {
    return t(key, {
      defaultValue: key,
      ...options,
    });
  }, [t]);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    await setAppLanguage(nextLanguage);
  }, []);

  const formatLocalizedDate = useCallback((value: DateLike, options?: Intl.DateTimeFormatOptions) => {
    return formatDate(value, options, language);
  }, [language]);

  const formatLocalizedTime = useCallback((value: DateLike, options?: Intl.DateTimeFormatOptions) => {
    return formatTime(value, options, language);
  }, [language]);

  const formatLocalizedDateTime = useCallback((value: DateLike, options?: Intl.DateTimeFormatOptions) => {
    return formatDateTime(value, options, language);
  }, [language]);

  const formatLocalizedNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return formatNumber(value, options, language);
  }, [language]);

  const formatLocalizedCurrency = useCallback((
    value: number,
    currency = "CNY",
    options?: Omit<Intl.NumberFormatOptions, "currency" | "style">,
  ) => {
    return formatCurrency(value, currency, options, language);
  }, [language]);

  return useMemo(() => ({
    language,
    tr,
    setLanguage,
    formatDate: formatLocalizedDate,
    formatTime: formatLocalizedTime,
    formatDateTime: formatLocalizedDateTime,
    formatNumber: formatLocalizedNumber,
    formatCurrency: formatLocalizedCurrency,
  }), [
    formatLocalizedCurrency,
    formatLocalizedDate,
    formatLocalizedDateTime,
    formatLocalizedNumber,
    formatLocalizedTime,
    language,
    setLanguage,
    tr,
  ]);
}
