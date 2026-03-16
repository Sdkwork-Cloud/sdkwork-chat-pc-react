import { describe, expect, it } from "vitest";
import {
  buildVipWorkspaceSummary,
  normalizeVipBenefits,
  resolveTierLabel,
} from "@sdkwork/openchat-pc-vip";

describe("vip workspace model", () => {
  it("resolves tier, normalizes benefits and summarizes plan inventory", () => {
    const workspaceData = {
      status: { vipLevel: 3, pointBalance: 88 },
      vipInfo: { remainingDays: 20, vipLevelName: "VIP 3" },
      plans: [
        { id: 1, name: "Monthly", price: 30, durationDays: 30, tags: [], points: 10, recommended: false },
        { id: 2, name: "Yearly", price: 300, durationDays: 365, tags: [], points: 100, recommended: true },
      ],
      benefits: [{ id: "b1", name: "Priority", description: "Fast lane" }],
    } as any;

    expect(resolveTierLabel(workspaceData)).toBe("VIP 3");
    expect(normalizeVipBenefits(workspaceData).length).toBe(1);
    expect(buildVipWorkspaceSummary(workspaceData)).toMatchObject({ plans: 2, recommendedPlans: 1, points: 88 });
  });
});
