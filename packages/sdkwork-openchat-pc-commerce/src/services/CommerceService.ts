import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import type { Product, ProductCategory } from "../types";

function responseData<T>(response: unknown): T {
  return (response as { data: T }).data;
}

export interface ProductQueryParams {
  categoryId?: string | null;
  search?: string;
  sort?: "default" | "price-asc" | "price-desc" | "sales" | "rating";
  page?: number;
  pageSize?: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

class CommerceServiceImpl {
  async getCategories(): Promise<ProductCategory[]> {
    const response = await getAppSdkClientWithSession().category.listCategories();
    return responseData<ProductCategory[]>(response);
  }

  async getProducts(params: ProductQueryParams): Promise<ProductListResponse> {
    const queryParams: Record<string, string | number | boolean> = {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    };
    if (params.categoryId) queryParams.categoryId = params.categoryId;
    if (params.search) queryParams.search = params.search;
    if (params.sort) queryParams.sort = params.sort;

    const response = await getAppSdkClientWithSession().product.getProducts(queryParams);
    return responseData<ProductListResponse>(response);
  }

  async getProductDetail(productId: string): Promise<Product> {
    const response = await getAppSdkClientWithSession().product.getProductDetail(productId);
    return responseData<Product>(response);
  }

  async getRecommendedProducts(productId: string, limit: number = 8): Promise<Product[]> {
    const response = await getAppSdkClientWithSession().product.searchProducts({
      relatedProductId: productId,
      pageSize: limit,
    });
    return responseData<Product[]>(response);
  }

  async getHotProducts(limit: number = 10): Promise<Product[]> {
    const response = await getAppSdkClientWithSession().product.getHotProducts({ limit });
    return responseData<Product[]>(response);
  }

  async getNewArrivals(limit: number = 10): Promise<Product[]> {
    const response = await getAppSdkClientWithSession().product.getLatestProducts({ limit });
    return responseData<Product[]>(response);
  }
}

export const CommerceService = new CommerceServiceImpl();
