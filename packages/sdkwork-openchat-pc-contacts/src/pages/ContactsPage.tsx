import { useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { useNavigate } from "react-router-dom";
import { ContactDetail } from "../components/ContactDetail";
import { ContactSidebar } from "../components/ContactSidebar";
import type {
  ContactTab,
  Friend,
  FriendFilter,
  FriendRequest,
  Group,
} from "../entities/contact.entity";
import {
  createContactGroup,
  getContactGroups,
  getFriends,
  getFriendRequests,
  processFriendRequest,
} from "../services";

type Translate = (key: string) => string;

function createFallbackFriends(tr: Translate): Friend[] {
  return [
    {
      id: "f-1",
      name: tr("Alex"),
      avatar: "A",
      isOnline: true,
      status: "online",
      initial: "A",
      region: tr("Beijing"),
      signature: tr("Stay focused and keep shipping."),
      remark: tr("Product manager"),
    },
    {
      id: "f-2",
      name: tr("Bella"),
      avatar: "B",
      isOnline: false,
      status: "offline",
      initial: "B",
      region: tr("Shanghai"),
      signature: tr("Design is communication."),
      remark: tr("UI designer"),
    },
    {
      id: "f-3",
      name: tr("Chen"),
      avatar: "C",
      isOnline: true,
      status: "busy",
      initial: "C",
      region: tr("Shenzhen"),
      signature: tr("Reliability first."),
      remark: tr("Backend engineer"),
    },
    {
      id: "f-4",
      name: tr("Dora"),
      avatar: "D",
      isOnline: true,
      status: "online",
      initial: "D",
      region: tr("Hangzhou"),
      signature: tr("Quality through automation."),
      remark: tr("QA engineer"),
    },
  ];
}

function createFallbackGroups(tr: Translate): Group[] {
  return [
    {
      id: "g-1",
      name: tr("OpenChat Product"),
      avatar: "P",
      memberCount: 3,
      memberIds: ["f-1", "f-2", "f-3"],
      description: tr("Product planning and review."),
    },
    {
      id: "g-2",
      name: tr("Frontend Team"),
      avatar: "F",
      memberCount: 2,
      memberIds: ["f-2", "f-4"],
      description: tr("Client architecture and UX optimization."),
    },
    {
      id: "g-3",
      name: tr("Delivery Squad"),
      avatar: "D",
      memberCount: 4,
      memberIds: ["f-1", "f-2", "f-3", "f-4"],
      description: tr("Release tracking and issue follow-up."),
    },
  ];
}

function createFallbackRequests(tr: Translate): FriendRequest[] {
  return [
    {
      id: "req-1",
      fromId: "f-10",
      fromName: tr("Mia"),
      fromAvatar: "M",
      toId: "current-user",
      status: "pending",
      message: tr("Hi, let's connect for product sync."),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "req-2",
      fromId: "f-11",
      fromName: tr("Noah"),
      fromAvatar: "N",
      toId: "current-user",
      status: "pending",
      message: tr("We are in the same project group."),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function normalizeFriend(friend: Friend, tr: Translate): Friend {
  const displayName = friend.remark || friend.nickname || friend.name || friend.username || tr("Contact");
  return {
    ...friend,
    name: displayName,
    avatar: friend.avatar || displayName.slice(0, 1).toUpperCase(),
    initial: (friend.initial || displayName.slice(0, 1) || "#").toUpperCase(),
    status: friend.status || (friend.isOnline ? "online" : "offline"),
    isOnline: Boolean(friend.isOnline),
  };
}

function mapContactGroupToGroup(item: {
  id: string;
  name: string;
  memberIds?: string[];
  description?: string;
  createdAt?: string;
}, tr: Translate): Group {
  const title = item.name || tr("Untitled Group");
  const memberIds = Array.isArray(item.memberIds) ? item.memberIds : [];
  return {
    id: item.id,
    name: title,
    avatar: title.slice(0, 1).toUpperCase(),
    memberCount: memberIds.length,
    memberIds,
    description: item.description,
    createdAt: item.createdAt,
  };
}

export function ContactsPage() {
  const navigate = useNavigate();
  const { tr } = useAppTranslation();

  const fallbackFriends = useMemo(() => createFallbackFriends(tr), [tr]);
  const fallbackGroups = useMemo(() => createFallbackGroups(tr), [tr]);
  const fallbackRequests = useMemo(() => createFallbackRequests(tr), [tr]);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  const [activeTab, setActiveTab] = useState<ContactTab>("friends");
  const [filter, setFilter] = useState<FriendFilter>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContacts() {
      try {
        const [apiFriends, apiGroups, apiRequests] = await Promise.all([
          getFriends(),
          getContactGroups(),
          getFriendRequests(),
        ]);

        if (cancelled) {
          return;
        }

        const normalizedFriends =
          apiFriends.length > 0 ? apiFriends.map((item) => normalizeFriend(item, tr)) : fallbackFriends;

        const normalizedGroups =
          apiGroups.length > 0
            ? apiGroups.map((group) =>
                mapContactGroupToGroup(group as {
                  id: string;
                  name: string;
                  memberIds?: string[];
                  description?: string;
                  createdAt?: string;
                }, tr),
              )
            : fallbackGroups;

        setFriends(normalizedFriends);
        setGroups(normalizedGroups);
        setFriendRequests(apiRequests.length > 0 ? apiRequests : fallbackRequests);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load contacts, using fallback data.", error);
          setFriends(fallbackFriends);
          setGroups(fallbackGroups);
          setFriendRequests(fallbackRequests);
        }
      }
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [fallbackFriends, fallbackGroups, fallbackRequests, tr]);

  const visibleFriends = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return friends.filter((friend) => {
      if (filter === "online" && !friend.isOnline) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const target = `${friend.name || ""} ${friend.remark || ""} ${friend.signature || ""}`.toLowerCase();
      return target.includes(keyword);
    });
  }, [filter, friends, searchKeyword]);

  const groupedFriends = useMemo(() => {
    return visibleFriends.reduce<Record<string, Friend[]>>((acc, friend) => {
      const key = (friend.initial || "#").toUpperCase();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(friend);
      return acc;
    }, {});
  }, [visibleFriends]);

  const sortedInitials = useMemo(() => Object.keys(groupedFriends).sort(), [groupedFriends]);

  const selectedFriend = useMemo(
    () =>
      activeTab === "friends" && filter !== "new"
        ? friends.find((item) => item.id === selectedId)
        : undefined,
    [activeTab, filter, friends, selectedId],
  );

  const selectedGroup = useMemo(
    () => (activeTab === "groups" ? groups.find((item) => item.id === selectedId) : undefined),
    [activeTab, groups, selectedId],
  );

  const friendMap = useMemo(() => {
    return new Map<string, Friend>(friends.map((item) => [item.id, item]));
  }, [friends]);

  const selectedGroupMembers = useMemo(() => {
    if (!selectedGroup?.memberIds || selectedGroup.memberIds.length === 0) {
      return [];
    }
    return selectedGroup.memberIds
      .map((memberId) => friendMap.get(memberId))
      .filter((item): item is Friend => Boolean(item));
  }, [friendMap, selectedGroup]);

  useEffect(() => {
    if (activeTab === "friends" && filter === "new") {
      return;
    }

    if (activeTab === "friends") {
      if (!selectedId || !friends.some((item) => item.id === selectedId)) {
        setSelectedId(friends[0]?.id ?? null);
      }
      return;
    }

    if (!selectedId || !groups.some((item) => item.id === selectedId)) {
      setSelectedId(groups[0]?.id ?? null);
    }
  }, [activeTab, filter, friends, groups, selectedId]);

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const result = await processFriendRequest({
        requestId,
        action: "accept",
      });

      if (!result.success) {
        return;
      }

      const request = friendRequests.find((item) => item.id === requestId);

      setFriendRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? { ...item, status: "accepted", handledAt: new Date().toISOString() }
            : item,
        ),
      );

      if (request && !friends.some((item) => item.id === request.fromId)) {
        const newFriend = normalizeFriend({
          id: request.fromId,
          name: request.fromName,
          avatar: request.fromAvatar || request.fromName.slice(0, 1).toUpperCase(),
          isOnline: false,
          status: "offline",
          initial: request.fromName.slice(0, 1).toUpperCase(),
        }, tr);
        setFriends((prev) => [newFriend, ...prev]);
      }
    } catch (error) {
      console.error("Failed to accept friend request.", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const result = await processFriendRequest({
        requestId,
        action: "reject",
      });

      if (!result.success) {
        return;
      }

      setFriendRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? { ...item, status: "rejected", handledAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to reject friend request.", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleStartChat = (friend: Friend) => {
    const contactName = friend.remark || friend.name || friend.nickname || tr("Contact");
    const params = new URLSearchParams({
      contactId: friend.id,
      contactName,
    });
    navigate(`/chat?${params.toString()}`);
  };

  const handleCreateGroup = async () => {
    const rawName = window.prompt(tr("Group name"));
    if (rawName === null) {
      return;
    }

    const groupName = rawName.trim();
    if (!groupName) {
      return;
    }

    try {
      const created = await createContactGroup(groupName);
      const nextGroup: Group = {
        id: created.id,
        name: created.name,
        avatar: created.name.slice(0, 1).toUpperCase(),
        memberCount: created.memberIds.length,
        memberIds: created.memberIds,
      };
      setGroups((prev) => [nextGroup, ...prev.filter((item) => item.id !== nextGroup.id)]);
      setActiveTab("groups");
      setFilter("all");
      setSelectedId(nextGroup.id);
    } catch (error) {
      console.error("Failed to create group.", error);
    }
  };

  const handleGroupUpdated = (nextGroup: Group) => {
    setGroups((prev) => prev.map((item) => (item.id === nextGroup.id ? nextGroup : item)));
  };

  const handleGroupDeleted = (groupId: string) => {
    setGroups((prev) => prev.filter((item) => item.id !== groupId));
    setSelectedId((prev) => (prev === groupId ? null : prev));
  };

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-bg-primary">
      <ContactSidebar
        friends={visibleFriends}
        groups={groups}
        friendRequests={friendRequests}
        activeTab={activeTab}
        filter={filter}
        groupedFriends={groupedFriends}
        sortedInitials={sortedInitials}
        selectedId={selectedId}
        searchKeyword={searchKeyword}
        processingRequestId={processingRequestId}
        onSearchChange={setSearchKeyword}
        onTabChange={setActiveTab}
        onFilterChange={setFilter}
        onSelect={setSelectedId}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
        onCreateGroup={handleCreateGroup}
      />

      <ContactDetail
        friend={selectedFriend}
        group={selectedGroup}
        groupMembers={selectedGroupMembers}
        onStartChat={handleStartChat}
        onGroupUpdated={handleGroupUpdated}
        onGroupDeleted={handleGroupDeleted}
      />
    </div>
  );
}

export default ContactsPage;
