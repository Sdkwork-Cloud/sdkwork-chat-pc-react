export interface LookCard {
  id: string;
  title: string;
  theme: string;
  palette: string;
  usage: string;
}

export interface LookWorkspaceSummary {
  total: number;
  themes: number;
}

export const LOOK_CARDS: LookCard[] = [
  {
    id: "look-1",
    title: "Operator Console",
    theme: "Dark Graphite",
    palette: "#0f172a / #38bdf8",
    usage: "Terminal-heavy operations",
  },
  {
    id: "look-2",
    title: "Creator Studio",
    theme: "Neutral Sand",
    palette: "#faf7f2 / #f97316",
    usage: "Content production",
  },
  {
    id: "look-3",
    title: "Analytics Grid",
    theme: "Steel Blue",
    palette: "#e2e8f0 / #2563eb",
    usage: "Monitoring dashboards",
  },
];

export function filterLookWorkspace(presets: readonly LookCard[], keyword?: string): LookCard[] {
  const normalizedKeyword = keyword?.trim().toLowerCase() || "";
  if (!normalizedKeyword) {
    return [...presets];
  }
  return presets.filter((item) =>
    `${item.title} ${item.theme} ${item.palette} ${item.usage}`.toLowerCase().includes(normalizedKeyword),
  );
}

export function buildLookWorkspaceSummary(presets: readonly LookCard[]): LookWorkspaceSummary {
  return {
    total: presets.length,
    themes: new Set(presets.map((item) => item.theme)).size,
  };
}
