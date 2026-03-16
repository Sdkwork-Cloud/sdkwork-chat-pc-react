import { apiClient as kernelApiClient } from "@sdkwork/openchat-pc-kernel";

type QueryValue = string | number | boolean;

interface RequestConfig extends RequestInit {
  params?: Record<string, QueryValue>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function wrapRequest<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ApiError(error.message, 0, error);
    }
    throw new ApiError("Request failed", 0, error);
  }
}

export const apiClient = {
  get<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T> {
    return wrapRequest(kernelApiClient.get<T>(endpoint, config as any));
  },

  post<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return wrapRequest(kernelApiClient.post<T>(endpoint, body, config as any));
  },

  put<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return wrapRequest(kernelApiClient.put<T>(endpoint, body, config as any));
  },

  patch<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return wrapRequest(kernelApiClient.patch<T>(endpoint, body, config as any));
  },

  delete<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T> {
    return wrapRequest(kernelApiClient.delete<T>(endpoint, config as any));
  },
};

export default apiClient;
