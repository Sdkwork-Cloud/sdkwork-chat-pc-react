import { describe, expect, it } from "vitest";
import {
  buildOrderCenterSummary,
  filterOrderCenterItems,
} from "@sdkwork/openchat-pc-order-center";

describe("order center workspace model", () => {
  it("filters orders and builds desk summary", () => {
    const orders = [
      { id: "ord-1", customer: "ACME", amount: 100, status: "pending", createdAt: "", items: 1 },
      { id: "ord-2", customer: "Nova", amount: 200, status: "paid", createdAt: "", items: 2 },
    ] as const;

    expect(filterOrderCenterItems(orders, { keyword: "acme", status: "all" })).toHaveLength(1);
    expect(buildOrderCenterSummary(orders)).toMatchObject({ total: 2, totalAmount: 300, pending: 1 });
  });
});
