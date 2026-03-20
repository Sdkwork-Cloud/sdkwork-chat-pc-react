import { useCallback, useEffect, useMemo, useState } from "react";
import { NotificationResultService } from "../services";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { Notification, NotificationStats, NotificationType } from "../types";
import {
  buildNotificationFeedSummary,
  buildNotificationWorkspaceLibrary,
  filterNotificationFeed,
} from "./notification.workspace.model";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

type NotificationFilterType = NotificationType | "all";

const notificationFilterLabelKeys: Record<NotificationFilterType, string> = {
  all: "All",
  system: "System",
  social: "Social",
  order: "Order",
  promotion: "Promotion",
  message: "Message",
};

export function NotificationsPage() {
  const { tr, formatDateTime, formatNumber } = useAppTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<NotificationFilterType>("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [keyword, setKeyword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const [listRes, statsRes] = await Promise.all([
        NotificationResultService.getNotifications({
          type: filterType,
          isRead: onlyUnread ? false : undefined,
        }),
        NotificationResultService.getStats(),
      ]);

      setNotifications(listRes.data || []);
      setStats(statsRes.data || null);

      if (!listRes.success || !statsRes.success) {
        setErrorText(tr(listRes.message || statsRes.message || "Notification data loaded with warnings."));
      }
    } catch (error) {
      setNotifications([]);
      setStats(null);
      setErrorText(error instanceof Error ? tr(error.message) : tr("Failed to load notifications."));
    } finally {
      setIsLoading(false);
    }
  }, [filterType, onlyUnread, tr]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const localizedNotifications = useMemo(
    () =>
      notifications.map((item) => ({
        ...item,
        title: tr(item.title),
        content: tr(item.content),
      })),
    [notifications, tr],
  );

  const filteredNotifications = useMemo(
    () =>
      filterNotificationFeed(localizedNotifications, {
        keyword,
        type: filterType,
        onlyUnread,
      }),
    [localizedNotifications, keyword, filterType, onlyUnread],
  );

  const summary = useMemo(
    () => buildNotificationFeedSummary(filteredNotifications),
    [filteredNotifications],
  );
  const library = useMemo(
    () => buildNotificationWorkspaceLibrary(filteredNotifications),
    [filteredNotifications],
  );

  useEffect(() => {
    if (filteredNotifications.length === 0) {
      setSelectedId(null);
      return;
    }

    const exists = selectedId
      ? filteredNotifications.some((item) => item.id === selectedId)
      : false;

    if (!exists) {
      setSelectedId(filteredNotifications[0]?.id || null);
    }
  }, [filteredNotifications, selectedId]);

  const selectedNotification = useMemo(
    () => filteredNotifications.find((item) => item.id === selectedId) || null,
    [filteredNotifications, selectedId],
  );

  const handleToggleRead = async (item: Notification) => {
    setStatusText("");
    setErrorText(null);
    try {
      const result = item.isRead
        ? await NotificationResultService.markUnread(item.id)
        : await NotificationResultService.markRead(item.id);

      if (!result.success) {
        setErrorText(tr(result.message || "Failed to update read state."));
        return;
      }

      setStatusText(item.isRead ? tr("Marked as unread.") : tr("Marked as read."));
      await loadData();
    } catch (error) {
      setErrorText(error instanceof Error ? tr(error.message) : tr("Failed to update read state."));
    }
  };

  const handleDelete = async (notificationId: string) => {
    setStatusText("");
    setErrorText(null);
    try {
      const result = await NotificationResultService.deleteNotification(notificationId);
      if (!result.success) {
        setErrorText(tr(result.message || "Failed to delete notification."));
        return;
      }
      setStatusText(tr("Notification deleted."));
      await loadData();
    } catch (error) {
      setErrorText(error instanceof Error ? tr(error.message) : tr("Failed to delete notification."));
    }
  };

  const handleMarkAllRead = async () => {
    setStatusText("");
    setErrorText(null);
    try {
      const result = await NotificationResultService.markAllRead(
        filterType === "all" ? undefined : filterType,
      );
      if (!result.success) {
        setErrorText(tr(result.message || "Failed to mark all as read."));
        return;
      }

      setStatusText(tr("All matching notifications marked as read."));
      await loadData();
    } catch (error) {
      setErrorText(error instanceof Error ? tr(error.message) : tr("Failed to mark all as read."));
    }
  };

  const handleClearRead = async () => {
    setStatusText("");
    setErrorText(null);
    try {
      const result = await NotificationResultService.clearRead(
        filterType === "all" ? undefined : filterType,
      );
      if (!result.success) {
        setErrorText(tr(result.message || "Failed to clear read notifications."));
        return;
      }

      setStatusText(tr("Read notifications cleared."));
      await loadData();
    } catch (error) {
      setErrorText(error instanceof Error ? tr(error.message) : tr("Failed to clear read notifications."));
    }
  };

  const handlePushDemo = async () => {
    setStatusText("");
    setErrorText(null);
    try {
      const result = await NotificationResultService.pushNotification(
        tr("Workspace sync complete"),
        tr("Your latest workspace settings have been synchronized successfully."),
        "system",
      );
      if (!result.success) {
        setErrorText(tr(result.message || "Failed to create demo notification."));
        return;
      }

      setStatusText(tr("Demo notification created."));
      await loadData();
    } catch (error) {
      setErrorText(error instanceof Error ? tr(error.message) : tr("Failed to create demo notification."));
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">{tr("Notification Center")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Review system, social, and workflow alerts in one consistent workspace.")}
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Current total")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{formatNumber(summary.total)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Current unread")}</p>
            <p className="mt-1 text-xl font-semibold text-primary">{formatNumber(summary.unread)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Unread lane")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{formatNumber(library.unread.length)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Global total")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{formatNumber(stats?.total ?? 0)}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <SharedUi.Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={tr("Search title or content")}
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SharedUi.Button
              onClick={() => setOnlyUnread((prev) => !prev)}
              className={`rounded-md px-3 py-1.5 text-xs ${
                onlyUnread
                  ? "bg-primary text-white"
                  : "border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {tr("Unread only")}
            </SharedUi.Button>
            <SharedUi.Button
              onClick={() => void handleMarkAllRead()}
              className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {tr("Mark all read")}
            </SharedUi.Button>
            <SharedUi.Button
              onClick={() => void handleClearRead()}
              className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {tr("Clear read")}
            </SharedUi.Button>
            <SharedUi.Button
              onClick={() => void handlePushDemo()}
              className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {tr("Push demo")}
            </SharedUi.Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(notificationFilterLabelKeys) as NotificationFilterType[]).map((type) => (
            <SharedUi.Button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                filterType === type
                  ? "bg-primary text-white"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {tr(notificationFilterLabelKeys[type])}
            </SharedUi.Button>
          ))}
        </div>

        {statusText ? (
          <div className="mb-3 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {statusText}
          </div>
        ) : null}

        {errorText ? (
          <div className="mb-3 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        ) : null}

        <div className="flex h-[calc(100%-220px)] min-h-[420px] overflow-hidden rounded-xl border border-border bg-bg-secondary">
          <aside className="w-[380px] border-r border-border bg-bg-secondary/90">
            <div className="h-full overflow-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-text-secondary">{tr("Loading notifications...")}</div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-4 text-sm text-text-secondary">
                  {tr("No notifications match current filters.")}
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const selected = item.id === selectedId;
                  return (
                    <SharedUi.Button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full border-b border-border px-4 py-3 text-left transition-colors ${
                        selected ? "bg-primary-soft/30" : "hover:bg-bg-hover"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {item.icon || "SYS"} {item.title}
                        </p>
                        {!item.isRead ? (
                          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" />
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.content}</p>
                      <p className="mt-1 text-[11px] text-text-muted">
                        {item.createTime ? formatDateTime(item.createTime) : tr("Unknown")} | {tr(notificationFilterLabelKeys[item.type])}
                      </p>
                    </SharedUi.Button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            {selectedNotification ? (
              <>
                <header className="border-b border-border px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-text-primary">
                        {selectedNotification.icon || "SYS"} {selectedNotification.title}
                      </h2>
                      <p className="mt-1 text-xs text-text-muted">
                        {selectedNotification.createTime ? formatDateTime(selectedNotification.createTime) : tr("Unknown")} |{" "}
                        {tr(notificationFilterLabelKeys[selectedNotification.type])}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SharedUi.Button
                        onClick={() => void handleToggleRead(selectedNotification)}
                        className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                      >
                      {selectedNotification.isRead ? tr("Mark unread") : tr("Mark read")}
                      </SharedUi.Button>
                      <SharedUi.Button
                        onClick={() => void handleDelete(selectedNotification.id)}
                        className="rounded-md border border-error/50 bg-error/10 px-2.5 py-1 text-xs text-error hover:bg-error/20"
                      >
                      {tr("Delete")}
                      </SharedUi.Button>
                    </div>
                  </div>
                </header>

                <div className="flex-1 overflow-auto px-5 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {selectedNotification.content}
                  </p>
                </div>

                <div className="border-t border-border px-5 py-3">
                  {selectedNotification.link ? (
                    <a
                      href={selectedNotification.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:brightness-110"
                    >
                      {tr("Open related page")}
                    </a>
                  ) : (
                    <span className="text-xs text-text-muted">{tr("No related link.")}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                {tr("Select a notification to view details.")}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default NotificationsPage;
