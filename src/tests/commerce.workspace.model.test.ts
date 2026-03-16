import { describe, expect, it } from "vitest";
import {
  buildCommerceWorkspaceSummary,
  deriveCommerceCategoryOptions,
} from "@sdkwork/openchat-pc-commerce";

describe("commerce workspace model", () => {
  it("builds product summary and derives category options", () => {
    const products = [
      {
        id: "1",
        name: "Pro",
        description: "",
        price: 100,
        images: [],
        cover: "",
        category: { id: "vip", name: "VIP", icon: "V", sortOrder: 2 },
        tags: [],
        stock: 10,
        sales: 6,
        rating: 4.8,
        reviewCount: 10,
        specifications: {},
        detailImages: [],
        isOnSale: true,
        merchantId: "m1",
        merchantName: "OpenChat",
        createTime: "",
        updateTime: "",
      },
      {
        id: "2",
        name: "Team",
        description: "",
        price: 300,
        images: [],
        cover: "",
        category: { id: "suite", name: "Suite", icon: "S", sortOrder: 1 },
        tags: [],
        stock: 5,
        sales: 3,
        rating: 4.2,
        reviewCount: 4,
        specifications: {},
        detailImages: [],
        isOnSale: false,
        merchantId: "m1",
        merchantName: "OpenChat",
        createTime: "",
        updateTime: "",
      },
    ];

    expect(buildCommerceWorkspaceSummary(products)).toMatchObject({
      total: 2,
      onSale: 1,
      avgPrice: 200,
      avgRating: 4.5,
    });
    expect(deriveCommerceCategoryOptions([], products).map((item) => item.id)).toEqual(["suite", "vip"]);
  });
});
