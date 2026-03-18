import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import type { CartItem } from "../types";

function responseData<T>(response: unknown): T {
  return (response as { data: T }).data;
}

export interface AddToCartParams {
  productId: string;
  quantity: number;
  skuId?: string;
}

export interface UpdateCartItemParams {
  itemId: string;
  quantity: number;
}

export interface CartSummary {
  items: CartItem[];
  totalCount: number;
  selectedCount: number;
  totalAmount: number;
  selectedAmount: number;
}

class CartServiceImpl {
  private toNumberId(value: string | undefined, fieldName: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${fieldName} must be a positive number`);
    }
    return parsed;
  }

  async getCart(): Promise<CartSummary> {
    const response = await getAppSdkClientWithSession().cart.getMy();
    return responseData<CartSummary>(response);
  }

  async getCartItemCount(): Promise<number> {
    try {
      const response = await getAppSdkClientWithSession().cart.getCartStatistics();
      const data = responseData<{ count?: number; totalCount?: number }>(response);
      return Number(data.count ?? data.totalCount ?? 0);
    } catch {
      return 0;
    }
  }

  async addToCart(params: AddToCartParams): Promise<CartItem> {
    const response = await getAppSdkClientWithSession().cart.addItem({
      productId: this.toNumberId(params.productId, "productId"),
      skuId: this.toNumberId(params.skuId || params.productId, "skuId"),
      quantity: params.quantity,
    });
    return responseData<CartItem>(response);
  }

  async updateCartItem(params: UpdateCartItemParams): Promise<CartItem> {
    const response = await getAppSdkClientWithSession().cart.updateItemQuantity(params.itemId, {
      quantity: params.quantity,
    });
    return responseData<CartItem>(response);
  }

  async removeFromCart(itemId: string): Promise<void> {
    await getAppSdkClientWithSession().cart.removeItem(itemId);
  }

  async selectItem(itemId: string, selected: boolean): Promise<void> {
    await getAppSdkClientWithSession().cart.updateItemSelection(itemId, { selected });
  }

  async selectAll(selected: boolean): Promise<void> {
    await getAppSdkClientWithSession().cart.batchUpdateSelection({ selected });
  }

  async clearCart(): Promise<void> {
    await getAppSdkClientWithSession().cart.clear();
  }

  async clearSelected(): Promise<void> {
    await getAppSdkClientWithSession().cart.removeItems({ selected: true });
  }
}

export const CartService = new CartServiceImpl();
