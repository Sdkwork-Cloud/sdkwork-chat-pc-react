import {
  clearPcImSdkSession,
  getPcImSdk,
  getPcImSdkClient,
  getPcImSdkConnectionState,
  getPcImSessionIdentity,
  initPcImSdk,
  subscribePcImSdkConnectionState,
  syncPcImSdkSession,
  type PcImSessionIdentity,
} from "@sdkwork/openchat-pc-kernel";
import { translate } from "@sdkwork/openchat-pc-i18n";

import type { Conversation } from "../entities/conversation.entity";
import type { Group, GroupMember } from "../entities/group.entity";
import type { Message, MessageStatus } from "../entities/message.entity";

export interface SDKAdapterConfig {
  apiBaseUrl: string;
  imWsUrl: string;
  uid: string;
  token: string;
  deviceId?: string;
  deviceFlag?: string | number;
  accessToken?: string;
  username?: string;
  displayName?: string;
}

export interface SDKState {
  initialized: boolean;
  connecting: boolean;
  connected: boolean;
  error: string | null;
}

export interface OpenChatClientFacade {
  backend: ReturnType<typeof getPcImSdkClient>;
  realtime: ReturnType<typeof getPcImSdk>["realtime"];
  rtc: ReturnType<typeof getPcImSdk>["rtc"];
  im: {
    messages: ReturnType<typeof getPcImSdk>["messages"];
    conversations: ReturnType<typeof getPcImSdk>["conversations"];
    groups: ReturnType<typeof getPcImSdk>["groups"];
    contacts: ReturnType<typeof getPcImSdk>["contacts"];
    friends: ReturnType<typeof getPcImSdk>["friends"];
  };
}

interface ConversationMeta {
  id: string;
  targetId: string;
  type: "SINGLE" | "GROUP";
}

interface MessageTransportPayload {
  type: string;
  message: Record<string, unknown>;
  content: Record<string, unknown>;
}

type UnknownRecord = Record<string, unknown>;

let sdkInitializing: Promise<OpenChatClientFacade> | null = null;
let sdkInitialized = false;
let sdkState: SDKState = {
  initialized: false,
  connecting: false,
  connected: false,
  error: null,
};
let connectionStateUnsubscribe: (() => void) | null = null;

const stateChangeCallbacks = new Set<(state: SDKState) => void>();
const conversationMetaById = new Map<string, ConversationMeta>();
const conversationIdByTarget = new Map<string, string>();
const messageConversationById = new Map<string, ConversationMeta>();

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function unwrapResponse<T = unknown>(value: unknown): T {
  if (!isRecord(value)) {
    return value as T;
  }
  if (Object.prototype.hasOwnProperty.call(value, "data")) {
    return unwrapResponse<T>(value.data);
  }
  return value as T;
}

