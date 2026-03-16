import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import type { App, AppCategory, SearchResult } from "../entities/app.entity";

const APP_INSTALL_STORAGE_KEY = "openchat.appstore.install-state";

const DEFAULT_CATEGORIES: AppCategory[] = [
  { id: "all", name: "All", nameEn: "All", icon: "ALL", color: "#2563eb", appCount: 0 },
  { id: "tool", name: "Tool", nameEn: "Tool", icon: "TL", color: "#0ea5e9", appCount: 0 },
  { id: "plugin", name: "Plugin", nameEn: "Plugin", icon: "PL", color: "#f97316", appCount: 0 },
  { id: "theme", name: "Theme", nameEn: "Theme", icon: "TH", color: "#14b8a6", appCount: 0 },
];

type SearchAppParams = {
  keyword?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
};

interface PersistedInstallState {
  installedAt: string;
  lastOpenedAt?: string;
  openCount: number;
}

type PersistedInstallStateRecord = Record<string, PersistedInstallState>;

export interface AppInstallState {
  appId: string;
  installed: boolean;
  installedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
}

let memoryInstallStateRecord: PersistedInstallStateRecord = {};

type PartialAppCategory = Partial<AppCategory>;
type PartialApp = Partial<App> & {
  category?: PartialAppCategory | string;
};

function readInstallStateRecord(): PersistedInstallStateRecord {
  if (typeof localStorage === "undefined") {
    return { ...memoryInstallStateRecord };
  }

  try {
    const raw = localStorage.getItem(APP_INSTALL_STORAGE_KEY);
    if (!raw) {
      return { ...memoryInstallStateRecord };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const record: PersistedInstallStateRecord = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([appId, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }

      const payload = value as {
        installedAt?: unknown;
        lastOpenedAt?: unknown;
        openCount?: unknown;
      };

      if (typeof payload.installedAt !== "string" || payload.installedAt.length === 0) {
        return;
      }

      record[appId] = {
        installedAt: payload.installedAt,
        lastOpenedAt: typeof payload.lastOpenedAt === "string" ? payload.lastOpenedAt : undefined,
        openCount: Number(payload.openCount ?? 0) || 0,
      };
    });

    memoryInstallStateRecord = { ...record };
    return record;
  } catch {
    return { ...memoryInstallStateRecord };
  }
}

function writeInstallStateRecord(record: PersistedInstallStateRecord): void {
  memoryInstallStateRecord = { ...record };
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(APP_INSTALL_STORAGE_KEY, JSON.stringify(record));
}

function toAppInstallState(appId: string, payload?: PersistedInstallState): AppInstallState {
  if (!payload) {
    return {
      appId,
      installed: false,
      installedAt: null,
      lastOpenedAt: null,
      openCount: 0,
    };
  }

  return {
    appId,
    installed: true,
    installedAt: payload.installedAt,
    lastOpenedAt: payload.lastOpenedAt || null,
    openCount: payload.openCount,
  };
}

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function normalizeCategory(category: PartialAppCategory, defaultCount = 0): AppCategory {
  return {
    id: category.id || "all",
    name: category.name || "All",
    nameEn: category.nameEn || category.name || "All",
    icon: category.icon || "ALL",
    color: category.color || "#2563eb",
    appCount: Number(category.appCount ?? defaultCount),
  };
}

function resolveCategory(value: PartialAppCategory | string | undefined): AppCategory {
  if (typeof value === "string") {
    return DEFAULT_CATEGORIES.find((item) => item.id === value) || DEFAULT_CATEGORIES[0];
  }
  if (value && typeof value === "object") {
    const byId = value.id ? DEFAULT_CATEGORIES.find((item) => item.id === value.id) : null;
    return normalizeCategory({ ...byId, ...value }, byId?.appCount || 0);
  }
  return DEFAULT_CATEGORIES[0];
}

function normalizeApp(payload: PartialApp): App {
  const category = resolveCategory(payload.category);
  return {
    id: payload.id || "",
    name: payload.name || "Unnamed App",
    nameEn: payload.nameEn || payload.name || "Unnamed App",
    shortDescription: payload.shortDescription || "",
    description: payload.description || "",
    icon: payload.icon || "APP",
    coverImage: payload.coverImage,
    screenshots: Array.isArray(payload.screenshots) ? payload.screenshots : [],
    developer: {
      id: payload.developer?.id || "unknown",
      name: payload.developer?.name || "Unknown",
      avatar: payload.developer?.avatar,
      verified: Boolean(payload.developer?.verified),
      appCount: Number(payload.developer?.appCount ?? 0),
      rating: Number(payload.developer?.rating ?? 0),
    },
    category,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    features: Array.isArray(payload.features) ? payload.features : [],
    version: payload.version || "0.0.1",
    size: payload.size || "-",
    downloads: Number(payload.downloads ?? 0),
    rating: {
      average: Number(payload.rating?.average ?? 0),
      count: Number(payload.rating?.count ?? 0),
      distribution: Array.isArray(payload.rating?.distribution) ? payload.rating.distribution : [0, 0, 0, 0, 0],
    },
    price: Number(payload.price ?? 0),
    currency: payload.currency || "CNY",
    inAppPurchases: Boolean(payload.inAppPurchases),
    ageRating: payload.ageRating || "12+",
    languages: Array.isArray(payload.languages) ? payload.languages : [],
    released: payload.released || "",
    updated: payload.updated || "",
    website: payload.website,
    privacyPolicy: payload.privacyPolicy,
    supportEmail: payload.supportEmail,
    type: payload.type || "plugin",
    status: payload.status || "active",
    featured: Boolean(payload.featured),
    editorChoice: Boolean(payload.editorChoice),
    trending: Boolean(payload.trending),
  };
}

