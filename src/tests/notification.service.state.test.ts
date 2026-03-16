import { beforeEach, describe, expect, it, vi } from "vitest";

type MockNotificationItem = {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createTime: number;
  updateTime: number;
};

let mockNotifications: MockNotificationItem[] = [];

const notificationApiMock = {
  listNotifications: vi.fn(async () => ({
    success: true,
    data: mockNotifications.map((item) => ({ ...item })),
  })),
  getUnreadCount: vi.fn(async () => ({
    success: true,
    data: mockNotifications.filter((item) => !item.isRead).length,
  })),
  markAllAsRead: vi.fn(async (params?: { type?: string }) => {
    mockNotifications = mockNotifications.map((item) => {
      if (params?.type && item.type !== params.type) {
        return item;
      }
      return { ...item, isRead: true, updateTime: Date.now() };
    });
    return { success: true };
  }),
  markAsRead: vi.fn(async (id: string) => {
    mockNotifications = mockNotifications.map((item) =>
      item.id === id ? { ...item, isRead: true, updateTime: Date.now() } : item,
    );
    return { success: true };
  }),
  markAsUnread: vi.fn(async (id: string) => {
    mockNotifications = mockNotifications.map((item) =>
      item.id === id ? { ...item, isRead: false, updateTime: Date.now() } : item,
    );
    return { success: true };
  }),
  deleteNotification: vi.fn(async (id: string) => {
    mockNotifications = mockNotifications.filter((item) => item.id !== id);
    return { success: true };
  }),
  clearAllNotifications: vi.fn(async (params?: { type?: string }) => {
    mockNotifications = mockNotifications.filter((item) => {
      if (params?.type && item.type !== params.type) {
        return true;
      }
      return !item.isRead;
    });
    return { success: true };
  }),
  sendTest: vi.fn(async (payload: { title: string; content: string; type?: string }) => {
    const now = Date.now();
    const created: MockNotificationItem = {
      id: `notification-${now}-${Math.random().toString(16).slice(2, 8)}`,
      type: payload.type || "system",
      title: payload.title,
      content: payload.content,
      isRead: false,
      createTime: now,
      updateTime: now,
    };
    mockNotifications = [created, ...mockNotifications];
    return { success: true, data: created };
  }),
  getNotificationSettings: vi.fn(async () => ({ success: true, data: {} })),
  updateNotificationSettings: vi.fn(async () => ({ success: true })),
};

vi.mock("@sdkwork/openchat-pc-kernel", async () => {
  const actual = await vi.importActual<typeof import("@sdkwork/openchat-pc-kernel")>(
    "@sdkwork/openchat-pc-kernel",
  );

  return {
    ...actual,
    getAppSdkClientWithSession: vi.fn(() => ({
      notification: notificationApiMock,
    })),
  };
});

import { NotificationService } from "../../packages/sdkwork-openchat-pc-notification/src/services/NotificationService";

describe("notification service state", () => {
  beforeEach(() => {
    mockNotifications = [];
    Object.values(notificationApiMock).forEach((mockFn) => {
      if ("mockClear" in mockFn && typeof mockFn.mockClear === "function") {
        mockFn.mockClear();
      }
    });
    NotificationService.resetWorkspaceState();
  });

  it("creates and deletes a notification", async () => {
    const created = await NotificationService.pushNotification("Test", "Content", "system");
    expect(created.success).toBe(true);
    expect(created.data?.id).toBeTruthy();

    const listAfterCreate = await NotificationService.getNotifications({ type: "all" });
    const createdId = created.data?.id || "";
    expect(listAfterCreate.data?.some((item) => item.id === createdId)).toBe(true);

    const deleted = await NotificationService.deleteNotification(createdId);
    expect(deleted.success).toBe(true);

    const listAfterDelete = await NotificationService.getNotifications({ type: "all" });
    expect(listAfterDelete.data?.some((item) => item.id === createdId)).toBe(false);
  });

  it("clears read notifications", async () => {
    const first = await NotificationService.pushNotification("A", "Read me", "system");
    const second = await NotificationService.pushNotification("B", "Keep unread", "social");

    const firstId = first.data?.id || "";
    const secondId = second.data?.id || "";

    await NotificationService.markRead(firstId);
    await NotificationService.markUnread(secondId);

    const cleared = await NotificationService.clearRead();
    expect(cleared.success).toBe(true);

    const list = await NotificationService.getNotifications({ type: "all" });
    expect(list.data?.some((item) => item.id === firstId)).toBe(false);
    expect(list.data?.some((item) => item.id === secondId)).toBe(true);
  });
});
