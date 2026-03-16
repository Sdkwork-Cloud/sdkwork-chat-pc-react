import { AppEvents, eventEmitter, getAppSdkClientWithSession, type Result } from "@sdkwork/openchat-pc-kernel";
import type { SearchFilters, SearchHistoryItem, SearchResultItem, SearchResultType, SearchSuggestion } from "../types";

const HISTORY_STORAGE_KEY = "openchat.search.history";
const MAX_HISTORY = 20;
const MAX_RESULTS = 30;

function toResult<T>(response: unknown, defaultData: T): Result<T> {
  if (response && typeof response === "object" && "success" in response) {
    const payload = response as Partial<Result<T>>;
    return {
      success: Boolean(payload.success),
      data: (payload.data as T | undefined) ?? defaultData,
      message: typeof payload.message === "string" ? payload.message : undefined,
      error: typeof payload.error === "string" ? payload.error : undefined,
      code: typeof payload.code === "number" ? payload.code : undefined,
    };
  }

  if (response && typeof response === "object" && "data" in response) {
    return { success: true, data: ((response as { data: T }).data ?? defaultData) as T };
  }

  if (response === undefined || response === null) {
    return { success: true, data: defaultData };
  }

  return { success: true, data: response as T };
}

function normalizeType(value: unknown): SearchResultType {
  const supported: SearchResultType[] = [
    "agent",
    "chat",
    "contact",
    "file",
    "article",
    "creation",
    "command",
    "setting",
  ];
  return typeof value === "string" && supported.includes(value as SearchResultType)
    ? (value as SearchResultType)
    : "file";
}

function normalizeResult(input: Partial<SearchResultItem>): SearchResultItem {
  return {
    id: input.id || `result-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: input.title || "Untitled result",
    subtitle: input.subtitle,
    description: input.description,
    icon: input.icon,
    type: normalizeType(input.type),
    score: Number.isFinite(Number(input.score)) ? Number(input.score) : 0,
    timestamp: Number.isFinite(Number(input.timestamp)) ? Number(input.timestamp) : undefined,
    meta: input.meta,
  };
}

function normalizeHistory(input: Partial<SearchHistoryItem>): SearchHistoryItem {
  return {
    id: input.id || `history-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    query: String(input.query || "").trim(),
    timestamp: Number.isFinite(Number(input.timestamp)) ? Number(input.timestamp) : Date.now(),
    resultCount: Number.isFinite(Number(input.resultCount)) ? Number(input.resultCount) : 0,
  };
}

