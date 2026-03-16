import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import {
  ToolCategory,
  type AuthConfig,
  type ToolCategoryInfo,
  type ToolMarketItem,
  type ToolTestResult,
  type UserTool,
} from "../entities/tool.entity";

const MY_TOOLS_STORAGE_KEY = "openchat.tools.enabled";
const FAVORITE_TOOLS_STORAGE_KEY = "openchat.tools.favorite";
const RECENT_TOOLS_STORAGE_KEY = "openchat.tools.recent";
const MAX_RECENT_TOOL_COUNT = 12;

let enabledTools = new Map<string, UserTool>();
let favoriteToolIds = new Set<string>();
let recentToolIds: string[] = [];

function readEnabledToolsFromStorage(): Map<string, UserTool> {
  if (typeof localStorage === "undefined") {
    return new Map<string, UserTool>();
  }

  try {
    const raw = localStorage.getItem(MY_TOOLS_STORAGE_KEY);
    if (!raw) {
      return new Map<string, UserTool>();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Map<string, UserTool>();
    }

    const map = new Map<string, UserTool>();
    parsed.forEach((item) => {
      const normalized = normalizeUserTool(item);
      if (normalized.toolId) {
        map.set(normalized.toolId, normalized);
      }
    });
    return map;
  } catch {
    return new Map<string, UserTool>();
  }
}

function persistEnabledTools(): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  const list = Array.from(enabledTools.values()).map((item) => ({ ...item }));
  localStorage.setItem(MY_TOOLS_STORAGE_KEY, JSON.stringify(list));
}