function extractArray(value: unknown): unknown[] {
  const normalized = unwrapResponse(value);
  if (Array.isArray(normalized)) {
    return normalized;
  }

  if (!isRecord(normalized)) {
    return [];
  }

  for (const candidate of [
    normalized.items,
    normalized.rows,
    normalized.records,
    normalized.list,
    normalized.messages,
    normalized.conversations,
    normalized.members,
  ]) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeIsoTime(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeConversationType(value: unknown): Conversation["type"] {
  const normalized = (pickString(value) || "single").toUpperCase();
  if (normalized === "GROUP") return "group";
  if (normalized === "AI" || normalized === "BOT") return "ai";
  if (normalized === "CUSTOMER") return "customer";
  if (normalized === "USER") return "user";
  return "single";
}

function normalizeConversationEnvelopeType(value: unknown): "SINGLE" | "GROUP" {
  return (pickString(value) || "").toUpperCase() === "GROUP" ? "GROUP" : "SINGLE";
}

function normalizeMessageStatus(status?: unknown): MessageStatus {
  switch ((pickString(status) || "").toUpperCase()) {
    case "SENDING":
      return "sending";
    case "DELIVERED":
      return "delivered";
    case "READ":
      return "read";
    case "FAILED":
      return "failed";
    case "SENT":
    default:
      return "sent";
  }
}

function normalizeCurrentSender(senderId: string): string {
  const currentSession = getPcImSessionIdentity();
  if (currentSession?.userId && senderId === currentSession.userId) {
    return "current-user";
  }
  return senderId;
}

function getConversationTargetKey(targetId: string, type: "SINGLE" | "GROUP"): string {
  return `${type}:${targetId}`;
}

function rememberConversationMeta(
  payload: unknown,
  fallbackConversationId?: string,
): ConversationMeta | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id =
    pickString(payload.id, payload.conversationId, payload.channelId) ||
    fallbackConversationId;
  const targetId = pickString(payload.targetId, payload.toUserId, payload.groupId);
  if (!id || !targetId) {
    return null;
  }

  const type = normalizeConversationEnvelopeType(payload.type);
  const meta: ConversationMeta = { id, targetId, type };
  conversationMetaById.set(id, meta);
  conversationIdByTarget.set(getConversationTargetKey(targetId, type), id);
  return meta;
}

function rememberMessageMeta(messageId: string, conversation: ConversationMeta): void {
  if (messageId) {
    messageConversationById.set(messageId, conversation);
  }
}

function getNestedRecord(record: UnknownRecord, key: string): UnknownRecord | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

function extractMessageContainer(record: UnknownRecord): UnknownRecord {
  return getNestedRecord(record, "content") || getNestedRecord(record, "message") || record;
}

function extractMessageText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (!isRecord(value)) {
    return "";
  }

  const textRecord = getNestedRecord(value, "text");
  return (
    pickString(
      textRecord?.text,
      textRecord?.content,
      textRecord?.value,
      value.text,
      value.content,
      value.value,
      value.title,
      value.name,
    ) || ""
  );
}

function extractMessageContent(record: UnknownRecord): Message["content"] {
  const container = extractMessageContainer(record);
  const type = (pickString(record.type, container.type) || "TEXT").toUpperCase();

  if (type === "IMAGE") {
    const image = getNestedRecord(container, "image") || container;
    return {
      type: "image",
      url: pickString(image.url, image.fileUrl, image.src) || "",
      width: pickNumber(image.width),
      height: pickNumber(image.height),
      fileName: pickString(image.name, image.fileName),
      fileSize: pickNumber(image.size, image.fileSize),
    };
  }

  if (type === "AUDIO") {
    const audio = getNestedRecord(container, "audio") || container;
    return {
      type: "voice",
      url: pickString(audio.url, audio.fileUrl) || "",
      duration: pickNumber(audio.duration),
      fileName: pickString(audio.name, audio.fileName),
      fileSize: pickNumber(audio.size, audio.fileSize),
    };
  }

  if (type === "VIDEO") {
    const video = getNestedRecord(container, "video") || container;
    return {
      type: "video",
      url: pickString(video.url, video.fileUrl) || "",
      thumbUrl: pickString(video.thumbnail, video.thumbUrl, video.coverUrl),
      duration: pickNumber(video.duration),
      width: pickNumber(video.width),
      height: pickNumber(video.height),
      fileName: pickString(video.name, video.fileName),
      fileSize: pickNumber(video.size, video.fileSize),
    };
  }

  if (type === "FILE" || type === "DOCUMENT") {
    const file =
      getNestedRecord(container, "file") || getNestedRecord(container, "document") || container;
    return {
      type: "file",
      url: pickString(file.url, file.fileUrl) || "",
      fileName: pickString(file.name, file.fileName),
      fileSize: pickNumber(file.size, file.fileSize),
    };
  }

  if (type === "LOCATION") {
    const location = getNestedRecord(container, "location") || container;
    return {
      type: "location",
      location: {
        latitude: pickNumber(location.latitude) || 0,
        longitude: pickNumber(location.longitude) || 0,
        address: pickString(location.address, location.name) || "",
      },
    };
  }

  if (type === "CARD") {
    const card =
      getNestedRecord(container, "card")
      || getNestedRecord(container, "cardResource")
      || container;
    return {
      type: "card",
      card: {
        title: pickString(card.title, card.name) || "",
        description: pickString(card.description, card.summary) || "",
        url: pickString(card.url) || "",
        image: pickString(card.image, card.imageUrl, card.coverUrl),
      },
    };
  }

  if (type === "CUSTOM") {
    const custom = getNestedRecord(container, "custom") || container;
    return {
      type: "text",
      text: pickString(custom.text, custom.customType, custom.title) || translate("[Custom message]"),
    };
  }

  return {
    type: "text",
    text: extractMessageText(container),
  };
}

