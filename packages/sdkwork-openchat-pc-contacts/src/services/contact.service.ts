import {
  contactsApi,
  type AddFriendParams,
  type ContactGroup,
  type Friend,
  type FriendRequest,
  type FriendStats,
  type ProcessFriendRequestParams,
  type SearchContactsParams,
} from "@sdkwork/openchat-pc-kernel";

export type {
  Friend,
  FriendRequest,
  ContactGroup,
  SearchContactsParams,
  AddFriendParams,
  ProcessFriendRequestParams,
  FriendStats,
};

const GROUPS_STORAGE_KEY = "openchat.contacts.groups";
const GROUP_RUNTIME_STORAGE_KEY = "openchat.contacts.group-runtime";

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

export type ContactGroupRuntimeMap = Record<string, ContactGroupRuntimeState>;

const seedGroups: ContactGroup[] = [
  {
    id: "group-product",
    name: "Product Team",
    memberIds: ["friend-alex", "friend-bella", "friend-chen"],
  },
  {
    id: "group-engineering",
    name: "Engineering",
    memberIds: ["friend-chen"],
  },
];

let fallbackGroups: ContactGroup[] = readArrayFromStorage<ContactGroup>(GROUPS_STORAGE_KEY, seedGroups);
let fallbackGroupRuntime: ContactGroupRuntimeMap = readRecordFromStorage<ContactGroupRuntimeMap>(
  GROUP_RUNTIME_STORAGE_KEY,
  {},
);

function readArrayFromStorage<T>(key: string, fallback: T[]): T[] {
  if (typeof localStorage === "undefined") {
    return fallback.map((item) => ({ ...item }));
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback.map((item) => ({ ...item }));
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback.map((item) => ({ ...item }));
  } catch {
    return fallback.map((item) => ({ ...item }));
  }
}

function readRecordFromStorage<T extends object>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") {
    return { ...fallback };
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { ...fallback };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...fallback };
    }
    return parsed as T;
  } catch {
    return { ...fallback };
  }
}

function persistFallback(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(fallbackGroups));
  localStorage.setItem(GROUP_RUNTIME_STORAGE_KEY, JSON.stringify(fallbackGroupRuntime));
}

function extractData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const wrapped = payload as { data?: T };
    return wrapped.data ?? fallback;
  }
  if (payload === undefined || payload === null) {
    return fallback;
  }
  return payload as T;
}

function ensureArray<T>(input: unknown): T[] {
  return Array.isArray(input) ? input : [];
}