function readFavoriteToolIdsFromStorage(): Set<string> {
  if (typeof localStorage === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = localStorage.getItem(FAVORITE_TOOLS_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function persistFavoriteToolIds(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(FAVORITE_TOOLS_STORAGE_KEY, JSON.stringify(Array.from(favoriteToolIds)));
}

function readRecentToolIdsFromStorage(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(RECENT_TOOLS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, MAX_RECENT_TOOL_COUNT);
  } catch {
    return [];
  }
}

function persistRecentToolIds(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(
    RECENT_TOOLS_STORAGE_KEY,
    JSON.stringify(recentToolIds.slice(0, MAX_RECENT_TOOL_COUNT)),
  );
}

enabledTools = readEnabledToolsFromStorage();
favoriteToolIds = readFavoriteToolIdsFromStorage();
recentToolIds = readRecentToolIdsFromStorage();

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function normalizeTool(raw: unknown): ToolMarketItem {
  const data = raw as Partial<ToolMarketItem>;
  return {
    id: data.id || "",
    name: data.name || "Unknown Tool",
    description: data.description || "",
    icon: data.icon || "TOOL",
    category: (data.category as ToolCategory) || ToolCategory.CUSTOM,
    version: data.version || "0.0.1",
    provider: data.provider || "Unknown",
    isPublic: Boolean(data.isPublic),
    isBuiltin: Boolean(data.isBuiltin),
    endpoint: data.endpoint || "",
    method: data.method || "POST",
    auth: data.auth || { type: "none" },
    headers: data.headers,
    timeout: data.timeout,
    usageCount: Number(data.usageCount ?? 0),
    successRate: Number(data.successRate ?? 0),
    avgResponseTime: Number(data.avgResponseTime ?? 0),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    isEnabled: Boolean(data.isEnabled),
  };
}

function normalizeUserTool(raw: unknown): UserTool {
  const data = raw as Partial<UserTool>;
  return {
    id: data.id || `user-tool-${Date.now()}`,
    toolId: data.toolId || "",
    userId: data.userId || "current-user",
    credentials: data.credentials,
    config: (data.config as Record<string, unknown>) || {},
    enabled: data.enabled ?? true,
    usageCount: Number(data.usageCount ?? 0),
    lastUsedAt: data.lastUsedAt,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

function toToolCategoryInfo(raw: unknown): ToolCategoryInfo {
  const data = raw as Partial<ToolCategoryInfo>;
  return {
    id: data.id || "all",
    name: data.name || "Unknown",
    icon: data.icon || "TAG",
  };
}

export const ToolService = {
  getFavoriteToolIds(): string[] {
    return Array.from(favoriteToolIds);
  },

  isToolFavorite(toolId: string): boolean {
    return favoriteToolIds.has(toolId);
  },

  toggleFavoriteTool(toolId: string): boolean {
    if (favoriteToolIds.has(toolId)) {
      favoriteToolIds.delete(toolId);
      persistFavoriteToolIds();
      return false;
    }

    favoriteToolIds.add(toolId);
    persistFavoriteToolIds();
    return true;
  },

  getRecentToolIds(): string[] {
    return [...recentToolIds];
  },

  markToolOpened(toolId: string): string[] {
    const filtered = recentToolIds.filter((id) => id !== toolId);
    recentToolIds = [toolId, ...filtered].slice(0, MAX_RECENT_TOOL_COUNT);
    persistRecentToolIds();
    return [...recentToolIds];
  },

  resetWorkspaceState(): void {
    enabledTools = new Map<string, UserTool>();
    favoriteToolIds = new Set<string>();
    recentToolIds = [];

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(MY_TOOLS_STORAGE_KEY);
      localStorage.removeItem(FAVORITE_TOOLS_STORAGE_KEY);
      localStorage.removeItem(RECENT_TOOLS_STORAGE_KEY);
    }
  },

  async getCategories(): Promise<ToolCategoryInfo[]> {
    const response = await getAppSdkClientWithSession().tool.listCategories();
    const data = unwrapData<unknown>(response);
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => toToolCategoryInfo(item));
  },

  async getTools(
    category?: string,
    keyword?: string,
    sortBy: "popular" | "successRate" | "newest" = "popular",
  ): Promise<ToolMarketItem[]> {
    const response = await getAppSdkClientWithSession().tool.listMarket({ category, keyword, sortBy });
    const data = unwrapData<unknown>(response);
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] })?.items)
        ? ((data as { items: unknown[] }).items ?? [])
        : [];

    return list.map((item) => {
      const tool = normalizeTool(item);
      return {
        ...tool,
        isEnabled: enabledTools.has(tool.id) || tool.isEnabled,
      };
    });
  },

  async getToolById(toolId: string): Promise<ToolMarketItem | null> {
    const response = await getAppSdkClientWithSession().tool.getMarketItem(toolId);
    const data = unwrapData<unknown>(response);
    if (!data) {
      return null;
    }
    const tool = normalizeTool(data);
    return {
      ...tool,
      isEnabled: enabledTools.has(tool.id) || tool.isEnabled,
    };
  },

  async getMyTools(): Promise<UserTool[]> {
    const response = await getAppSdkClientWithSession().tool.listMine();
    const data = unwrapData<unknown>(response);
    const list = Array.isArray(data) ? data : [];
    const normalized = list.map((item) => normalizeUserTool(item));
    enabledTools = new Map(normalized.map((item) => [item.toolId, item]));
    persistEnabledTools();
    return normalized;
  },

  async addTool(toolId: string, credentials?: AuthConfig): Promise<UserTool> {
    const response = await getAppSdkClientWithSession().tool.install({ toolId, credentials } as any);
    const tool = normalizeUserTool(unwrapData<unknown>(response));
    const normalized: UserTool = {
      ...tool,
      toolId: tool.toolId || toolId,
      credentials: credentials || tool.credentials,
      enabled: true,
      updatedAt: new Date().toISOString(),
    };
    enabledTools.set(normalized.toolId, normalized);
    persistEnabledTools();
    return normalized;
  },

  async removeTool(toolId: string): Promise<void> {
    await getAppSdkClientWithSession().tool.uninstall(toolId);
    enabledTools.delete(toolId);
    favoriteToolIds.delete(toolId);
    recentToolIds = recentToolIds.filter((id) => id !== toolId);
    persistEnabledTools();
    persistFavoriteToolIds();
    persistRecentToolIds();
  },

  async updateToolCredentials(toolId: string, credentials: AuthConfig): Promise<UserTool> {
    const response = await getAppSdkClientWithSession().tool.updateCredentials(toolId, { credentials } as any);
    const tool = normalizeUserTool(unwrapData<unknown>(response));
    const normalized: UserTool = {
      ...tool,
      toolId: tool.toolId || toolId,
      credentials,
      updatedAt: new Date().toISOString(),
    };
    enabledTools.set(normalized.toolId, normalized);
    persistEnabledTools();
    return normalized;
  },

  async testTool(toolId: string): Promise<ToolTestResult> {
    const response = await getAppSdkClientWithSession().tool.test(toolId);
    const data = unwrapData<unknown>(response);
    if (data && typeof data === "object") {
      const result = data as Partial<ToolTestResult>;
      return {
        success: Boolean(result.success),
        responseTime: Number(result.responseTime ?? 0),
        response: result.response,
        error: result.error,
      };
    }
    return { success: true, responseTime: 0, response: data };
  },
};

export default ToolService;
