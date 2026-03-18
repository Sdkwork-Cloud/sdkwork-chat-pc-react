import { API_BASE_URL } from "./env";
import { createClient, type SdkworkAppClient } from "@sdkwork/app-sdk";
import { getAppLanguage } from "@sdkwork/openchat-pc-i18n";

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

interface RequestConfig extends Omit<RequestInit, "method" | "body"> {
  params?: QueryParams;
  method?: string;
  body?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

const SDK_API_PREFIX = normalizeSdkPrefix(import.meta.env.VITE_SDKWORK_APP_API_PREFIX || "/app/v3/api");
const SDK_INTEGRATION_ENABLED = parseBoolean(import.meta.env.VITE_SDKWORK_APP_ENABLED, true);
const APP_AUTH_TOKEN_STORAGE_KEY = "sdkwork_token";

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }
  return defaultValue;
}

function normalizeSdkPrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return "/app/v3/api";
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

interface ClientTokens {
  authToken: string | null;
  accessToken: string | null;
}

let sdkClient: SdkworkAppClient | null = null;
let sdkClientLanguage: string | null = null;

function readEnvAccessToken(): string | null {
  return normalizeStoredToken(
    (import.meta.env.VITE_ACCESS_TOKEN as string | undefined) ||
      (import.meta.env.SDKWORK_ACCESS_TOKEN as string | undefined) ||
      null,
  );
}

