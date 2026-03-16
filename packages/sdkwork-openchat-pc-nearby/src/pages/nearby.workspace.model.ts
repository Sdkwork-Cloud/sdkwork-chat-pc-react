export interface NearbyWorkspace {
  id: string;
  name: string;
  distanceKm: number;
  category: string;
  activity: string;
  membersOnline: number;
}

export interface NearbyWorkspaceSummary {
  total: number;
  onlineCount: number;
  nearest: number;
  farthest: number;
}

export const NEARBY_SPACES: NearbyWorkspace[] = [
  {
    id: "nb-1",
    name: "Shanghai AI Hub",
    distanceKm: 1.8,
    category: "Coworking",
    activity: "Model benchmarking",
    membersOnline: 23,
  },
  {
    id: "nb-2",
    name: "JingAn Product Lab",
    distanceKm: 4.2,
    category: "Innovation Center",
    activity: "UX review",
    membersOnline: 15,
  },
  {
    id: "nb-3",
    name: "Pudong Startup Cluster",
    distanceKm: 8.5,
    category: "Community",
    activity: "Growth meetup",
    membersOnline: 32,
  },
];

export function filterNearbyWorkspace(
  spaces: readonly NearbyWorkspace[],
  input: { keyword?: string; maxDistanceKm: number },
): NearbyWorkspace[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";

  return spaces.filter((item) => {
    if (item.distanceKm > input.maxDistanceKm) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return `${item.name} ${item.category} ${item.activity}`.toLowerCase().includes(keyword);
  });
}

export function buildNearbyWorkspaceSummary(spaces: readonly NearbyWorkspace[]): NearbyWorkspaceSummary {
  const onlineCount = spaces.reduce((sum, item) => sum + item.membersOnline, 0);
  const nearest = spaces.reduce(
    (min, item) => (item.distanceKm < min ? item.distanceKm : min),
    Number.POSITIVE_INFINITY,
  );
  const farthest = spaces.reduce((max, item) => (item.distanceKm > max ? item.distanceKm : max), 0);

  return {
    total: spaces.length,
    onlineCount,
    nearest: Number.isFinite(nearest) ? nearest : 0,
    farthest,
  };
}
