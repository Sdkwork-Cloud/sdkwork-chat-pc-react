import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

interface AppointmentItem {
  id: string;
  title: string;
  owner: string;
  channel: "online" | "offline";
  status: "scheduled" | "in-progress" | "done";
  startAt: string;
  durationMinutes: number;
  location: string;
  notes: string;
}

const APPOINTMENTS: AppointmentItem[] = [
  {
    id: "apt-001",
    title: "Product Sync",
    owner: "AI Product Team",
    channel: "online",
    status: "scheduled",
    startAt: "2026-03-08T09:30:00+08:00",
    durationMinutes: 45,
    location: "Tencent Meeting",
    notes: "Review mobile/pc parity progress and define next sprint goals.",
  },
  {
    id: "apt-002",
    title: "Customer Onboarding Demo",
    owner: "Solutions Team",
    channel: "online",
    status: "in-progress",
    startAt: "2026-03-08T11:00:00+08:00",
    durationMinutes: 60,
    location: "Zoom #A12",
    notes: "Live walk-through for enterprise pilot customers.",
  },
  {
    id: "apt-003",
    title: "Design Critique",
    owner: "UX Guild",
    channel: "offline",
    status: "done",
    startAt: "2026-03-08T14:00:00+08:00",
    durationMinutes: 50,
    location: "Room B-210",
    notes: "Desktop interaction polish review and action tracking.",
  },
  {
    id: "apt-004",
    title: "Architecture Review",
    owner: "Platform Team",
    channel: "online",
    status: "scheduled",
    startAt: "2026-03-08T16:30:00+08:00",
    durationMinutes: 90,
    location: "Google Meet",
    notes: "Dependency and package boundary check for modular frontend.",
  },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function AppointmentsPage() {
  const { tr, formatDateTime, formatTime, formatNumber } = useAppTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentItem["status"]>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string>(APPOINTMENTS[0]?.id || "");
  const [actionMessage, setActionMessage] = useState(tr("Tip: Use Ctrl/Cmd+K to focus search."));

  const getStatusLabel = useCallback(
    (status: AppointmentItem["status"]): string => {
      if (status === "in-progress") {
        return tr("In Progress");
      }
      if (status === "done") {
        return tr("Done");
      }
      return tr("Scheduled");
    },
    [tr],
  );

  const getChannelLabel = useCallback(
    (channel: AppointmentItem["channel"]): string => {
      return channel === "online" ? tr("Online") : tr("Offline");
    },
    [tr],
  );

  const filtered = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return APPOINTMENTS.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      const searchableText = `${tr(item.title)} ${tr(item.owner)} ${tr(item.location)} ${tr(item.notes)}`.toLowerCase();
      return searchableText.includes(normalizedKeyword);
    });
  }, [keyword, statusFilter, tr]);

  useEffect(() => {
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id || "");
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );

  const summary = useMemo(
    () =>
      filtered.reduce(
        (acc, item) => {
          acc.total += 1;
          acc[item.status] += 1;
          return acc;
        },
        { total: 0, scheduled: 0, "in-progress": 0, done: 0 } as Record<"total" | AppointmentItem["status"], number>,
      ),
    [filtered],
  );

  const notifyAction = useCallback(
    (message: string): void => {
      setActionMessage(
        tr("{{time}} - {{message}}", {
          time: formatTime(new Date()),
          message,
        }),
      );
    },
    [formatTime, tr],
  );

  async function copyLocation(): Promise<void> {
    if (!selected) {
      return;
    }
    const locationLabel = tr(selected.location);
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      notifyAction(tr("Clipboard is not available in current environment."));
      return;
    }

    try {
      await navigator.clipboard.writeText(locationLabel);
      notifyAction(tr("Copied location: {{location}}", { location: locationLabel }));
    } catch {
      notifyAction(tr("Failed to copy meeting location."));
    }
  }

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if (!filtered.length) {
        return;
      }

      const currentIndex = filtered.findIndex((item) => item.id === selectedId);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = Math.min(filtered.length - 1, safeIndex + 1);
        setSelectedId(filtered[nextIndex].id);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const nextIndex = Math.max(0, safeIndex - 1);
        setSelectedId(filtered[nextIndex].id);
        return;
      }

      if (event.key === "Enter" && selected) {
        event.preventDefault();
        notifyAction(tr('Started desktop call for "{{title}}".', { title: tr(selected.title) }));
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [filtered, notifyAction, selected, selectedId, tr]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">{tr("Appointments")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Desktop schedule workspace with timeline control and meeting detail panel.")}
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[560px] gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  {tr("Status Filter")}
                  <SharedUi.Select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                    className="mt-2 h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="all">{tr("All")}</option>
                    <option value="scheduled">{tr("Scheduled")}</option>
                    <option value="in-progress">{tr("In Progress")}</option>
                    <option value="done">{tr("Done")}</option>
                  </SharedUi.Select>
                </label>
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  {tr("Search")}
                  <SharedUi.Input
                    ref={searchInputRef}
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder={tr("Title / owner / location")}
                    className="mt-2 h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-text-muted">{tr("Shortcuts: Ctrl/Cmd+K, Arrow Up/Down, Enter")}</p>
            </div>

            <div className="grid grid-cols-4 gap-2 border-b border-border p-3 text-center">
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Total")}</p>
                <p className="text-sm font-semibold text-text-primary">{formatNumber(summary.total)}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Scheduled")}</p>
                <p className="text-sm font-semibold text-text-primary">{formatNumber(summary.scheduled)}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Live")}</p>
                <p className="text-sm font-semibold text-text-primary">{formatNumber(summary["in-progress"])}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Done")}</p>
                <p className="text-sm font-semibold text-text-primary">{formatNumber(summary.done)}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {filtered.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <SharedUi.Button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${
                        active
                          ? "border-primary bg-primary-soft/25"
                          : "border-border bg-bg-primary hover:bg-bg-hover"
                      }`}
                    >
                      <p className="line-clamp-1 text-sm font-semibold text-text-primary">{tr(item.title)}</p>
                      <p className="mt-1 text-xs text-text-secondary">{tr(item.owner)}</p>
                      <p className="mt-1 text-[11px] text-text-muted">
                        {formatDateTime(item.startAt)} - {getStatusLabel(item.status)}
                      </p>
                    </SharedUi.Button>
                  );
                })}
                {filtered.length === 0 ? <p className="text-xs text-text-muted">{tr("No appointments.")}</p> : null}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            {selected ? (
              <>
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-lg font-semibold text-text-primary">{tr(selected.title)}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{tr(selected.notes)}</p>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-4 p-5 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-bg-primary p-4">
                    <h3 className="text-sm font-semibold text-text-primary">{tr("Execution")}</h3>
                    <div className="mt-3 space-y-1 text-sm text-text-secondary">
                      <p>{tr("Owner: {{owner}}", { owner: tr(selected.owner) })}</p>
                      <p>{tr("Channel: {{channel}}", { channel: getChannelLabel(selected.channel) })}</p>
                      <p>{tr("Status: {{status}}", { status: getStatusLabel(selected.status) })}</p>
                      <p>{tr("Start: {{start}}", { start: formatDateTime(selected.startAt) })}</p>
                      <p>{tr("Duration: {{duration}} min", { duration: formatNumber(selected.durationMinutes) })}</p>
                      <p>{tr("Location: {{location}}", { location: tr(selected.location) })}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary p-4">
                    <h3 className="text-sm font-semibold text-text-primary">{tr("Quick Actions")}</h3>
                    <div className="mt-3 grid gap-2">
                      <SharedUi.Button
                        type="button"
                        onClick={() =>
                          notifyAction(tr('Started desktop call for "{{title}}".', { title: tr(selected.title) }))
                        }
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
                      >
                        {tr("Start Desktop Call (Enter)")}
                      </SharedUi.Button>
                      <SharedUi.Button
                        type="button"
                        onClick={() =>
                          notifyAction(tr('Opened shared notes for "{{title}}".', { title: tr(selected.title) }))
                        }
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
                      >
                        {tr("Open Shared Notes")}
                      </SharedUi.Button>
                      <SharedUi.Button
                        type="button"
                        onClick={() =>
                          notifyAction(tr('Created follow-up task for "{{title}}".', { title: tr(selected.title) }))
                        }
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
                      >
                        {tr("Add Follow-up Task")}
                      </SharedUi.Button>
                      <SharedUi.Button
                        type="button"
                        onClick={() => {
                          void copyLocation();
                        }}
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
                      >
                        {tr("Copy Meeting Location")}
                      </SharedUi.Button>
                    </div>
                    <p className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-secondary">
                      {actionMessage}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                {tr("Select an appointment to inspect details.")}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default AppointmentsPage;
