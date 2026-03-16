import { describe, expect, it } from "vitest";
import {
  buildContactWorkspaceSummary,
  filterContacts,
  groupFriendsByInitial,
} from "@sdkwork/openchat-pc-contacts";

describe("contacts workspace model", () => {
  it("filters friends, groups by initial and summarizes requests", () => {
    const friends = [
      { id: "1", name: "Alex", isOnline: true, initial: "A", signature: "ops" },
      { id: "2", name: "Bella", isOnline: false, initial: "B", signature: "design" },
    ];
    const requests = [{ id: "r1", fromId: "3", fromName: "Cara", toId: "me", status: "pending", createdAt: "" }];

    expect(filterContacts(friends, { filter: "online", keyword: "" })).toHaveLength(1);
    expect(groupFriendsByInitial(friends)).toMatchObject({ A: [friends[0]], B: [friends[1]] });
    expect(buildContactWorkspaceSummary(friends, requests)).toMatchObject({ totalFriends: 2, onlineFriends: 1, pendingRequests: 1 });
  });
});
