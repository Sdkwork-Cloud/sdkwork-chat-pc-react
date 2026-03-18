import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";

export interface Friend {
  id: string;
  username?: string;
  nickname: string;
  avatar?: string;
  status?: "online" | "offline" | "busy";
  isOnline?: boolean;
  remark?: string;
  signature?: string;
  region?: string;
  initial?: string;
  createdAt?: string;
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

export async function getFriends(): Promise<Friend[]> {
  const response = await getAppSdkClientWithSession().social.listContacts();
  const list = unwrapData<unknown[]>(response, []);
  return Array.isArray(list) ? (list as Friend[]) : [];
}

export async function searchContacts(params: SearchContactsParams): Promise<Friend[]> {
  const response = await getAppSdkClientWithSession().social.listContacts(params as any);
  const list = unwrapData<unknown[]>(response, []);
  return Array.isArray(list) ? (list as Friend[]) : [];
}

export async function getFriendDetail(friendId: string): Promise<Friend> {
  const response = await getAppSdkClientWithSession().social.getContactDetail(friendId);
  const data = unwrapData<Record<string, unknown>>(response, {});
  return {
    id: friendId,
    nickname: (data.nickname as string) || (data.name as string) || friendId,
    avatar: data.avatar as string,
    isOnline: Boolean(data.isOnline),
    status: (data.status as Friend["status"]) || "offline",
    remark: data.remark as string,
    signature: data.signature as string,
    region: data.region as string,
    initial: data.initial as string,
    username: data.username as string,
  };
}

export async function addFriend(params: AddFriendParams): Promise<{ success: boolean; error?: string }> {
  await getAppSdkClientWithSession().social.sendFriendRequest({
    toUserId: params.userId,
    message: params.message,
  } as any);
  return { success: true };
}

export async function deleteFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  await getAppSdkClientWithSession().social.deleteContact(friendId);
  return { success: true };
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const response = await getAppSdkClientWithSession().social.listFriendRequests();
  const list = unwrapData<unknown[]>(response, []);
  return Array.isArray(list) ? (list as FriendRequest[]) : [];
}

export async function processFriendRequest(
  params: ProcessFriendRequestParams,
): Promise<{ success: boolean; error?: string }> {
  await getAppSdkClientWithSession().social.processFriendRequest(params.requestId, {
    action: params.action,
  } as any);
  return { success: true };
}

export async function updateFriendRemark(
  friendId: string,
  remark: string,
): Promise<{ success: boolean; error?: string }> {
  await getAppSdkClientWithSession().social.updateFriendRemark(friendId, { remark } as any);
  return { success: true };
}

export async function getContactGroups(): Promise<ContactGroup[]> {
  const response = await getAppSdkClientWithSession().social.listContactGroups();
  const list = unwrapData<unknown[]>(response, []);
  return Array.isArray(list) ? (list as ContactGroup[]) : [];
}

export async function createContactGroup(name: string): Promise<ContactGroup> {
  const response = await getAppSdkClientWithSession().social.createContactGroup({ name } as any);
  return unwrapData<ContactGroup>(response, { id: "", name, memberIds: [] });
}

export async function updateContactGroup(
  groupId: string,
  updates: { name?: string; memberIds?: string[] },
): Promise<ContactGroup> {
  const response = await getAppSdkClientWithSession().social.updateContactGroup(groupId, updates as any);
  return unwrapData<ContactGroup>(response, { id: groupId, name: updates.name ?? "", memberIds: updates.memberIds ?? [] });
}

export async function deleteContactGroup(groupId: string): Promise<{ success: boolean }> {
  await getAppSdkClientWithSession().social.deleteContactGroup(groupId);
  return { success: true };
}

export async function getFriendStats(): Promise<FriendStats> {
  const response = await getAppSdkClientWithSession().social.getContactStats();
  const data = unwrapData<Record<string, unknown>>(response, {});
  return {
    total: Number(data.total ?? data.followingCount ?? data.following ?? 0),
    online: Number(data.online ?? 0),
    newToday: Number(data.newToday ?? 0),
  };
}

export default {
  getFriends,
  searchContacts,
  getFriendDetail,
  addFriend,
  deleteFriend,
  getFriendRequests,
  processFriendRequest,
  updateFriendRemark,
  getContactGroups,
  createContactGroup,
  updateContactGroup,
  deleteContactGroup,
  getFriendStats,
};