function extractMessagePreview(value: unknown): string {
  if (!isRecord(value)) {
    return "";
  }

  const content = extractMessageContent(value);
  if (content.type === "text") return pickString(content.text) || "";
  if (content.type === "image") return translate("[Image]");
  if (content.type === "video") return translate("[Video]");
  if (content.type === "voice") return translate("[Voice]");
  if (content.type === "file") return translate("[File]");
  if (content.type === "location") return translate("[Location]");
  if (content.type === "card") return translate("[Card]");
  return "";
}

function resolveConversationId(
  conversation: ConversationMeta | null,
  fallbackConversationId?: string,
): string {
  return conversation?.id || fallbackConversationId || "";
}

function resolveConversationFromMessage(
  record: UnknownRecord,
  fallbackConversationId?: string,
  fallbackConversation?: ConversationMeta | null,
): ConversationMeta | null {
  const conversationRecord = getNestedRecord(record, "conversation");
  if (conversationRecord) {
    const explicit = rememberConversationMeta(
      {
        ...conversationRecord,
        id:
          pickString(
            conversationRecord.id,
            record.conversationId,
            record.channelId,
            fallbackConversationId,
          ) || "",
      },
      fallbackConversationId,
    );
    if (explicit) {
      return explicit;
    }
  }

  if (fallbackConversation) {
    return fallbackConversation;
  }

  const messageConversationId =
    pickString(record.conversationId, record.channelId, fallbackConversationId) || "";
  if (messageConversationId && conversationMetaById.has(messageConversationId)) {
    return conversationMetaById.get(messageConversationId) || null;
  }

  const targetId = pickString(record.toUserId, record.groupId);
  if (!targetId) {
    return null;
  }

  const type = record.groupId ? "GROUP" : "SINGLE";
  const conversationId =
    conversationIdByTarget.get(getConversationTargetKey(targetId, type)) || messageConversationId;
  if (!conversationId) {
    return null;
  }

  const meta: ConversationMeta = { id: conversationId, targetId, type };
  rememberConversationMeta(meta);
  return meta;
}

export function convertSDKMessageToFrontend(
  sdkMessage: unknown,
  fallbackConversationId?: string,
  fallbackConversation?: ConversationMeta | null,
): Message {
  const record = isRecord(sdkMessage) ? sdkMessage : {};
  const conversation = resolveConversationFromMessage(
    record,
    fallbackConversationId,
    fallbackConversation,
  );

  const rawSenderId =
    pickString(
      record.fromUserId,
      record.senderId,
      record.fromUid,
      getNestedRecord(record, "sender")?.id,
    ) || "";
  const senderId = normalizeCurrentSender(rawSenderId);
  const messageId = pickString(record.id, record.messageId, record.uuid) || "";

  if (conversation && messageId) {
    rememberMessageMeta(messageId, conversation);
  }

  return {
    id: messageId,
    conversationId: resolveConversationId(conversation, fallbackConversationId),
    senderId,
    senderName:
      senderId === "current-user"
        ? translate("You")
        : pickString(record.senderName, getNestedRecord(record, "sender")?.name, rawSenderId) || "",
    senderAvatar:
      pickString(record.senderAvatar, getNestedRecord(record, "sender")?.avatar) || "",
    content: extractMessageContent(record),
    time: normalizeIsoTime(record.createdAt ?? record.timestamp ?? record.updatedAt),
    status: normalizeMessageStatus(record.status),
  };
}

export function convertFrontendContentToSDK(content: Record<string, unknown>): Record<string, unknown> {
  return toTransportPayload(content).message;
}