function normalizeSuggestion(input: Partial<SearchSuggestion>): SearchSuggestion {
  const type = input.type === "history" || input.type === "related" || input.type === "trending"
    ? input.type
    : "related";
  return {
    id: input.id || `suggestion-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    text: String(input.text || "").trim(),
    type,
  };
}

class SearchServiceImpl {
  private historyCache: SearchHistoryItem[] = [];

  constructor() {
    this.historyCache = this.readHistoryFromStorage();
    eventEmitter.on(AppEvents.DATA_UPDATED, () => {
      this.historyCache = this.readHistoryFromStorage();
    });
  }

  private readHistoryFromStorage(): SearchHistoryItem[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((item) => normalizeHistory(item as Partial<SearchHistoryItem>))
        .filter((item) => item.query.length > 0)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_HISTORY);
    } catch {
      return [];
    }
  }

  private persistHistory(history: SearchHistoryItem[]): void {
    const normalized = history
      .map((item) => normalizeHistory(item))
      .filter((item) => item.query.length > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY);
    this.historyCache = normalized;

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalized));
    }
  }

  async search(query: string, filters: SearchFilters = {}): Promise<Result<SearchResultItem[]>> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return { success: true, data: [] };
    }

    const response = await getAppSdkClientWithSession().search.global({
      q: normalizedQuery,
      type: filters.type,
      dateRange: filters.dateRange,
      sortBy: filters.sortBy,
    });
    const result = toResult<unknown>(response, []);
    if (!result.success) {
      return { ...result, data: [] };
    }
    const list = Array.isArray(result.data)
      ? result.data.map((item) => normalizeResult(item as Partial<SearchResultItem>))
      : [];
    return { ...result, data: list.slice(0, MAX_RESULTS) };
  }

  async getHistory(): Promise<Result<SearchHistoryItem[]>> {
    const response = await getAppSdkClientWithSession().search.getSearchHistory();
    const result = toResult<unknown>(response, []);
    if (!result.success) {
      return { ...result, data: this.historyCache };
    }
    const list = Array.isArray(result.data)
      ? result.data.map((item) => normalizeHistory(item as Partial<SearchHistoryItem>))
      : [];
    return { ...result, data: list };
  }

  async addHistory(query: string, resultCount: number): Promise<Result<void>> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return { success: true };
    }

    const response = await getAppSdkClientWithSession().search.addSearchHistory({
      keyword: normalizedQuery,
    });
    const result = toResult<unknown>(response, undefined);
    if (!result.success) {
      return { success: false, message: result.message || result.error };
    }

    const next = this.historyCache.filter((item) => item.query !== normalizedQuery);
    next.unshift(
      normalizeHistory({
        id: `history-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        query: normalizedQuery,
        timestamp: Date.now(),
        resultCount,
      }),
    );
    this.persistHistory(next);
    return { success: true, message: result.message };
  }

  async clearHistory(): Promise<Result<void>> {
    const response = await getAppSdkClientWithSession().search.clearSearchHistory();
    const result = toResult<unknown>(response, undefined);
    if (!result.success) {
      return { success: false, message: result.message || result.error };
    }
    this.persistHistory([]);
    return { success: true, message: result.message };
  }

  async removeHistoryItem(id: string): Promise<Result<void>> {
    const response = await getAppSdkClientWithSession().search.deleteSearchHistory(id);
    const result = toResult<unknown>(response, undefined);
    if (!result.success) {
      return { success: false, message: result.message || result.error };
    }
    this.persistHistory(this.historyCache.filter((item) => item.id !== id));
    return { success: true, message: result.message };
  }

  async getSuggestions(query: string): Promise<Result<SearchSuggestion[]>> {
    const normalizedQuery = query.trim();
    const response = await getAppSdkClientWithSession().search.getSearchSuggestions({
      q: normalizedQuery || undefined,
    });
    const result = toResult<unknown>(response, []);
    if (!result.success) {
      return { ...result, data: [] };
    }
    const list = Array.isArray(result.data)
      ? result.data.map((item) => normalizeSuggestion(item as Partial<SearchSuggestion>))
      : [];
    return { ...result, data: list.filter((item) => item.text.length > 0).slice(0, 8) };
  }

  async getTrending(): Promise<Result<SearchSuggestion[]>> {
    const response = await getAppSdkClientWithSession().search.getHotSearches();
    const result = toResult<unknown>(response, []);
    if (!result.success) {
      return { ...result, data: [] };
    }
    const list = Array.isArray(result.data)
      ? result.data.map((item) => normalizeSuggestion(item as Partial<SearchSuggestion>))
      : [];
    return { ...result, data: list.slice(0, 8) };
  }

  executeCommand(item: SearchResultItem): void {
    switch (item.type) {
      case "command":
        eventEmitter.emit("command:execute", {
          id: item.id,
          command: item.meta?.command || item.id,
          title: item.title,
        });
        return;
      case "setting":
        eventEmitter.emit("navigate", { path: "/settings" });
        return;
      case "agent":
        eventEmitter.emit("navigate", {
          path: `/chat?agentId=${encodeURIComponent(item.id)}&agentName=${encodeURIComponent(item.title)}`,
        });
        return;
      case "contact":
        eventEmitter.emit("navigate", {
          path: `/chat?contactId=${encodeURIComponent(item.id)}&contactName=${encodeURIComponent(item.title)}`,
        });
        return;
      default:
        eventEmitter.emit("navigate", { path: `/${item.type}/${item.id}` });
    }
  }
}

export const SearchService = new SearchServiceImpl();
export default SearchService;