function normalizeFriend(input: Partial<Friend>): Friend {
  const display = input.remark || input.nickname || input.name || input.username || "Contact";
  return {
    id: input.id || `friend-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    username: input.username,
    nickname: input.nickname || input.name,
    name: input.name || input.nickname || display,
    avatar: input.avatar || display.slice(0, 1).toUpperCase(),
    status: input.status || (input.isOnline ? "online" : "offline"),
    isOnline: Boolean(input.isOnline),
    remark: input.remark,
    signature: input.signature,
    region: input.region,
    initial: (input.initial || display.slice(0, 1) || "#").toUpperCase(),
  };
}

function normalizeRequest(input: Partial<FriendRequest>): FriendRequest {
  return {
    id: input.id || `request-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    fromId: input.fromId || "",
    fromName: input.fromName || "Unknown",
    fromAvatar: input.fromAvatar || input.fromName?.slice(0, 1)?.toUpperCase() || "U",
    toId: input.toId || "current-user",
    status:
      input.status === "accepted" || input.status === "rejected" || input.status === "pending"
        ? input.status
        : "pending",
    message: input.message,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalizeGroup(input: Partial<ContactGroup>): ContactGroup {
  return {
    id: input.id || `group-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: input.name || "Untitled Group",
    memberIds: Array.isArray(input.memberIds)
      ? input.memberIds.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function getCurrentUserId(): string {
  if (typeof localStorage === "undefined") {
    return "current-user";
  }
  return localStorage.getItem("uid") || "current-user";
}

function ensureGroupRuntime(groupId: string): ContactGroupRuntimeState {
  const current = fallbackGroupRuntime[groupId];
  const group = fallbackGroups.find((item) => item.id === groupId);
  const memberIds = group?.memberIds || [];
  const ownerId = current?.ownerId || group?.memberIds?.[0] || getCurrentUserId();

  const existingMemberMap = new Map<string, ContactGroupMemberState>();
  (current?.memberStates || []).forEach((item) => {
    existingMemberMap.set(item.memberId, item);
  });

  const mergedMemberStates: ContactGroupMemberState[] = memberIds.map((memberId, index) => {
    const existing = existingMemberMap.get(memberId);
    if (existing) {
      return existing;
    }
    if (memberId === ownerId || index === 0) {
      return { memberId, role: "owner" };
    }
    return { memberId, role: "member" };
  });

  const runtime: ContactGroupRuntimeState = {
    groupId,
    ownerId,
    notices: (current?.notices || []).slice().sort((left, right) => {
      if (left.isPinned && !right.isPinned) return -1;
      if (!left.isPinned && right.isPinned) return 1;
      return new Date(right.publishTime).getTime() - new Date(left.publishTime).getTime();
    }),
    memberStates: mergedMemberStates,
  };

  fallbackGroupRuntime[groupId] = runtime;
  return runtime;
}

function upsertGroupRuntime(runtime: ContactGroupRuntimeState): void {
  fallbackGroupRuntime[runtime.groupId] = runtime;
}

function removeGroupRuntime(groupId: string): void {
  if (fallbackGroupRuntime[groupId]) {
    delete fallbackGroupRuntime[groupId];
  }
}

export async function searchContacts(params: SearchContactsParams): Promise<Friend[]> {
  const response = await contactsApi.searchContacts(params);
  return ensureArray<Partial<Friend>>(extractData<unknown[]>(response, []))
    .map((item) => normalizeFriend(item));
}

export async function getFriends(): Promise<Friend[]> {
  const response = await contactsApi.getFriends();
  return ensureArray<Partial<Friend>>(extractData<unknown[]>(response, []))
    .map((item) => normalizeFriend(item));
}

export async function getFriendDetail(friendId: string): Promise<Friend | null> {
  const response = await contactsApi.getFriendDetail(friendId);
  if (!response) {
    return null;
  }
  const data = extractData<unknown>(response, response);
  if (!data) {
    return null;
  }
  return normalizeFriend(data as Partial<Friend>);
}

export async function addFriend(params: AddFriendParams): Promise<{ success: boolean; error?: string }> {
  const response = await contactsApi.addFriend(params);
  const payload = extractData<{ success?: boolean; error?: string }>(response, response);
  return payload.success === false
    ? { success: false, error: payload.error || "Failed to send request." }
    : { success: true };
}

export async function deleteFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  const response = await contactsApi.deleteFriend(friendId);
  const payload = extractData<{ success?: boolean; error?: string }>(response, response);
  return payload.success === false
    ? { success: false, error: payload.error || "Failed to delete friend." }
    : { success: true };
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const response = await contactsApi.getFriendRequests();
  return ensureArray<Partial<FriendRequest>>(extractData<unknown[]>(response, []))
    .map((item) => normalizeRequest(item))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function processFriendRequest(
  params: ProcessFriendRequestParams,
): Promise<{ success: boolean; error?: string }> {
  const response = await contactsApi.processFriendRequest(params);
  const payload = extractData<{ success?: boolean; error?: string }>(response, response);
  return payload.success === false
    ? { success: false, error: payload.error || "Failed to process request." }
    : { success: true };
}

export async function getContactGroups(): Promise<ContactGroup[]> {
  const response = await contactsApi.getContactGroups();
  const list = ensureArray<Partial<ContactGroup>>(extractData<unknown[]>(response, []))
    .map((item) => normalizeGroup(item));
  fallbackGroups = list.map((item) => ({ ...item }));
  persistFallback();
  return list;
}

export async function createContactGroup(name: string): Promise<ContactGroup> {
  const response = await contactsApi.createContactGroup(name);
  const group = normalizeGroup(extractData<Partial<ContactGroup>>(response, response));
  fallbackGroups = fallbackGroups.some((item) => item.id === group.id)
    ? fallbackGroups.map((item) => (item.id === group.id ? group : item))
    : [...fallbackGroups, group];
  ensureGroupRuntime(group.id);
  persistFallback();
  return group;
}

export async function updateContactGroup(
  groupId: string,
  updates: { name?: string; memberIds?: string[] },
): Promise<ContactGroup> {
  const response = await contactsApi.updateContactGroup(groupId, updates);
  const group = normalizeGroup(extractData<Partial<ContactGroup>>(response, response));
  fallbackGroups = fallbackGroups.map((item) => (item.id === groupId ? group : item));
  if (!fallbackGroups.some((item) => item.id === group.id)) {
    fallbackGroups = [...fallbackGroups, group];
  }
  ensureGroupRuntime(group.id);
  persistFallback();
  return group;
}

export async function deleteContactGroup(groupId: string): Promise<{ success: boolean }> {
  const response = await contactsApi.deleteContactGroup(groupId);
  const payload = extractData<{ success?: boolean }>(response, response);
  const success = payload.success !== false;
  if (success) {
    fallbackGroups = fallbackGroups.filter((item) => item.id !== groupId);
    removeGroupRuntime(groupId);
    persistFallback();
  }
  return { success };
}

export async function getContactGroupRuntimeState(groupId: string): Promise<ContactGroupRuntimeState> {
  const payload = await contactsApi.getContactGroupRuntimeState(groupId);
  const data = extractData<Partial<ContactGroupRuntimeState>>(payload, payload as Partial<ContactGroupRuntimeState>);
  const runtime = ensureGroupRuntime(groupId);
  const merged: ContactGroupRuntimeState = {
    groupId,
    ownerId: data.ownerId || runtime.ownerId,
    notices: Array.isArray(data.notices)
      ? data.notices.map((item) => ({
          id: item.id || `notice-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          groupId,
          content: item.content || "",
          publisherId: item.publisherId || "current-user",
          publisherName: item.publisherName || "Current User",
          publishTime: item.publishTime || new Date().toISOString(),
          isPinned: Boolean(item.isPinned),
        }))
      : runtime.notices,
    memberStates: Array.isArray(data.memberStates)
      ? data.memberStates.map((item) => ({
          memberId: item.memberId || "",
          role:
            item.role === "owner" || item.role === "admin" || item.role === "member"
              ? item.role
              : "member",
          muteEndTime: item.muteEndTime,
        }))
      : runtime.memberStates,
  };
  upsertGroupRuntime(merged);
  persistFallback();
  return merged;
}