export function convertSDKConversationToFrontend(sdkConversation: unknown): Conversation {
  const record = isRecord(sdkConversation) ? sdkConversation : {};
  const meta = rememberConversationMeta(record) || {
    id: pickString(record.id) || "",
    targetId: pickString(record.targetId) || "",
    type: normalizeConversationEnvelopeType(record.type),
  };

  return {
    id: meta.id,
    targetId: meta.targetId,
    name:
      pickString(record.name, record.targetName, meta.targetId) || translate("Untitled conversation"),
    avatar: pickString(record.avatar, record.targetAvatar) || "",
    lastMessage:
      extractMessagePreview(record.lastMessage)
      || pickString(record.lastMessageText, record.lastMessageContent)
      || "",
    lastMessageTime: normalizeIsoTime(record.updatedAt ?? record.lastMessageTime),
    unreadCount: pickNumber(record.unreadCount, record.unread) || 0,
    isOnline: Boolean(record.isOnline),
    isTyping: Boolean(record.isTyping),
    isPinned: Boolean(record.isPinned ?? record.pinned),
    type: normalizeConversationType(record.type),
  };
}

export function convertSDKGroupToFrontend(sdkGroup: unknown): Group {
  const record = isRecord(sdkGroup) ? sdkGroup : {};
  return {
    id: pickString(record.id) || "",
    name: pickString(record.name) || translate("Untitled group"),
    avatar:
      pickString(record.avatar)
      || pickString(record.name)?.slice(0, 1).toUpperCase()
      || "G",
    memberCount: pickNumber(record.memberCount) || extractArray(record.members).length,
    maxMembers: pickNumber(record.maxMembers) || 500,
    description: pickString(record.notice, record.announcement, record.description) || "",
    creatorId: pickString(record.creatorId) || "",
    ownerId: pickString(record.ownerId, record.ownerUid, record.creatorId) || "",
    members: [],
    createdAt: normalizeIsoTime(record.createdAt),
    settings: {
      allowInvite: true,
      allowMemberModify: false,
      needVerify: true,
      showMemberCount: true,
    },
    notices: [],
  };
}

export function convertSDKGroupMemberToFrontend(sdkMember: unknown): GroupMember {
  const record = isRecord(sdkMember) ? sdkMember : {};
  return {
    id: pickString(record.id, record.uid, record.userId) || "",
    name:
      pickString(record.groupNickname, record.nickname, getNestedRecord(record, "user")?.nickname)
      || pickString(record.uid, record.userId)
      || "",
    avatar: pickString(record.avatar, getNestedRecord(record, "user")?.avatar) || "",
    role: record.role === 2 ? "owner" : record.role === 1 ? "admin" : "member",
    isOnline: Boolean(record.isOnline),
    joinTime: normalizeIsoTime(record.joinedAt ?? record.createdAt),
  };
}

function buildSdkClientFacade(): OpenChatClientFacade {
  const sdk = getPcImSdk();
  return {
    backend: getPcImSdkClient(),
    realtime: sdk.realtime,
    rtc: sdk.rtc,
    im: {
      messages: sdk.messages,
      conversations: sdk.conversations,
      groups: sdk.groups,
      contacts: sdk.contacts,
      friends: sdk.friends,
    },
  };
}

function updateSDKState(nextState: Partial<SDKState>): void {
  sdkState = { ...sdkState, ...nextState };
  for (const callback of stateChangeCallbacks) {
    callback({ ...sdkState });
  }
}

function bindConnectionState(): void {
  connectionStateUnsubscribe?.();
  connectionStateUnsubscribe = subscribePcImSdkConnectionState((state) => {
    if (state === "connected") {
      updateSDKState({ connected: true, connecting: false, error: null });
      return;
    }
    if (state === "connecting") {
      updateSDKState({ connecting: true, connected: false, error: null });
      return;
    }
    if (state === "error") {
      updateSDKState({
        connecting: false,
        connected: false,
        error: translate("Realtime connection failed."),
      });
      return;
    }
    updateSDKState({ connecting: false, connected: false });
  });
}

export function getSDKClient(throwIfNotInitialized: boolean = true): OpenChatClientFacade | null {
  const hasSession = Boolean(getPcImSessionIdentity());
  if (!sdkInitialized && !hasSession && throwIfNotInitialized) {
    throw new Error("SDK client not initialized. Call initializeSDK first.");
  }

  try {
    return buildSdkClientFacade();
  } catch (error) {
    if (throwIfNotInitialized) {
      throw error;
    }
    return null;
  }
}

