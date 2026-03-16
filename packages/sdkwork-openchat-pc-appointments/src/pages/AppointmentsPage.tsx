import { useEffect, useMemo, useRef, useState } from "react";

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

function formatTime(value: string): string {
  return new Date(value).toLocaleString();
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function formatStatus(status: AppointmentItem["status"]): string {
  if (status === "in-progress") {
    return "In Progress";
  }
  if (status === "done") {
    return "Done";
  }
  return "Scheduled";
}

export function AppointmentsPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentItem["status"]>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string>(APPOINTMENTS[0]?.id || "");
  const [actionMessage, setActionMessage] = useState("Tip: Use Ctrl/Cmd+K to focus search.");

  const filtered = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return APPOINTMENTS.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      const searchableText = `${item.title} ${item.owner} ${item.location} ${item.notes}`.toLowerCase();
      return searchableText.includes(normalizedKeyword);
    });
  }, [keyword, statusFilter]);

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

  function notifyAction(message: string): void {
    setActionMessage(`${new Date().toLocaleTimeString()} - ${message}`);
  }

  async function copyLocation(): Promise<void> {
    if (!selected) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      notifyAction("Clipboard is not available in current environment.");
      return;
    }
    try {
      await navigator.clipboard.writeText(selected.location);
      notifyAction(`Copied location: ${selected.location}`);
    } catch {
      notifyAction("Failed to copy meeting location.");
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
        notifyAction(`Started desktop call for "${selected.title}".`);
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [filtered, selected, selectedId]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Appointments</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Desktop schedule workspace with timeline control and meeting detail panel.
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[560px] gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  Status Filter
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                    className="mt-2 h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="all">All</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  Search
                  <input
                    ref={searchInputRef}
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Title / owner / location"
                    className="mt-2 h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-text-muted">Shortcuts: Ctrl/Cmd+K, Arrow Up/Down, Enter</p>
            </div>

            <div className="grid grid-cols-4 gap-2 border-b border-border p-3 text-center">
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">Total</p>
                <p className="text-sm font-semibold text-text-primary">{summary.total}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">Scheduled</p>
                <p className="text-sm font-semibold text-text-primary">{summary.scheduled}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">Live</p>
                <p className="text-sm font-semibold text-text-primary">{summary["in-progress"]}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">Done</p>
                <p className="text-sm font-semibold text-text-primary">{summary.done}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {filtered.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${
                        active
                          ? "border-primary bg-primary-soft/25"
                          : "border-border bg-bg-primary hover:bg-bg-hover"
                      }`}
                    >
                      <p className="line-clamp-1 text-sm font-semibold text-text-primary">{item.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">{item.owner}</p>
                      <p className="mt-1 text-[11px] text-text-muted">
                        {formatTime(item.startAt)} - {formatStatus(item.status)}
                      </p>
                    </button>
                  );
                })}
                {filtered.length === 0 ? <p className="text-xs text-text-muted">No appointments.</p> : null}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            {selected ? (
              <>
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-lg font-semibold text-text-primary">{selected.title}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{selected.notes}</p>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-4 p-5 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-bg-primary p-4">
                    <h3 className="text-sm font-semibold text-text-primary">Execution</h3>
                    <div className="mt-3 space-y-1 text-sm text-text-secondary">
                      <p>Owner: {selected.owner}</p>
                      <p>Channel: {selected.channel}</p>
                      <p>Status: {selected.status}</p>
                      <p>Start: {formatTime(selected.startAt)}</p>
                      <p>Duration: {selected.durationMinutes} min</p>
                      <p>Location: {selected.location}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary p-4">
                    <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
                    <div className="mt-3 grid gap-2">
                      <button
                        onClick={() => notifyAction(`Started desktop call for "${selected.title}".`)}
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
                      >
                        Start Desktop Call (Enter)
                      </button>
                      <button
                        onClick={() => notifyAction(`Opened shared notes for "${selected.title}".`)}
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
                      >
                        Open Shared Notes
                      </button>
                      <button
                        onClick={() => notifyAction(`Created follow-up task for "${selected.title}".`)}
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
                      >
                        Add Follow-up Task
                      </button>
                      <button
                        onClick={() => void copyLocation()}
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
                      >
                        Copy Meeting Location
                      </button>
                    </div>
                    <p className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-secondary">
                      {actionMessage}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                Select an appointment to inspect details.
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default AppointmentsPage;