export async function setContactGroupMemberRole(
  groupId: string,
  memberId: string,
  role: ContactGroupRole,
): Promise<{ success: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!memberId.trim()) {
    return { success: false, error: "Member id is required." };
  }

  const payload = await contactsApi.setContactGroupMemberRole(groupId, memberId, role);
  const data = extractData<{ success?: boolean; error?: string }>(payload, payload as { success?: boolean; error?: string });
  return data.success === false ? { success: false, error: data.error || "Failed to update member role." } : { success: true };
}

export async function muteContactGroupMember(
  groupId: string,
  memberId: string,
  durationMinutes: number,
): Promise<{ success: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!memberId.trim()) {
    return { success: false, error: "Member id is required." };
  }
  if (durationMinutes < 0) {
    return { success: false, error: "Duration must be non-negative." };
  }

  const payload = await contactsApi.muteContactGroupMember(groupId, memberId, durationMinutes);
  const data = extractData<{ success?: boolean; error?: string }>(payload, payload as { success?: boolean; error?: string });
  return data.success === false ? { success: false, error: data.error || "Failed to mute member." } : { success: true };
}

export async function publishContactGroupNotice(
  groupId: string,
  content: string,
  isPinned: boolean = false,
): Promise<{ success: boolean; notice?: ContactGroupNotice; error?: string }> {
  const normalized = content.trim();
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!normalized) {
    return { success: false, error: "Notice content is required." };
  }

  const payload = await contactsApi.publishContactGroupNotice(groupId, normalized, isPinned);
  const data = extractData<{ success?: boolean; notice?: ContactGroupNotice; error?: string }>(
    payload,
    payload as { success?: boolean; notice?: ContactGroupNotice; error?: string },
  );
  if (data.success === false) {
    return { success: false, error: data.error || "Failed to publish notice." };
  }
  return { success: true, notice: data.notice };
}