export async function initializeSDK(config: SDKAdapterConfig): Promise<OpenChatClientFacade> {
  if (sdkInitialized) {
    return buildSdkClientFacade();
  }
  if (sdkInitializing) {
    return sdkInitializing;
  }

  sdkInitializing = (async () => {
    updateSDKState({ connecting: true, error: null });

    try {
      initPcImSdk({
        baseUrl: config.apiBaseUrl,
        accessToken: config.accessToken,
      });
      bindConnectionState();

      const session: PcImSessionIdentity = {
        userId: config.uid,
        username: config.username || config.uid,
        displayName: config.displayName || config.uid,
        authToken: config.token,
        ...(config.accessToken ? { accessToken: config.accessToken } : {}),
      };

      await syncPcImSdkSession(session, {
        realtimeSession: {
          uid: config.uid,
          token: config.token,
          wsUrl: config.imWsUrl,
          ...(config.deviceId ? { deviceId: config.deviceId } : {}),
          ...(config.deviceFlag ? { deviceFlag: config.deviceFlag } : {}),
        },
      });

      sdkInitialized = true;
      updateSDKState({
        initialized: true,
        connecting: false,
        connected: getPcImSdkConnectionState() === "connected",
        error: null,
      });
      return buildSdkClientFacade();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : translate("SDK initialization failed.");
      updateSDKState({
        initialized: false,
        connecting: false,
        connected: false,
        error: message,
      });
      throw error;
    } finally {
      sdkInitializing = null;
    }
  })();

  return sdkInitializing;
}

export function destroySDK(): void {
  sdkInitialized = false;
  connectionStateUnsubscribe?.();
  connectionStateUnsubscribe = null;
  conversationMetaById.clear();
  conversationIdByTarget.clear();
  messageConversationById.clear();
  updateSDKState({
    initialized: false,
    connecting: false,
    connected: false,
    error: null,
  });
  void clearPcImSdkSession();
}

export function isSDKInitialized(): boolean {
  return sdkInitialized || Boolean(getPcImSessionIdentity());
}

export function getSDKState(): SDKState {
  return { ...sdkState };
}

export function subscribeToSDKState(callback: (state: SDKState) => void): () => void {
  stateChangeCallbacks.add(callback);
  callback(getSDKState());
  return () => {
    stateChangeCallbacks.delete(callback);
  };
}

async function getConversationMeta(conversationId: string): Promise<ConversationMeta> {
  const existing = conversationMetaById.get(conversationId);
  if (existing) {
    return existing;
  }

  const conversation = await getPcImSdkClient().conversations.conversationControllerGetById(
    conversationId,
  );
  const meta = rememberConversationMeta(unwrapResponse(conversation), conversationId);
  if (meta) {
    return meta;
  }

  return {
    id: conversationId,
    targetId: conversationId,
    type: "SINGLE",
  };
}

