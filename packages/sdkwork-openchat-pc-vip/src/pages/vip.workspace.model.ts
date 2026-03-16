import type { VipBenefitVO } from "@sdkwork/app-sdk";
import type { VipWorkspaceData } from "../services";

export interface VipWorkspaceSummary {
  plans: number;
  recommendedPlans: number;
  points: number;
}

export function resolveTierLabel(data: VipWorkspaceData | null): string {
  const levelFromStatus = Number(data?.status?.vipLevel);
  if (Number.isFinite(levelFromStatus) && levelFromStatus > 0) {
    return `VIP ${levelFromStatus}`;
  }

  const levelName = (data?.vipInfo?.vipLevelName || "").trim();
  if (levelName) {
    return levelName;
  }

  return "Free";
}

export function normalizeVipBenefits(data: VipWorkspaceData | null): VipBenefitVO[] {
  return (data?.benefits || []).filter((item) => {
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    return name.length > 0 || description.length > 0;
  });
}

export function buildVipWorkspaceSummary(data: VipWorkspaceData | null): VipWorkspaceSummary {
  const plans = data?.plans || [];
  return {
    plans: plans.length,
    recommendedPlans: plans.filter((item) => item.recommended).length,
    points: Number(data?.status?.pointBalance || 0),
  };
}