function normalizeStoredToken(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeAuthToken(value: string | null): string | null {
  const token = normalizeStoredToken(value);
  if (!token) {
    return null;
  }
  if (token.toLowerCase().startsWith("bearer ")) {
    const normalized = token.slice(7).trim();
    return normalized || null;
  }
  return token;
}

function readAuthToken(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return normalizeAuthToken(localStorage.getItem(APP_AUTH_TOKEN_STORAGE_KEY));
}

function readAccessToken(): string | null {
  return readEnvAccessToken();
}

function resolveClientTokens(): ClientTokens {
  return {
    authToken: readAuthToken(),
    accessToken: readAccessToken(),
  };
}

function normalizeSdkBaseUrl(baseUrl: string): string {
  const trimmed = (baseUrl || "").trim();
  if (!trimmed) {
    return "http://localhost:3000";
  }
  return trimmed.replace(/\/+$/g, "");
}

function getSdkClient(): SdkworkAppClient {
  const language = getAppLanguage();
  if (!sdkClient || sdkClientLanguage !== language) {
    sdkClientLanguage = language;
    sdkClient = createClient({
      baseUrl: normalizeSdkBaseUrl(API_BASE_URL),
      accessToken: readEnvAccessToken() || undefined,
      headers: {
        "Accept-Language": language,
      },
      platform: "pc",
    });
  }
  return sdkClient;
}

function bindClientTokens(client: SdkworkAppClient, tokens: ClientTokens): void {
  if (tokens.authToken !== null) {
    client.setAuthToken(tokens.authToken || "");
  } else {
    client.setAuthToken("");
  }
  if (tokens.accessToken !== null) {
    client.setAccessToken(tokens.accessToken || "");
  } else {
    client.setAccessToken("");
  }
}

export function getAppSdkClient(): SdkworkAppClient {
  return getSdkClient();
}

export function getAppSdkClientWithSession(): SdkworkAppClient {
  const client = getSdkClient();
  bindClientTokens(client, resolveClientTokens());
  return client;
}

export function persistAppSdkAuthToken(authToken: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  const normalizedAuthToken = normalizeAuthToken(authToken);
  if (!normalizedAuthToken) {
    localStorage.removeItem(APP_AUTH_TOKEN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(APP_AUTH_TOKEN_STORAGE_KEY, normalizedAuthToken);
}

export function clearAppSdkAuthToken(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(APP_AUTH_TOKEN_STORAGE_KEY);
}

function sdkPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath.startsWith(`${SDK_API_PREFIX}/`) || normalizedPath === SDK_API_PREFIX) {
    return normalizedPath;
  }
  return `${SDK_API_PREFIX}${normalizedPath}`;
}

function endpointForMatch(endpoint: string): string | null {
  if (!endpoint || /^https?:\/\//i.test(endpoint)) {
    return null;
  }
  if (!endpoint.startsWith("/")) {
    return `/${endpoint}`;
  }
  return endpoint;
}

function resolveSdkEndpoint(endpoint: string, methodRaw: string): string | null {
  if (!SDK_INTEGRATION_ENABLED) {
    return null;
  }

  const method = methodRaw.toUpperCase();
  const normalized = endpointForMatch(endpoint);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith(SDK_API_PREFIX)) {
    return normalized;
  }

  // Search
  if (method === "GET" && normalized === "/search") return sdkPath("/search");
  if (normalized === "/search/history") return sdkPath("/search/history");
  if (method === "DELETE" && /^\/search\/history\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized);
  }
  if (method === "GET" && normalized === "/search/suggestions") return sdkPath("/search/suggestions");
  if (method === "GET" && normalized === "/search/trending") return sdkPath("/search/hot");

  // AppStore
  if (method === "GET" && normalized === "/appstore/categories") return sdkPath("/category");
  if (method === "GET" && normalized === "/appstore/apps") return sdkPath("/app/manage/search");
  if (method === "GET" && /^\/appstore\/apps\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/appstore/apps/", "/app/manage/"));
  }

  // Commerce / Products
  if (method === "GET" && normalized === "/commerce/categories") return sdkPath("/category");
  if (method === "GET" && normalized === "/commerce/products") return sdkPath("/products");
  if (method === "GET" && normalized === "/commerce/products/hot") return sdkPath("/products/hot");
  if (method === "GET" && normalized === "/commerce/products/new") return sdkPath("/products/latest");
  if (method === "GET" && /^\/commerce\/products\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/commerce/products/", "/products/"));
  }

  // Commerce / Cart
  if (method === "GET" && normalized === "/commerce/cart") return sdkPath("/cart");
  if (method === "GET" && normalized === "/commerce/cart/count") return sdkPath("/cart/statistics");
  if (method === "POST" && normalized === "/commerce/cart/items") return sdkPath("/cart/items");
  if (method === "PUT" && /^\/commerce\/cart\/items\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/commerce/cart/items/", "/cart/items/"));
  }
  if (method === "DELETE" && /^\/commerce\/cart\/items\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/commerce/cart/items/", "/cart/items/"));
  }
  if (method === "PUT" && /^\/commerce\/cart\/items\/[^/]+\/select$/.test(normalized)) {
    return sdkPath(normalized.replace("/commerce/cart/items/", "/cart/items/"));
  }
  if (method === "PUT" && normalized === "/commerce/cart/select-all") return sdkPath("/cart/items/select");
  if (method === "DELETE" && normalized === "/commerce/cart") return sdkPath("/cart");
  if (method === "DELETE" && normalized === "/commerce/cart/selected") return sdkPath("/cart/items");

  // Notification
  if ((method === "GET" || method === "POST") && normalized === "/notifications") {
    return sdkPath("/notification");
  }
  if (method === "GET" && normalized === "/notifications/page") return sdkPath("/notification");
  if (method === "GET" && normalized === "/notifications/unread-count") return sdkPath("/notification/unread/count");
  if (method === "GET" && normalized === "/notifications/stats") return sdkPath("/notification/unread/count");
  if (method === "PUT" && normalized === "/notifications/read-all") return sdkPath("/notification/read/all");
  if (method === "PUT" && /^\/notifications\/[^/]+\/read$/.test(normalized)) {
    return sdkPath(normalized.replace("/notifications/", "/notification/"));
  }
  if (method === "DELETE" && /^\/notifications\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/notifications/", "/notification/"));
  }
  if (method === "POST" && normalized === "/notifications/clear-read") return sdkPath("/notification/clear");
  if ((method === "GET" || method === "PUT") && normalized === "/notifications/settings") {
    return sdkPath("/notification/settings");
  }

  // Settings
  if (method === "GET" && normalized === "/settings") return sdkPath("/settings");
  if (method === "PUT" && normalized === "/settings/theme") return sdkPath("/settings/ui/theme");
  if (method === "PUT" && normalized === "/settings/privacy") return sdkPath("/settings/privacy");
  if (method === "PUT" && normalized === "/settings/notifications") return sdkPath("/notification/settings");
  if (method === "GET" && normalized === "/settings/models") return sdkPath("/models/active");
  if (method === "GET" && normalized === "/settings/check-update") return sdkPath("/settings/app/version");

  // Discover
  if (method === "GET" && normalized === "/discover/categories") return sdkPath("/category");
  if (method === "GET" && normalized === "/discover/feed") return sdkPath("/feeds/list");
  if (method === "GET" && normalized === "/discover/search") return sdkPath("/feeds/search");
  if (method === "GET" && normalized === "/discover/trending") return sdkPath("/feeds/hot");
  if (method === "GET" && normalized === "/discover/banners") return sdkPath("/advert/banner-adverts");

  // Social moments
  if (method === "GET" && normalized === "/social/moments") return sdkPath("/feeds/list");
  if (method === "POST" && /^\/social\/moments\/[^/]+\/like$/.test(normalized)) {
    return sdkPath(normalized.replace("/social/moments/", "/feeds/like/").replace(/\/like$/, ""));
  }
  if (method === "POST" && /^\/social\/moments\/[^/]+\/comments$/.test(normalized)) {
    return sdkPath("/comments");
  }
  if (method === "DELETE" && /^\/social\/moments\/[^/]+\/comments\/[^/]+$/.test(normalized)) {
    const tokens = normalized.split("/");
    return sdkPath(`/comments/${tokens[tokens.length - 1]}`);
  }

  // Video
  if (method === "GET" && normalized === "/videos") return sdkPath("/video/public");
  if (method === "GET" && normalized === "/videos/stats") return sdkPath("/video/statistics");
  if (method === "GET" && /^\/videos\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/videos/", "/video/"));
  }
  if (method === "POST" && /^\/videos\/[^/]+\/like$/.test(normalized)) {
    return sdkPath(normalized.replace("/videos/", "/video/"));
  }
  if (method === "POST" && /^\/videos\/[^/]+\/collect$/.test(normalized)) {
    return sdkPath(normalized.replace("/videos/", "/video/").replace("/collect", "/favorite"));
  }

  // Wallet
  if (method === "GET" && normalized === "/wallet/summary") return sdkPath("/account/cash");
  if (method === "GET" && normalized === "/wallet/transactions") return sdkPath("/account/cash/history");
  if (method === "POST" && normalized === "/wallet/transfer") return sdkPath("/account/cash/transfer");
  if (method === "GET" && normalized === "/wallet/payment-methods") return sdkPath("/payments/methods");

  // Device
  if ((method === "POST" || method === "GET") && (normalized === "/devices/register" || normalized === "/devices")) {
    return sdkPath("/notification/devices");
  }

  return null;
}