function toTransportPayload(content: Record<string, unknown>): MessageTransportPayload {
  const type = pickString(content.type) || "text";

  if (type === "image") {
    const image = {
      url: pickString(content.url) || "",
      ...(pickNumber(content.width) ? { width: pickNumber(content.width) } : {}),
      ...(pickNumber(content.height) ? { height: pickNumber(content.height) } : {}),
      ...(pickString(content.fileName) ? { name: pickString(content.fileName) } : {}),
      ...(pickNumber(content.fileSize) ? { size: pickNumber(content.fileSize) } : {}),
    };
    return {
      type: "image",
      message: { type: "IMAGE", image },
      content: { image },
    };
  }

  if (type === "voice") {
    const audio = {
      url: pickString(content.url) || "",
      ...(pickNumber(content.duration) ? { duration: pickNumber(content.duration) } : {}),
      ...(pickString(content.fileName) ? { name: pickString(content.fileName) } : {}),
      ...(pickNumber(content.fileSize) ? { size: pickNumber(content.fileSize) } : {}),
    };
    return {
      type: "audio",
      message: { type: "AUDIO", audio },
      content: { audio },
    };
  }

  if (type === "video") {
    const video = {
      url: pickString(content.url) || "",
      ...(pickString(content.thumbUrl) ? { thumbnail: pickString(content.thumbUrl) } : {}),
      ...(pickNumber(content.duration) ? { duration: pickNumber(content.duration) } : {}),
      ...(pickNumber(content.width) ? { width: pickNumber(content.width) } : {}),
      ...(pickNumber(content.height) ? { height: pickNumber(content.height) } : {}),
      ...(pickString(content.fileName) ? { name: pickString(content.fileName) } : {}),
      ...(pickNumber(content.fileSize) ? { size: pickNumber(content.fileSize) } : {}),
    };
    return {
      type: "video",
      message: { type: "VIDEO", video },
      content: { video },
    };
  }

  if (type === "file") {
    const file = {
      url: pickString(content.url) || "",
      ...(pickString(content.fileName) ? { name: pickString(content.fileName) } : {}),
      ...(pickNumber(content.fileSize) ? { size: pickNumber(content.fileSize) } : {}),
    };
    return {
      type: "file",
      message: { type: "FILE", file },
      content: { file },
    };
  }

  if (type === "location") {
    const locationRecord = isRecord(content.location) ? content.location : {};
    const location = {
      latitude: pickNumber(locationRecord.latitude) || 0,
      longitude: pickNumber(locationRecord.longitude) || 0,
      address: pickString(locationRecord.address) || "",
    };
    return {
      type: "location",
      message: { type: "LOCATION", location },
      content: { location },
    };
  }

  if (type === "card") {
    const cardRecord = isRecord(content.card) ? content.card : {};
    const card = {
      title: pickString(cardRecord.title) || "",
      description: pickString(cardRecord.description) || "",
      url: pickString(cardRecord.url) || "",
      ...(pickString(cardRecord.image) ? { imageUrl: pickString(cardRecord.image) } : {}),
    };
    return {
      type: "card",
      message: { type: "CARD", card },
      content: { card },
    };
  }

  const text = {
    text: pickString(content.text) || "",
    ...(pickString(content.html) ? { html: pickString(content.html) } : {}),
  };
  return {
    type: "text",
    message: { type: "TEXT", text },
    content: { text },
  };
}

async function sendMessageWithBackend(
  conversationId: string,
  content: Record<string, unknown>,
  options: {
    isGroup?: boolean;
    replyToMessageId?: string;
    mentions?: string[];
  } = {},
): Promise<Message> {
  const session = getPcImSessionIdentity();
  if (!session) {
    throw new Error("SDK not initialized");
  }

  const conversation = await getConversationMeta(conversationId);
  const type = options.isGroup ? "GROUP" : conversation.type;
  const targetId = conversation.targetId || conversationId;
  const transport = toTransportPayload(content);

  const payload: Record<string, unknown> = {
    version: 2,
    conversation: {
      type,
      targetId,
    },
    message: transport.message,
    type: transport.type,
    content: transport.content,
    fromUserId: session.userId,
    ...(type === "GROUP" ? { groupId: targetId } : { toUserId: targetId }),
    ...(options.replyToMessageId ? { replyToId: options.replyToMessageId } : {}),
    ...(options.mentions?.length ? { extra: { mentions: options.mentions } } : {}),
  };

  const response = await getPcImSdkClient().messages.messageControllerSend(payload as any);
  const normalized = isRecord(response) && isRecord(response.message) ? response.message : response;

  return convertSDKMessageToFrontend(normalized, conversationId, {
    id: conversationId,
    targetId,
    type,
  });
}

