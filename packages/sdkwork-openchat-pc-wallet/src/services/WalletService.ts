import { getAppSdkClientWithSession, type Page, type Result } from "@sdkwork/openchat-pc-kernel";
import type {
  PaymentMethod,
  RedPacket,
  Transaction,
  TransactionFilter,
  WalletData,
  WalletStats,
} from "../types";

const paymentMethodsStorageKey = "openchat.wallet.paymentMethods";
const favoriteTransactionsStorageKey = "openchat.wallet.favoriteTransactions";
const recentTransactionsStorageKey = "openchat.wallet.recentTransactions";
const maxRecentTransactionCount = 16;
const now = Date.now();

const seedTransactions: Transaction[] = [
  {
    id: "tx-1",
    title: "Salary",
    amount: 15000,
    category: "Salary",
    type: "income",
    status: "completed",
    description: "Monthly salary payment",
    createTime: now - 20 * 24 * 60 * 60 * 1000,
    updateTime: now - 20 * 24 * 60 * 60 * 1000,
  },
  {
    id: "tx-2",
    title: "OpenChat Pro",
    amount: -299,
    category: "Subscription",
    type: "expense",
    status: "completed",
    description: "Pro membership renewal",
    createTime: now - 4 * 24 * 60 * 60 * 1000,
    updateTime: now - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: "tx-3",
    title: "Team reimbursement",
    amount: 88.8,
    category: "Transfer",
    type: "income",
    status: "completed",
    description: "Shared lunch reimbursement",
    createTime: now - 2 * 24 * 60 * 60 * 1000,
    updateTime: now - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "tx-4",
    title: "Coffee",
    amount: -42.5,
    category: "Food",
    type: "expense",
    status: "completed",
    description: "Afternoon coffee and snacks",
    createTime: now - 8 * 60 * 60 * 1000,
    updateTime: now - 8 * 60 * 60 * 1000,
  },
];

const defaultPaymentMethods: PaymentMethod[] = [
  { id: "WECHAT_PAY", type: "wechat", name: "WeChat Pay", icon: "WCP", isDefault: true, isEnabled: true },
  { id: "ALIPAY", type: "alipay", name: "Alipay", icon: "ALP", isDefault: false, isEnabled: true },
  { id: "UNION_PAY", type: "bank", name: "Union Pay", icon: "UNP", isDefault: false, isEnabled: true },
];

const fallbackCategories = ["Salary", "Subscription", "Food", "Transfer", "Gift", "Recharge", "Withdraw", "General"];

type PartialPage<T> = Partial<Page<T>> & { list?: T[]; pageSize?: number };

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeResultCode(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
}

function resolveSuccessByCode(value: unknown): boolean | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed.startsWith("2");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value / 1000) === 2;
  }
  return undefined;
}