function isQueryValue(value: unknown): value is QueryValue {
  return (
    value === undefined
    || value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
  );
}

function normalizeParams(params?: QueryParams): QueryParams | undefined {
  if (!params) {
    return undefined;
  }
  const normalized: QueryParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (isQueryValue(value) && value !== undefined && value !== null) {
      normalized[key] = value;
    }
  });
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function toQueryParams(value?: Record<string, unknown>): QueryParams | undefined {
  if (!value) {
    return undefined;
  }
  const normalized: QueryParams = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (isQueryValue(entry) && entry !== undefined && entry !== null) {
      normalized[key] = entry;
    }
  });
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeBody(bodyRaw: unknown): Record<string, unknown> {
  if (bodyRaw === undefined || bodyRaw === null) {
    return {};
  }
  if (typeof bodyRaw === "string") {
    try {
      const parsed = JSON.parse(bodyRaw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (
    bodyRaw instanceof FormData ||
    bodyRaw instanceof Blob ||
    bodyRaw instanceof URLSearchParams ||
    bodyRaw instanceof ArrayBuffer ||
    ArrayBuffer.isView(bodyRaw)
  ) {
    throw new Error("[SDK compliance] binary body must be handled by dedicated SDK upload APIs.");
  }
  return typeof bodyRaw === "object" ? (bodyRaw as Record<string, unknown>) : {};
}

function extractId(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  const id = pathname.slice(prefix.length).split("/")[0];
  return id || null;
}

function requireMappedRoute(endpoint: string, method: string): never {
  throw new Error(
    `[SDK compliance] unmapped endpoint, direct HTTP is forbidden: ${method} ${endpoint}. ` +
      "Please add SDK domain method via /upgrade contracts before calling this API.",
  );
}

async function executeMappedSdkRequest<T>(
  client: SdkworkAppClient,
  sdkEndpoint: string,
  method: string,
  params: QueryParams | undefined,
  bodyRaw: unknown,
): Promise<T> {
  const query = normalizeParams(params);
  const body = normalizeBody(bodyRaw);
  const bodyQuery = toQueryParams(body);
  const relative = sdkEndpoint.startsWith(SDK_API_PREFIX)
    ? sdkEndpoint.slice(SDK_API_PREFIX.length)
    : sdkEndpoint;
  const pathname = relative.startsWith("/") ? relative : `/${relative}`;

  // Search
  if (method === "GET" && pathname === "/search") return client.search.global(query) as Promise<T>;
  if (method === "GET" && pathname === "/search/history") return client.search.getSearchHistory(query) as Promise<T>;
  if (method === "POST" && pathname === "/search/history") return client.search.addSearchHistory(body as any) as Promise<T>;
  if (method === "DELETE" && pathname === "/search/history") return client.search.clearSearchHistory() as Promise<T>;
  if (method === "DELETE" && pathname.startsWith("/search/history/")) {
    const keyword = extractId(pathname, "/search/history/");
    if (keyword) return client.search.deleteSearchHistory(keyword) as Promise<T>;
  }
  if (method === "GET" && pathname === "/search/suggestions") return client.search.getSearchSuggestions(query) as Promise<T>;
  if (method === "GET" && pathname === "/search/hot") return client.search.getHotSearches(query) as Promise<T>;

  // App + category + products + cart
  if (method === "GET" && pathname === "/category") return client.category.listCategories(query) as Promise<T>;
  if (method === "GET" && pathname === "/app/manage/search") return client.app.searchApps(query) as Promise<T>;
  if (method === "GET" && pathname.startsWith("/app/manage/")) {
    const appId = extractId(pathname, "/app/manage/");
    if (appId) return client.app.retrieve(appId) as Promise<T>;
  }
  if (method === "GET" && pathname === "/products") return client.product.getProducts(query) as Promise<T>;
  if (method === "GET" && pathname === "/products/hot") return client.product.getHotProducts(query) as Promise<T>;
  if (method === "GET" && pathname === "/products/latest") return client.product.getLatestProducts(query) as Promise<T>;
  if (method === "GET" && pathname.startsWith("/products/")) {
    const productId = extractId(pathname, "/products/");
    if (productId) return client.product.getProductDetail(productId) as Promise<T>;
  }
  if (method === "GET" && pathname === "/cart") return client.cart.getMy() as Promise<T>;
  if (method === "GET" && pathname === "/cart/statistics") return client.cart.getCartStatistics() as Promise<T>;
  if (method === "POST" && pathname === "/cart/items") return client.cart.addItem(body as any) as Promise<T>;
  if (method === "DELETE" && pathname === "/cart/items") return client.cart.removeItems(query) as Promise<T>;
  if (method === "PUT" && pathname === "/cart/items/select") return client.cart.batchUpdateSelection(body as any) as Promise<T>;
  if (method === "PUT" && /^\/cart\/items\/[^/]+\/select$/.test(pathname)) {
    const itemId = extractId(pathname, "/cart/items/");
    if (itemId) return client.cart.updateItemSelection(itemId, query ?? bodyQuery ?? {}) as Promise<T>;
  }
  if (method === "PUT" && /^\/cart\/items\/[^/]+$/.test(pathname)) {
    const itemId = extractId(pathname, "/cart/items/");
    if (itemId) return client.cart.updateItemQuantity(itemId, body as any) as Promise<T>;
  }
  if (method === "DELETE" && /^\/cart\/items\/[^/]+$/.test(pathname)) {
    const itemId = extractId(pathname, "/cart/items/");
    if (itemId) return client.cart.removeItem(itemId) as Promise<T>;
  }
  if (method === "DELETE" && pathname === "/cart") return client.cart.clear() as Promise<T>;

  // Notification
  if (method === "GET" && pathname === "/notification") return client.notification.listNotifications(query) as Promise<T>;
  if (method === "POST" && pathname === "/notification") return client.notification.sendTest(body as any) as Promise<T>;
  if (method === "GET" && pathname === "/notification/unread/count") return client.notification.getUnreadCount() as Promise<T>;
  if (method === "PUT" && pathname === "/notification/read/all") {
    return client.notification.markAllAsRead(query ?? bodyQuery ?? {}) as Promise<T>;
  }
  if (method === "POST" && pathname === "/notification/clear") {
    return client.notification.clearAllNotifications(query ?? bodyQuery ?? {}) as Promise<T>;
  }
  if (method === "GET" && pathname === "/notification/settings") return client.notification.getNotificationSettings() as Promise<T>;
  if (method === "PUT" && pathname === "/notification/settings") {
    return client.notification.updateNotificationSettings(body as any) as Promise<T>;
  }
  if (method === "GET" && pathname === "/notification/devices") return client.notification.listDevices() as Promise<T>;
  if (method === "POST" && pathname === "/notification/devices") return client.notification.registerDevice(body as any) as Promise<T>;
  if (method === "PUT" && /^\/notification\/[^/]+\/read$/.test(pathname)) {
    const notificationId = extractId(pathname, "/notification/");
    if (notificationId) return client.notification.markAsRead(notificationId) as Promise<T>;
  }
  if (method === "DELETE" && /^\/notification\/[^/]+$/.test(pathname)) {
    const notificationId = extractId(pathname, "/notification/");
    if (notificationId) return client.notification.deleteNotification(notificationId) as Promise<T>;
  }

  // Settings + model
  if (method === "GET" && pathname === "/settings") return client.setting.getAllSettings() as Promise<T>;
  if (method === "PUT" && pathname === "/settings/ui/theme") return client.setting.switchTheme(body as any) as Promise<T>;
  if (method === "PUT" && pathname === "/settings/privacy") return client.setting.updatePrivacySettings(body as any) as Promise<T>;
  if (method === "GET" && pathname === "/settings/app/version") return client.setting.getAppVersion(query) as Promise<T>;
  if (method === "GET" && pathname === "/models/active") return client.model.getActiveModels(query) as Promise<T>;

  // Discover + social moments
  if (method === "GET" && pathname === "/feeds/list") return client.feed.getFeedList(query) as Promise<T>;
  if (method === "GET" && pathname === "/feeds/search") return client.feed.searchFeeds(query) as Promise<T>;
  if (method === "GET" && pathname === "/feeds/hot") return client.feed.getHotFeeds(query) as Promise<T>;
  if (method === "GET" && pathname === "/advert/banner-adverts") return client.advert.getBannerAdverts(query) as Promise<T>;
  if (method === "POST" && /^\/feeds\/like\/[^/]+$/.test(pathname)) {
    const feedId = extractId(pathname, "/feeds/like/");
    if (feedId) return client.feed.like(feedId) as Promise<T>;
  }
  if (method === "POST" && pathname === "/comments") return client.comment.createComment(body as any) as Promise<T>;
  if (method === "DELETE" && /^\/comments\/[^/]+$/.test(pathname)) {
    const commentId = extractId(pathname, "/comments/");
    if (commentId) return client.comment.deleteComment(commentId) as Promise<T>;
  }

  // Video
  if (method === "GET" && pathname === "/video/public") return client.video.getPublicVideos(query) as Promise<T>;
  if (method === "GET" && pathname === "/video/statistics") return client.video.getVideoStatistics() as Promise<T>;
  if (method === "GET" && /^\/video\/[^/]+$/.test(pathname)) {
    const videoId = extractId(pathname, "/video/");
    if (videoId) return client.video.getVideo(videoId) as Promise<T>;
  }
  if (method === "POST" && /^\/video\/[^/]+\/like$/.test(pathname)) {
    const videoId = extractId(pathname, "/video/");
    if (videoId) return client.video.like(videoId) as Promise<T>;
  }
  if (method === "POST" && /^\/video\/[^/]+\/favorite$/.test(pathname)) {
    const videoId = extractId(pathname, "/video/");
    if (videoId) return client.video.favorite(videoId) as Promise<T>;
  }

  // Wallet + payments
  if (method === "GET" && pathname === "/account/cash") return client.account.getCash() as Promise<T>;
  if (method === "GET" && pathname === "/account/cash/history") return client.account.getHistoryCash(query) as Promise<T>;
  if (method === "POST" && pathname === "/account/cash/transfer") return client.account.createTransfer(body as any) as Promise<T>;
  if (method === "GET" && pathname === "/payments/methods") return client.payment.listPaymentMethods(query) as Promise<T>;

  // Device management (mapped into notification devices)
  if (method === "POST" && pathname === "/notification/devices") return client.notification.registerDevice(body as any) as Promise<T>;
  if (method === "GET" && pathname === "/notification/devices") return client.notification.listDevices() as Promise<T>;

  return requireMappedRoute(`${method} ${sdkEndpoint}`, method);
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { params, method: methodRaw, body: bodyRaw } = config;
  const tokens = resolveClientTokens();
  const client = getSdkClient();
  bindClientTokens(client, tokens);

  const method = String(methodRaw || "GET").toUpperCase();
  const sdkEndpoint = resolveSdkEndpoint(endpoint, method);

  if (!sdkEndpoint) {
    return requireMappedRoute(endpoint, method);
  }
  return executeMappedSdkRequest<T>(client, sdkEndpoint, method, params, bodyRaw);
}

export const apiClient = {
  get<T>(endpoint: string, config?: RequestConfig) {
    return request<T>(endpoint, { ...config, method: "GET" });
  },
  post<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
    return request<T>(endpoint, {
      ...config,
      method: "POST",
      body,
    });
  },
  put<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
    return request<T>(endpoint, {
      ...config,
      method: "PUT",
      body,
    });
  },
  patch<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
    return request<T>(endpoint, {
      ...config,
      method: "PATCH",
      body,
    });
  },
  delete<T>(endpoint: string, config?: RequestConfig) {
    return request<T>(endpoint, { ...config, method: "DELETE" });
  },
};

export default apiClient;
