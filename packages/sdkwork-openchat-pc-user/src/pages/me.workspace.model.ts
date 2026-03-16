export interface QuickAction {
  id: string;
  label: string;
  path: string;
  desc: string;
}

export type QuickActionId = QuickAction["id"];

export interface MeWorkspaceSummary {
  total: number;
  visible: number;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "settings", label: "Settings", path: "/settings", desc: "Model, privacy and account preferences" },
  { id: "wallet", label: "Wallet", path: "/wallet", desc: "Balance, bills and payment channels" },
  { id: "vip", label: "VIP", path: "/vip", desc: "Tier and subscription rights" },
  { id: "orders", label: "Order Center", path: "/order-center", desc: "Purchase and delivery lifecycle" },
  { id: "appointments", label: "Appointments", path: "/appointments", desc: "Meetings and event schedule" },
  { id: "notifications", label: "Notifications", path: "/notifications", desc: "System and interaction messages" },
  { id: "drive", label: "Drive", path: "/drive", desc: "Cloud assets and workspace files" },
  { id: "devices", label: "Devices", path: "/devices", desc: "Desktop and session security" },
];

export function filterQuickActions(actions: readonly QuickAction[], keyword?: string): QuickAction[] {
  const normalizedKeyword = keyword?.trim().toLowerCase() || "";
  if (!normalizedKeyword) {
    return [...actions];
  }
  return actions.filter((item) => `${item.label} ${item.desc}`.toLowerCase().includes(normalizedKeyword));
}

export function buildMeWorkspaceSummary(
  actions: readonly QuickAction[],
  visibleActions: readonly QuickAction[] = actions,
): MeWorkspaceSummary {
  return {
    total: actions.length,
    visible: visibleActions.length,
  };
}