function toResult<T>(response: unknown, defaultData: T): Result<T> {
  if (response && typeof response === "object") {
    const result = response as Partial<Result<T>> & {
      code?: unknown;
      msg?: unknown;
      errorName?: unknown;
    };
    if ("success" in result || "code" in result || "msg" in result || "message" in result || "errorName" in result) {
      const successByCode = resolveSuccessByCode(result.code);
      const success = "success" in result ? Boolean(result.success) : successByCode ?? true;
      return {
        success,
        data: (result.data as T | undefined) ?? defaultData,
        message:
          (typeof result.message === "string" && result.message) ||
          (typeof result.msg === "string" && result.msg) ||
          undefined,
        error:
          (typeof result.error === "string" && result.error) ||
          (typeof result.errorName === "string" && result.errorName) ||
          undefined,
        code: normalizeResultCode(result.code),
      };
    }
  }

  if (response && typeof response === "object" && "success" in response) {
    const result = response as Partial<Result<T>>;
    return {
      success: Boolean(result.success),
      data: (result.data as T | undefined) ?? defaultData,
      message: typeof result.message === "string" ? result.message : undefined,
      error: typeof result.error === "string" ? result.error : undefined,
      code: typeof result.code === "number" ? result.code : undefined,
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

function normalizeTransaction(input: Partial<Transaction>): Transaction {
  const amount = toNumber(input.amount);
  const type =
    input.type === "income" || input.type === "expense"
      ? input.type
      : amount >= 0
        ? "income"
        : "expense";
  const status =
    input.status === "pending" || input.status === "failed" || input.status === "completed"
      ? input.status
      : "completed";

  return {
    id: input.id || createId("tx"),
    title: input.title || "Transaction",
    amount,
    category: input.category || "General",
    type,
    status,
    description: input.description,
    relatedId: input.relatedId,
    paymentMethod: input.paymentMethod,
    createTime: toNumber(input.createTime, Date.now()),
    updateTime: toNumber(input.updateTime, Date.now()),
  };
}

function resolvePaymentType(rawType: unknown): PaymentMethod["type"] {
  const normalized = toText(rawType)?.toUpperCase();
  if (!normalized) {
    return "card";
  }
  if (normalized === "ALIPAY") {
    return "alipay";
  }
  if (normalized === "WECHAT" || normalized === "WECHAT_PAY") {
    return "wechat";
  }
  if (normalized === "UNION_PAY" || normalized === "UNIONPAY" || normalized === "BANK") {
    return "bank";
  }
  if (normalized === "CARD") {
    return "card";
  }
  return "card";
}

function normalizePaymentMethod(input: Partial<PaymentMethod> & Record<string, unknown>): PaymentMethod {
  const code = toText(input.code)?.toUpperCase();
  const methodId = toText(input.methodId);
  const methodName = toText(input.methodName);
  const methodIcon = toText(input.methodIcon);
  const type =
    input.type === "card" || input.type === "alipay" || input.type === "wechat" || input.type === "bank"
      ? input.type
      : resolvePaymentType(input.type ?? code);

  const nameByType =
    type === "alipay"
      ? "Alipay"
      : type === "wechat"
        ? "WeChat Pay"
        : type === "bank"
          ? "Bank"
          : "Card";

  const enabledRaw = input.isEnabled ?? input.enabled ?? input.available;

  return {
    id: input.id || methodId || code || createId("pm"),
    type,
    name: input.name || methodName || nameByType,
    icon: input.icon || methodIcon || code?.slice(0, 3) || "PM",
    last4: input.last4 || toText(input.accountTail),
    isDefault: Boolean(input.isDefault),
    isEnabled: enabledRaw === undefined ? true : Boolean(enabledRaw),
  };
}

function normalizeWalletData(input: Partial<WalletData>): WalletData {
  return {
    balance: toNumber(input.balance),
    currency: input.currency || "CNY",
    frozen: toNumber(input.frozen),
    dailyIncome: toNumber(input.dailyIncome),
    monthlyExpense: toNumber(input.monthlyExpense),
  };
}

function normalizeStats(input: Partial<WalletStats>): WalletStats {
  return {
    totalIncome: toNumber(input.totalIncome),
    totalExpense: toNumber(input.totalExpense),
    transactionCount: toNumber(input.transactionCount),
    categoryBreakdown:
      input.categoryBreakdown && typeof input.categoryBreakdown === "object"
        ? Object.entries(input.categoryBreakdown).reduce<Record<string, number>>((acc, [key, value]) => {
            acc[key] = toNumber(value);
            return acc;
          }, {})
        : {},
  };
}

function normalizePage(input: unknown, page: number, size: number): Page<Transaction> {
  const payload = input as PartialPage<unknown>;
  const source = Array.isArray(payload.content) ? payload.content : Array.isArray(payload.list) ? payload.list : [];
  const content = source.map((item) => normalizeTransaction(item as Partial<Transaction>));
  const total = toNumber(payload.total, content.length);
  const currentPage = toNumber(payload.page, page);
  const currentSize = toNumber(payload.size ?? payload.pageSize, size);

  return {
    content,
    total,
    page: currentPage,
    size: currentSize,
    totalPages: toNumber(payload.totalPages, Math.max(1, Math.ceil(total / Math.max(1, currentSize)))),
  };
}

class WalletServiceImpl {
  private baseBalance = 8000;
  private fallbackTransactions: Transaction[] = seedTransactions.map((item) => ({ ...item }));
  private fallbackPaymentMethods: PaymentMethod[] = defaultPaymentMethods.map((item) => ({ ...item }));
  private favoriteTransactionIds = new Set<string>();
  private recentTransactionIds: string[] = [];

  constructor() {
    const persisted = this.readPaymentMethodsFromStorage();
    if (persisted.length > 0) {
      this.fallbackPaymentMethods = persisted;
    }

    this.favoriteTransactionIds = this.readFavoriteTransactionsFromStorage();
    this.recentTransactionIds = this.readRecentTransactionsFromStorage();
  }

  private readPaymentMethodsFromStorage(): PaymentMethod[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(paymentMethodsStorageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.map((item) => normalizePaymentMethod(item as Partial<PaymentMethod> & Record<string, unknown>))
        : [];
    } catch {
      return [];
    }
  }

  private persistPaymentMethods(methods: PaymentMethod[]): void {
    this.fallbackPaymentMethods = methods.map((item) => ({ ...item }));

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(paymentMethodsStorageKey, JSON.stringify(this.fallbackPaymentMethods));
    }
  }

  private readFavoriteTransactionsFromStorage(): Set<string> {
    if (typeof localStorage === "undefined") {
      return new Set<string>();
    }

    try {
      const raw = localStorage.getItem(favoriteTransactionsStorageKey);
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

  private persistFavoriteTransactions(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(
      favoriteTransactionsStorageKey,
      JSON.stringify(Array.from(this.favoriteTransactionIds)),
    );
  }

  private readRecentTransactionsFromStorage(): string[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(recentTransactionsStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((item): item is string => typeof item === "string")
        .slice(0, maxRecentTransactionCount);
    } catch {
      return [];
    }
  }

  private persistRecentTransactions(): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(
      recentTransactionsStorageKey,
      JSON.stringify(this.recentTransactionIds.slice(0, maxRecentTransactionCount)),
    );
  }

  private buildWalletData(transactions: Transaction[]): WalletData {
    const balance = this.baseBalance + transactions.reduce((acc, item) => acc + item.amount, 0);
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const dailyIncome = transactions
      .filter((item) => item.type === "income" && (item.createTime || 0) >= startOfDay)
      .reduce((sum, item) => sum + item.amount, 0);
    const monthlyExpense = transactions
      .filter((item) => item.type === "expense" && (item.createTime || 0) >= startOfMonth)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    return {
      balance,
      currency: "CNY",
      frozen: 0,
      dailyIncome,
      monthlyExpense,
    };
  }

  private buildStats(transactions: Transaction[]): WalletStats {
    const totalIncome = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    const categoryBreakdown = transactions
      .filter((item) => item.type === "expense")
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + Math.abs(item.amount);
        return acc;
      }, {});

    return {
      totalIncome,
      totalExpense,
      transactionCount: transactions.length,
      categoryBreakdown,
    };
  }

  private async loadRemotePaymentMethods(): Promise<Result<PaymentMethod[]>> {
    const response = await getAppSdkClientWithSession().payment.listPaymentMethods();
    const result = toResult<unknown>(response, []);
    if (!result.success) {
      return { success: false, data: [], message: result.message || result.error, code: result.code };
    }

    const remoteList = Array.isArray(result.data)
      ? result.data.map((item) => normalizePaymentMethod(item as Partial<PaymentMethod> & Record<string, unknown>))
      : [];

    let merged =
      remoteList.length > 0
        ? remoteList.map((remoteItem) => {
            const localItem = this.fallbackPaymentMethods.find((item) => item.id === remoteItem.id);
            return normalizePaymentMethod({
              ...remoteItem,
              ...(localItem ?? {}),
              isDefault: localItem?.isDefault ?? remoteItem.isDefault,
              isEnabled: localItem?.isEnabled ?? remoteItem.isEnabled,
              last4: localItem?.last4 ?? remoteItem.last4,
            } as Partial<PaymentMethod> & Record<string, unknown>);
          })
        : this.fallbackPaymentMethods.map((item) => ({ ...item }));

    if (merged.length > 0) {
      const preferredDefaultId = this.fallbackPaymentMethods.find((item) => item.isDefault)?.id;
      const activeDefaultId =
        merged.find((item) => item.isDefault)?.id ?? preferredDefaultId ?? merged[0].id;
      merged = merged.map((item) => ({ ...item, isDefault: item.id === activeDefaultId }));
    }

    this.persistPaymentMethods(merged);
    return { success: true, data: merged, message: result.message, code: result.code };
  }

  getFavoriteTransactionIds(): string[] {
    return Array.from(this.favoriteTransactionIds);
  }

  isTransactionFavorite(transactionId: string): boolean {
    return this.favoriteTransactionIds.has(transactionId);
  }

  toggleFavoriteTransaction(transactionId: string): boolean {
    if (this.favoriteTransactionIds.has(transactionId)) {
      this.favoriteTransactionIds.delete(transactionId);
      this.persistFavoriteTransactions();
      return false;
    }

    this.favoriteTransactionIds.add(transactionId);
    this.persistFavoriteTransactions();
    return true;
  }

  getRecentTransactionIds(): string[] {
    return [...this.recentTransactionIds];
  }

  markTransactionOpened(transactionId: string): string[] {
    const filtered = this.recentTransactionIds.filter((id) => id !== transactionId);
    this.recentTransactionIds = [transactionId, ...filtered].slice(0, maxRecentTransactionCount);
    this.persistRecentTransactions();
    return [...this.recentTransactionIds];
  }

  resetWorkspaceState(): void {
    this.favoriteTransactionIds = new Set<string>();
    this.recentTransactionIds = [];

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(favoriteTransactionsStorageKey);
      localStorage.removeItem(recentTransactionsStorageKey);
    }
  }

  async getWalletData(): Promise<Result<WalletData>> {
    const fallbackData = this.buildWalletData(this.fallbackTransactions);
    const response = await getAppSdkClientWithSession().account.getCash();
    const result = toResult<unknown>(response, fallbackData);
    if (!result.success) {
      return { ...result, data: fallbackData };
    }
    return {
      ...result,
      data: normalizeWalletData((result.data || fallbackData) as Partial<WalletData>),
    };
  }

  async getTransactions(
    filter: TransactionFilter = {},
    page: number = 1,
    size: number = 20,
  ): Promise<Result<Page<Transaction>>> {
    const fallbackData = normalizePage({ content: [], total: 0, page, size }, page, size);
    const response = await getAppSdkClientWithSession().account.getHistoryCash({
      type: filter.type,
      category: filter.category,
      startTime: filter.startTime,
      endTime: filter.endTime,
      minAmount: filter.minAmount,
      maxAmount: filter.maxAmount,
      page,
      size,
    });
    const result = toResult<unknown>(response, fallbackData);
    if (!result.success) {
      return { ...result, data: fallbackData };
    }
    const normalizedPage = normalizePage(result.data, page, size);
    this.fallbackTransactions = normalizedPage.content.map((item) => ({ ...item }));
    return { ...result, data: normalizedPage };
  }

  async addTransaction(data: Partial<Transaction>): Promise<Result<Transaction>> {
    const amountValue = Math.abs(toNumber(data.amount));
    if (amountValue <= 0) {
      return { success: false, message: "Transaction amount must be greater than 0." };
    }

    const paymentMethod = data.paymentMethod || this.fallbackPaymentMethods.find((item) => item.isDefault)?.id || "ALIPAY";
    const isExpense = data.type === "expense" || toNumber(data.amount) < 0;
    const response = isExpense
      ? await getAppSdkClientWithSession().account.withdraw({
          amount: amountValue,
          withdrawMethod: paymentMethod,
          remarks: data.description,
        } as any)
      : await getAppSdkClientWithSession().account.recharge({
          amount: amountValue,
          paymentMethod,
          remarks: data.description,
        } as any);

    const result = toResult<unknown>(response, undefined);
    if (!result.success) {
      return { success: false, message: result.message || result.error, code: result.code };
    }

    const payload = (result.data || {}) as Record<string, unknown>;
    const remoteStatus = toText(payload.status)?.toUpperCase();
    const transactionStatus =
      remoteStatus === "FAILED" ? "failed" : remoteStatus === "PENDING" ? "pending" : "completed";

    const transaction = normalizeTransaction({
      id: toText(payload.transactionId) || createId("tx"),
      title: data.title || (isExpense ? "Withdraw" : "Recharge"),
      amount: isExpense ? -amountValue : amountValue,
      category: data.category || (isExpense ? "Withdraw" : "Recharge"),
      type: isExpense ? "expense" : "income",
      status: transactionStatus,
      description: data.description,
      paymentMethod,
      createTime: Date.now(),
      updateTime: Date.now(),
    });

    this.fallbackTransactions = [transaction, ...this.fallbackTransactions];
    return { success: true, data: transaction, message: result.message, code: result.code };
  }

  async getStats(): Promise<Result<WalletStats>> {
    const fallbackData = this.buildStats(this.fallbackTransactions);
    const response = await getAppSdkClientWithSession().account.getHistoryCash({ page: 1, size: 200 });
    const result = toResult<unknown>(response, normalizePage({ content: [], page: 1, size: 200 }, 1, 200));
    if (!result.success) {
      return { ...result, data: fallbackData };
    }
    const list = normalizePage(result.data, 1, 200).content;
    const source = list.length > 0 ? list : this.fallbackTransactions;
    return { ...result, data: normalizeStats(this.buildStats(source)) };
  }

  async getPaymentMethods(): Promise<Result<PaymentMethod[]>> {
    return this.loadRemotePaymentMethods();
  }

  async savePaymentMethod(method: PaymentMethod): Promise<Result<void>> {
    const methodsResult = await this.loadRemotePaymentMethods();
    if (!methodsResult.success) {
      return { success: false, message: methodsResult.message, code: methodsResult.code };
    }

    const normalized = normalizePaymentMethod(method as Partial<PaymentMethod> & Record<string, unknown>);
    const next = methodsResult.data ? methodsResult.data.map((item) => ({ ...item })) : [];
    const index = next.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      next[index] = normalizePaymentMethod({
        ...next[index],
        ...normalized,
      } as Partial<PaymentMethod> & Record<string, unknown>);
    } else {
      next.push(normalized);
    }

    if (!next.some((item) => item.isDefault) && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    this.persistPaymentMethods(next);
    return { success: true };
  }

  async setDefaultPaymentMethod(id: string): Promise<Result<void>> {
    const methodsResult = await this.loadRemotePaymentMethods();
    if (!methodsResult.success) {
      return { success: false, message: methodsResult.message, code: methodsResult.code };
    }

    const methods = methodsResult.data || [];
    if (!methods.some((item) => item.id === id)) {
      return { success: false, message: `Payment method not found: ${id}` };
    }

    const next = methods.map((item) => ({ ...item, isDefault: item.id === id }));
    this.persistPaymentMethods(next);
    return { success: true };
  }

  async transfer(toUserId: string, amount: number, message?: string): Promise<Result<Transaction>> {
    if (amount <= 0) {
      return { success: false, message: "Transfer amount must be greater than 0." };
    }

    const response = await getAppSdkClientWithSession().account.createTransfer({
      toUserId,
      amount,
      remarks: message,
    } as any);
    const result = toResult<unknown>(response, undefined);
    if (!result.success) {
      return { success: false, message: result.message || result.error };
    }
    const transaction = normalizeTransaction(
      ((result.data as Partial<Transaction> | undefined) ?? {
        title: `Transfer to ${toUserId}`,
        amount: -Math.abs(amount),
        category: "Transfer",
        type: "expense",
        description: message,
      }) as Partial<Transaction>,
    );
    this.fallbackTransactions = [transaction, ...this.fallbackTransactions];
    return { success: true, data: transaction, message: result.message };
  }

  async createRedPacket(amount: number, count: number, message: string): Promise<Result<RedPacket>> {
    if (amount <= 0 || count <= 0) {
      return { success: false, message: "Amount and count must be greater than 0." };
    }

    const transactionResult = await this.addTransaction({
      title: "Red packet sent",
      amount: -Math.abs(amount),
      category: "Gift",
      type: "expense",
      description: message,
    });
    if (!transactionResult.success) {
      return { success: false, message: transactionResult.message || "Failed to create red packet." };
    }

    const senderId = toText((transactionResult.data as unknown as Record<string, unknown>)?.relatedId) || "current_user";
    return {
      success: true,
      data: {
        id: createId("red-packet"),
        amount,
        count,
        remainingCount: count,
        message,
        senderId,
        senderName: "Current User",
        senderAvatar: undefined,
        expireTime: Date.now() + 24 * 60 * 60 * 1000,
        isReceived: false,
      },
    };
  }

  getCategories(): string[] {
    return [...fallbackCategories];
  }
}

export const WalletService = new WalletServiceImpl();

