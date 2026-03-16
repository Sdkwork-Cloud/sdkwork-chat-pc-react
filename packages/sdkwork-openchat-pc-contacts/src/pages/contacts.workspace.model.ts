import type { Friend, FriendFilter, FriendRequest } from "../entities/contact.entity";

export interface ContactWorkspaceSummary {
  totalFriends: number;
  onlineFriends: number;
  pendingRequests: number;
}

export function filterContacts(
  friends: readonly Friend[],
  input: { filter: FriendFilter; keyword?: string },
): Friend[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";

  return friends.filter((friend) => {
    if (input.filter === "online" && !friend.isOnline) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const target = `${friend.name || ""} ${friend.remark || ""} ${friend.signature || ""}`.toLowerCase();
    return target.includes(keyword);
  });
}

export function groupFriendsByInitial(friends: readonly Friend[]): Record<string, Friend[]> {
  return friends.reduce<Record<string, Friend[]>>((acc, friend) => {
    const key = (friend.initial || "#").toUpperCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(friend);
    return acc;
  }, {});
}

export function buildContactWorkspaceSummary(
  friends: readonly Friend[],
  requests: readonly FriendRequest[],
): ContactWorkspaceSummary {
  return {
    totalFriends: friends.length,
    onlineFriends: friends.filter((item) => item.isOnline).length,
    pendingRequests: requests.filter((item) => item.status === "pending").length,
  };
}
