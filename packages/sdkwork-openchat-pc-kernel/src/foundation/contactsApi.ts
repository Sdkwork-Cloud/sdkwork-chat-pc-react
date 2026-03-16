import { getAppSdkClientWithSession } from "./apiClient";

export interface Friend {
  id: string;
  username?: string;
  nickname?: string;
  name?: string;
  avatar?: string;
  status?: "online" | "offline" | "busy" | string;
  isOnline?: boolean;
  remark?: string;
  signature?: string;
  region?: string;
  initial?: string;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar?: string;
  toId: string;
  status: "pending" | "accepted" | "rejected";
  message?: string;
  createdAt: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdAt?: string;
}

export interface SearchContactsParams {
  keyword?: string;
  region?: string;
  isOnline?: boolean;
}

export interface AddFriendParams {
  userId: string;
  message?: string;
}

export interface ProcessFriendRequestParams {
  requestId: string;
  action: "accept" | "reject";
}

export interface FriendStats {
  total: number;
  online: number;
  newToday: number;
}

export type ContactGroupRole = "owner" | "admin" | "member";

export interface ContactGroupNotice {
  id: string;
  groupId: string;
  content: string;
  publisherId: string;
  publisherName: string;
  publishTime: string;
  isPinned: boolean;
}

export interface ContactGroupMemberState {
  memberId: string;
  role: ContactGroupRole;
  muteEndTime?: string;
}

export interface ContactGroupRuntimeState {
  groupId: string;
  ownerId: string;
  notices: ContactGroupNotice[];
  memberStates: ContactGroupMemberState[];
}

function unwrapData<T>(response: unknown, fallback: T): T {
  if (response && typeof response === "object" && "data" in response) {
    const payload = response as { data?: T };
    return payload.data ?? fallback;
  }
  if (response === undefined || response === null) {
    return fallback;
  }
  return response as T;
}