export async function deleteContactGroupNotice(
  groupId: string,
  noticeId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!noticeId.trim()) {
    return { success: false, error: "Notice id is required." };
  }

  const payload = await contactsApi.deleteContactGroupNotice(groupId, noticeId);
  const data = extractData<{ success?: boolean; error?: string }>(payload, payload as { success?: boolean; error?: string });
  return data.success === false ? { success: false, error: data.error || "Failed to delete notice." } : { success: true };
}

export async function transferContactGroupOwnership(
  groupId: string,
  newOwnerId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!newOwnerId.trim()) {
    return { success: false, error: "New owner id is required." };
  }

  const payload = await contactsApi.transferContactGroupOwnership(groupId, newOwnerId);
  const data = extractData<{ success?: boolean; error?: string }>(payload, payload as { success?: boolean; error?: string });
  return data.success === false
    ? { success: false, error: data.error || "Failed to transfer ownership." }
    : { success: true };
}

export async function leaveContactGroup(
  groupId: string,
  memberId: string = getCurrentUserId(),
): Promise<{ success: boolean; removedGroup: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, removedGroup: false, error: "Group id is required." };
  }
  if (!memberId.trim()) {
    return { success: false, removedGroup: false, error: "Member id is required." };
  }

  const payload = await contactsApi.leaveContactGroup(groupId, memberId);
  const data = extractData<{ success?: boolean; removedGroup?: boolean; error?: string }>(
    payload,
    payload as { success?: boolean; removedGroup?: boolean; error?: string },
  );
  if (data.success === false) {
    return { success: false, removedGroup: false, error: data.error || "Failed to leave group." };
  }
  return { success: true, removedGroup: Boolean(data.removedGroup) };
}

export async function updateFriendRemark(
  friendId: string,
  remark: string,
): Promise<{ success: boolean; error?: string }> {
  const response = await contactsApi.updateFriendRemark(friendId, remark);
  const payload = extractData<{ success?: boolean; error?: string }>(response, response);
  return payload.success === false
    ? { success: false, error: payload.error || "Failed to update remark." }
    : { success: true };
}

export async function getFriendStats(): Promise<FriendStats> {
  const response = await contactsApi.getFriendStats();
  const data = extractData<Partial<FriendStats>>(response, response);
  return {
    total: Number.isFinite(Number(data.total)) ? Number(data.total) : 0,
    online: Number.isFinite(Number(data.online)) ? Number(data.online) : 0,
    newToday: Number.isFinite(Number(data.newToday)) ? Number(data.newToday) : 0,
  };
}

export default {
  searchContacts,
  getFriends,
  getFriendDetail,
  addFriend,
  deleteFriend,
  getFriendRequests,
  processFriendRequest,
  getContactGroups,
  createContactGroup,
  updateContactGroup,
  deleteContactGroup,
  getContactGroupRuntimeState,
  setContactGroupMemberRole,
  muteContactGroupMember,
  publishContactGroupNotice,
  deleteContactGroupNotice,
  transferContactGroupOwnership,
  leaveContactGroup,
  updateFriendRemark,
  getFriendStats,
};