export function registerSDKEvents(callbacks: {
  onMessageReceived?: (message: Message) => void;
  onMessageSent?: (message: Message) => void;
  onMessageRecalled?: (messageId: string) => void;
  onMessageDeleted?: (messageId: string) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: unknown) => void;
}): () => void {
  let client: OpenChatClientFacade | null = null;
  try {
    client = getSDKClient(false);
  } catch {
    client = null;
  }

  if (!client?.realtime) {
    return () => undefined;
  }

  const disposers: Array<() => void> = [];

  disposers.push(
    client.realtime.onMessage((frame: any) => {
      const raw = isRecord(frame.raw) ? frame.raw : {};
      const message = convertSDKMessageToFrontend(
        {
          ...raw,
          id: pickString(frame.messageId, raw.id),
          conversation: frame.conversation,
          message: frame.message,
          type: isRecord(frame.message) ? frame.message.type : undefined,
          senderId: pickString(frame.senderId, raw.senderId),
          timestamp: pickNumber(frame.timestamp) || Date.now(),
        },
        pickString(frame.channelId),
      );

      callbacks.onMessageReceived?.(message);
      if (message.senderId === "current-user") {
        callbacks.onMessageSent?.(message);
      }

      const conversationMeta = messageConversationById.get(message.id);
      if (callbacks.onConversationUpdated && conversationMeta) {
        callbacks.onConversationUpdated({
          id: conversationMeta.id,
          targetId: conversationMeta.targetId,
          name: conversationMeta.targetId,
          avatar: "",
          lastMessage: extractMessagePreview({ message: frame.message }),
          lastMessageTime: message.time,
          unreadCount: 0,
          type: normalizeConversationType(conversationMeta.type),
        });
      }
    }),
  );

  disposers.push(
    client.realtime.onEvent((frame: any) => {
      const eventName = pickString(frame.event.name, frame.event.type) || "";
      const raw = isRecord(frame.raw) ? frame.raw : {};
      const messageId = pickString(raw.messageId, frame.messageId) || "";

      if (eventName.includes("recall")) {
        callbacks.onMessageRecalled?.(messageId);
      }
      if (eventName.includes("delete")) {
        callbacks.onMessageDeleted?.(messageId);
      }
    }),
  );

  disposers.push(
    client.realtime.onConnectionStateChange((state) => {
      if (state === "connected") {
        callbacks.onConnected?.();
      } else if (state === "disconnected") {
        callbacks.onDisconnected?.();
      } else if (state === "error") {
        callbacks.onError?.(new Error(translate("Realtime connection failed.")));
      }
    }),
  );

  return () => {
    for (const disposer of disposers) {
      disposer();
    }
  };
}

export async function sendTextMessage(
  conversationId: string,
  text: string,
  isGroup: boolean = false,
): Promise<Message> {
  return sendMessageWithBackend(conversationId, { type: "text", text }, { isGroup });
}

export async function sendImageMessage(
  conversationId: string,
  imageUrl: string,
  options?: { width?: number; height?: number; fileSize?: number },
  isGroup: boolean = false,
): Promise<Message> {
  return sendMessageWithBackend(
    conversationId,
    {
      type: "image",
      url: imageUrl,
      width: options?.width,
      height: options?.height,
      fileSize: options?.fileSize,
    },
    { isGroup },
  );
}

export async function sendCustomMessage(
  conversationId: string,
  content: Record<string, unknown>,
  options?: { isGroup?: boolean; replyToMessageId?: string; mentions?: string[] },
): Promise<Message> {
  return sendMessageWithBackend(conversationId, content, options);
}

export async function getMessageList(
  conversationId: string,
  options?: { beforeMessageId?: string; limit?: number },
): Promise<Message[]> {
  const conversation = await getConversationMeta(conversationId);
  const params: Record<string, string | number | boolean | null | undefined> = {
    ...(options?.beforeMessageId ? { beforeMessageId: options.beforeMessageId } : {}),
    ...(options?.limit ? { limit: options.limit } : {}),
  };

  const response =
    conversation.type === "GROUP"
      ? await getPcImSdkClient().messages.messageControllerGetByGroupId(
        conversation.targetId,
        params,
      )
      : await getPcImSdkClient().messages.messageControllerGetByUserId(
        conversation.targetId,
        params,
      );

  return extractArray(response).map((item) =>
    convertSDKMessageToFrontend(item, conversationId, conversation),
  );
}

export async function getConversationList(): Promise<Conversation[]> {
  const response = await getPcImSdkClient().conversations.conversationControllerGetByUserId();
  return extractArray(response).map((item) => convertSDKConversationToFrontend(item));
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const response = await getPcImSdkClient().conversations.conversationControllerGetById(
    conversationId,
  );
  if (!response) {
    return null;
  }
  return convertSDKConversationToFrontend(unwrapResponse(response));
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await getPcImSdkClient().conversations.conversationControllerDelete(conversationId);
}