const contactsApi = {
  async getFriends(): Promise<Friend[]> {
    const response = await getAppSdkClientWithSession().social.listContacts();
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as Friend[]) : [];
  },

  async searchContacts(params: SearchContactsParams): Promise<Friend[]> {
    const response = await getAppSdkClientWithSession().social.listContacts(params as any);
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as Friend[]) : [];
  },

  async getFriendDetail(friendId: string): Promise<Friend> {
    const response = await getAppSdkClientWithSession().social.getContactDetail(friendId);
    const data = unwrapData<Record<string, unknown>>(response, {});
    return {
      id: friendId,
      name: (data.name as string) || (data.nickname as string) || friendId,
      nickname: (data.nickname as string) || (data.name as string),
      avatar: data.avatar as string,
      status: (data.status as string) || "offline",
      isOnline: Boolean(data.isOnline),
      remark: data.remark as string,
      signature: data.signature as string,
      region: data.region as string,
      initial: data.initial as string,
      username: data.username as string,
    };
  },

  async addFriend(params: AddFriendParams): Promise<{ success: boolean; error?: string }> {
    await getAppSdkClientWithSession().social.sendFriendRequest({
      toUserId: params.userId,
      message: params.message,
    } as any);
    return { success: true };
  },

  async deleteFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
    await getAppSdkClientWithSession().social.deleteContact(friendId);
    return { success: true };
  },

  async getFriendRequests(): Promise<FriendRequest[]> {
    const response = await getAppSdkClientWithSession().social.listFriendRequests();
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as FriendRequest[]) : [];
  },

  async processFriendRequest(
    params: ProcessFriendRequestParams,
  ): Promise<{ success: boolean; error?: string }> {
    await getAppSdkClientWithSession().social.processFriendRequest(params.requestId, {
      action: params.action,
    } as any);
    return { success: true };
  },

  async getContactGroups(): Promise<ContactGroup[]> {
    const response = await getAppSdkClientWithSession().social.listContactGroups();
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as ContactGroup[]) : [];
  },

  async createContactGroup(name: string): Promise<ContactGroup> {
    const response = await getAppSdkClientWithSession().social.createContactGroup({ name } as any);
    return unwrapData<ContactGroup>(response, { id: "", name, memberIds: [] });
  },

  async updateContactGroup(
    groupId: string,
    updates: { name?: string; memberIds?: string[] },
  ): Promise<ContactGroup> {
    const response = await getAppSdkClientWithSession().social.updateContactGroup(groupId, updates as any);
    return unwrapData<ContactGroup>(response, { id: groupId, name: updates.name ?? "", memberIds: updates.memberIds ?? [] });
  },

  async deleteContactGroup(groupId: string): Promise<{ success: boolean }> {
    await getAppSdkClientWithSession().social.deleteContactGroup(groupId);
    return { success: true };
  },

  async getContactGroupRuntimeState(groupId: string): Promise<ContactGroupRuntimeState> {
    const response = await (getAppSdkClientWithSession().social as any).getContactGroupRuntimeState(groupId);
    return unwrapData<ContactGroupRuntimeState>(response, {
      groupId,
      ownerId: "",
      notices: [],
      memberStates: [],
    });
  },

  async setContactGroupMemberRole(
    groupId: string,
    memberId: string,
    role: ContactGroupRole,
  ): Promise<{ success: boolean; error?: string }> {
    const response = await (getAppSdkClientWithSession().social as any).setContactGroupMemberRole(groupId, {
      memberId,
      role,
    });
    return unwrapData<{ success: boolean; error?: string }>(response, { success: true });
  },

  async muteContactGroupMember(
    groupId: string,
    memberId: string,
    durationMinutes: number,
  ): Promise<{ success: boolean; error?: string }> {
    const response = await (getAppSdkClientWithSession().social as any).muteContactGroupMember(groupId, {
      memberId,
      durationMinutes,
    });
    return unwrapData<{ success: boolean; error?: string }>(response, { success: true });
  },

  async publishContactGroupNotice(
    groupId: string,
    content: string,
    isPinned: boolean = false,
  ): Promise<{ success: boolean; notice?: ContactGroupNotice; error?: string }> {
    const response = await (getAppSdkClientWithSession().social as any).publishContactGroupNotice(groupId, {
      content,
      isPinned,
    });
    return unwrapData<{ success: boolean; notice?: ContactGroupNotice; error?: string }>(response, { success: true });
  },

  async deleteContactGroupNotice(groupId: string, noticeId: string): Promise<{ success: boolean; error?: string }> {
    const response = await (getAppSdkClientWithSession().social as any).deleteContactGroupNotice(groupId, {
      noticeId,
    });
    return unwrapData<{ success: boolean; error?: string }>(response, { success: true });
  },

  async transferContactGroupOwnership(
    groupId: string,
    newOwnerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const response = await (getAppSdkClientWithSession().social as any).transferContactGroupOwnership(groupId, {
      newOwnerId,
    });
    return unwrapData<{ success: boolean; error?: string }>(response, { success: true });
  },

  async leaveContactGroup(
    groupId: string,
    memberId: string,
  ): Promise<{ success: boolean; removedGroup: boolean; error?: string }> {
    const response = await (getAppSdkClientWithSession().social as any).leaveContactGroup(groupId, {
      memberId,
    });
    return unwrapData<{ success: boolean; removedGroup: boolean; error?: string }>(response, {
      success: true,
      removedGroup: false,
    });
  },

  async updateFriendRemark(
    friendId: string,
    remark: string,
  ): Promise<{ success: boolean; error?: string }> {
    await getAppSdkClientWithSession().social.updateFriendRemark(friendId, { remark } as any);
    return { success: true };
  },

  async getFriendStats(): Promise<FriendStats> {
    const response = await getAppSdkClientWithSession().social.getContactStats();
    const data = unwrapData<Record<string, unknown>>(response, {});
    return {
      total: Number(data.total ?? data.followingCount ?? data.following ?? 0),
      online: Number(data.online ?? 0),
      newToday: Number(data.newToday ?? 0),
    };
  },
};

export default contactsApi;
