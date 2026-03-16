import type { Product, ProductCategory } from "../types";

export interface CommerceWorkspaceSummary {
  total: number;
  onSale: number;
  avgPrice: number;
  avgRating: number;
}

export function buildCommerceWorkspaceSummary(products: readonly Product[]): CommerceWorkspaceSummary {
  if (products.length === 0) {
    return { total: 0, onSale: 0, avgPrice: 0, avgRating: 0 };
  }

  const onSale = products.filter((item) => item.isOnSale).length;
  const avgPrice = products.reduce((sum, item) => sum + item.price, 0) / products.length;
  const avgRating = products.reduce((sum, item) => sum + item.rating, 0) / products.length;

  return {
    total: products.length,
    onSale,
    avgPrice,
    avgRating,
  };
}

export function deriveCommerceCategoryOptions(
  categories: readonly ProductCategory[],
  products: readonly Product[],
): ProductCategory[] {
  if (categories.length > 0) {
    return [...categories];
  }

  return Array.from(new Map(products.map((item) => [item.category.id, item.category])).values()).sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
}
