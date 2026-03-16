export interface OrderCenterItem {
  id: string;
  customer: string;
  amount: number;
  status: "pending" | "paid" | "shipped" | "completed";
  createdAt: string;
  items: number;
}

export interface OrderCenterSummary {
  total: number;
  totalAmount: number;
  pending: number;
}

export function filterOrderCenterItems(
  orders: readonly OrderCenterItem[],
  input: { keyword?: string; status: "all" | OrderCenterItem["status"] },
): OrderCenterItem[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";

  return orders.filter((item) => {
    if (input.status !== "all" && item.status !== input.status) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return `${item.id} ${item.customer}`.toLowerCase().includes(keyword);
  });
}

export function buildOrderCenterSummary(orders: readonly OrderCenterItem[]): OrderCenterSummary {
  return {
    total: orders.length,
    totalAmount: orders.reduce((sum, item) => sum + item.amount, 0),
    pending: orders.filter((item) => item.status === "pending").length,
  };
}