export async function getCategories(): Promise<AppCategory[]> {
  const response = await getAppSdkClientWithSession().category.listCategories();
  const data = unwrapData<unknown>(response);
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => normalizeCategory(item as PartialAppCategory));
}

export async function searchApps(params: SearchAppParams = {}): Promise<SearchResult> {
  const response = await getAppSdkClientWithSession().app.searchApps({
    keyword: params.keyword,
    categoryId: params.categoryId,
    page: params.page,
    pageSize: params.pageSize,
  });

  const data = unwrapData<unknown>(response);
  if (data && typeof data === "object" && "apps" in data) {
    const result = data as { apps: unknown[]; total?: number; page?: number; pageSize?: number };
    return {
      apps: Array.isArray(result.apps) ? result.apps.map((item) => normalizeApp(item as PartialApp)) : [],
      total: Number(result.total ?? 0),
      page: Number(result.page ?? params.page ?? 1),
      pageSize: Number(result.pageSize ?? params.pageSize ?? 24),
    };
  }

  const list = Array.isArray(data) ? data.map((item) => normalizeApp(item as PartialApp)) : [];
  return {
    apps: list,
    total: list.length,
    page: params.page || 1,
    pageSize: params.pageSize || list.length || 24,
  };
}

export async function getAppById(appId: string): Promise<App | null> {
  const response = await getAppSdkClientWithSession().app.retrieve(appId);
  const data = unwrapData<unknown>(response);
  if (!data) {
    return null;
  }
  return normalizeApp(data as PartialApp);
}

export function getInstalledAppIds(): string[] {
  const record = readInstallStateRecord();
  return Object.keys(record);
}

export function getAppInstallState(appId: string): AppInstallState {
  const record = readInstallStateRecord();
  return toAppInstallState(appId, record[appId]);
}

export function getAppInstallStateMap(appIds: string[]): Record<string, AppInstallState> {
  const record = readInstallStateRecord();
  return appIds.reduce<Record<string, AppInstallState>>((acc, appId) => {
    acc[appId] = toAppInstallState(appId, record[appId]);
    return acc;
  }, {});
}

export function getInstalledAppStates(appIds?: string[]): AppInstallState[] {
  const record = readInstallStateRecord();
  const appIdSet = appIds ? new Set(appIds) : null;

  const states = Object.entries(record)
    .filter(([appId]) => (appIdSet ? appIdSet.has(appId) : true))
    .map(([appId, payload]) => toAppInstallState(appId, payload));

  states.sort((left, right) => {
    const leftOpenedAt = left.lastOpenedAt ? new Date(left.lastOpenedAt).getTime() : 0;
    const rightOpenedAt = right.lastOpenedAt ? new Date(right.lastOpenedAt).getTime() : 0;
    const openedDiff = rightOpenedAt - leftOpenedAt;
    if (openedDiff !== 0) {
      return openedDiff;
    }

    const leftInstalledAt = left.installedAt ? new Date(left.installedAt).getTime() : 0;
    const rightInstalledAt = right.installedAt ? new Date(right.installedAt).getTime() : 0;
    const installDiff = rightInstalledAt - leftInstalledAt;
    if (installDiff !== 0) {
      return installDiff;
    }

    return right.openCount - left.openCount;
  });

  return states;
}

export function resetAppInstallState(): void {
  memoryInstallStateRecord = {};
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(APP_INSTALL_STORAGE_KEY);
  }
}

export async function installApp(appId: string): Promise<AppInstallState> {
  const record = readInstallStateRecord();
  const current = record[appId];

  if (!current) {
    record[appId] = {
      installedAt: new Date().toISOString(),
      openCount: 0,
    };
    writeInstallStateRecord(record);
  }

  return toAppInstallState(appId, record[appId]);
}

export async function uninstallApp(appId: string): Promise<void> {
  const record = readInstallStateRecord();
  if (!record[appId]) {
    return;
  }

  delete record[appId];
  writeInstallStateRecord(record);
}

export function markAppOpened(appId: string): AppInstallState {
  const record = readInstallStateRecord();
  const current = record[appId];
  if (!current) {
    return toAppInstallState(appId, undefined);
  }

  const next: PersistedInstallState = {
    installedAt: current.installedAt,
    openCount: current.openCount + 1,
    lastOpenedAt: new Date().toISOString(),
  };
  record[appId] = next;
  writeInstallStateRecord(record);
  return toAppInstallState(appId, next);
}

export type { SearchAppParams };