export async function pinConversation(conversationId: string, isPinned: boolean): Promise<void> {
  await getPcImSdkClient().conversations.conversationControllerPin(conversationId, {
    isPinned,
  });
}

export async function muteConversation(conversationId: string, isMuted: boolean): Promise<void> {
  await getPcImSdkClient().conversations.conversationControllerMute(conversationId, {
    isMuted,
  });
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
  await getPcImSdkClient().conversations.conversationControllerClearUnreadCount(conversationId);
}

export async function setConversationDraft(conversationId: string, draft: string): Promise<void> {
  await getPcImSdkClient().conversations.conversationControllerUpdate(conversationId, {
    draft,
  } as any);
}

export async function getTotalUnreadCount(): Promise<number> {
  const response = await getPcImSdkClient().conversations.conversationControllerGetTotalUnreadCount();
  const normalized = unwrapResponse(response);

  if (typeof normalized === "number") {
    return normalized;
  }
  if (isRecord(normalized)) {
    return pickNumber(normalized.total, normalized.count, normalized.unreadCount) || 0;
  }
  return 0;
}

export async function recallMessage(messageId: string): Promise<boolean> {
  await getPcImSdkClient().messages.messageControllerRecall(messageId);
  return true;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  await getPcImSdkClient().messages.messageControllerDelete(messageId);
  return true;
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const conversation = messageConversationById.get(messageId);
  if (!conversation) {
    return;
  }

  if (conversation.type === "GROUP") {
    await getPcImSdkClient().messages.messageControllerMarkGroupAsRead(conversation.targetId, {
      messageIds: [messageId],
    });
    return;
  }

  await getPcImSdkClient().messages.messageControllerMarkAsRead(conversation.targetId, {
    messageIds: [messageId],
  });
}

export async function markMessagesAsRead(
  conversationId: string,
  messageIds: string[],
): Promise<void> {
  const conversation = await getConversationMeta(conversationId);
  if (conversation.type === "GROUP") {
    await getPcImSdkClient().messages.messageControllerMarkGroupAsRead(conversation.targetId, {
      messageIds,
    });
    return;
  }

  await getPcImSdkClient().messages.messageControllerMarkAsRead(conversation.targetId, {
    messageIds,
  });
}

export async function searchMessageList(
  conversationId: string,
  keyword: string,
): Promise<Message[]> {
  const list = await getMessageList(conversationId, { limit: 100 });
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return list;
  }

  return list.filter((message) =>
    pickString(message.content.text)?.toLowerCase().includes(normalizedKeyword),
  );
}

export async function getUnreadCount(conversationId: string): Promise<number> {
  const conversation = await getConversation(conversationId);
  return conversation?.unreadCount || 0;
}

function getGroupModule(): ReturnType<typeof getPcImSdk>["groups"] {
  return getPcImSdk().groups;
}

export async function getGroupList(): Promise<Group[]> {
  const groups = await getGroupModule().listByUser();
  return extractArray(groups).map((item) => convertSDKGroupToFrontend(item));
}

export async function getGroupDetail(groupId: string): Promise<Group | null> {
  const group = await getGroupModule().get(groupId);
  if (!group) {
    return null;
  }
  return convertSDKGroupToFrontend(unwrapResponse(group));
}

export async function createGroup(
  name: string,
  memberIds: string[],
  options?: { description?: string; avatar?: string },
): Promise<Group> {
  const group = await getGroupModule().create({
    name,
    memberIds,
    participants: memberIds,
    ...(options?.description ? { announcement: options.description } : {}),
    ...(options?.avatar ? { avatar: options.avatar } : {}),
  });
  return convertSDKGroupToFrontend(unwrapResponse(group));
}

export async function addGroupMembers(groupId: string, memberIds: string[]): Promise<void> {
  for (const memberId of memberIds) {
    await getGroupModule().addMember(groupId, { userId: memberId });
  }
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  await getGroupModule().removeMember(groupId, memberId);
}

export async function quitGroup(groupId: string): Promise<void> {
  await getGroupModule().quit(groupId);
}

export async function dissolveGroup(groupId: string): Promise<void> {
  await getGroupModule().delete(groupId);
}
