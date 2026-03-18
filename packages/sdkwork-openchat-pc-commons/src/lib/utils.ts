import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDate, formatNumber } from "@sdkwork/openchat-pc-i18n";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "CNY"): string {
  return formatNumber(amount, {
    style: "currency",
    currency,
  });
}

export function formatDistanceToNow(timestamp: number): string {
  const date = new Date(timestamp);
  const diffDays = Math.abs((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays >= 30) {
    return formatDate(date, { dateStyle: "medium" });
  }

  const diffMinutes = Math.round((date.getTime() - Date.now()) / (1000 * 60));
  if (Math.abs(diffMinutes) < 60) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffHours, "hour");
  }

  const diffDaysRounded = Math.round(diffHours / 24);
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffDaysRounded, "day");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** unitIndex;

  return `${formatNumber(Number(value.toFixed(2)))} ${units[unitIndex]}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}
