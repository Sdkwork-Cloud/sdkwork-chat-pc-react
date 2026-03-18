import { useEffect, useMemo, useRef, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { useNavigate } from "react-router-dom";
import { buildCallQueueSummary, CALL_QUEUE, type CallTicket } from "./communication.workspace.model";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function CallsPage() {
  const { tr, formatTime } = useAppTranslation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState(CALL_QUEUE[0]?.id || "");
  const [statusFilter, setStatusFilter] = useState<"all" | CallTicket["status"]>("all");
  const [keyword, setKeyword] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [actionMessage, setActionMessage] = useState(
    tr("Tip: Ctrl/Cmd+K search, Arrow Up/Down switch, Enter join, M mute."),
  );

  function formatStatus(status: CallTicket["status"]): string {
    if (status === "ringing") {
      return tr("Ringing");
    }
    if (status === "connected") {
      return tr("Connected");
    }
    return tr("Missed");
  }

  function formatDirection(direction: CallTicket["direction"]): string {
    return direction === "inbound" ? tr("Inbound") : tr("Outbound");
  }

  function formatQuality(quality: CallTicket["quality"]): string {
    if (quality === "excellent") {
      return tr("Excellent");
    }
    if (quality === "good") {
      return tr("Good");
    }
    return tr("Unstable");
  }

  function formatTarget(target: string): string {
    return tr(target);
  }

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return CALL_QUEUE.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      return `${formatTarget(item.target)} ${formatDirection(item.direction)} ${formatStatus(item.status)}`
        .toLowerCase()
        .includes(query);
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

  const summary = useMemo(() => buildCallQueueSummary(filtered), [filtered]);

  function notifyAction(message: string): void {
    setActionMessage(`${formatTime(new Date())} - ${message}`);
  }

  function answerCall(): void {
    if (!selected) {
      return;
    }
    const targetLabel = formatTarget(selected.target);

    notifyAction(tr("Joined call {{id}} ({{target}}).", { id: selected.id, target: targetLabel }));
  }

  function toggleMute(): void {
    setIsMuted((current) => {
      const next = !current;
      notifyAction(next ? tr("Muted current call.") : tr("Unmuted current call."));
      return next;
    });
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

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMute();
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

      if (event.key === "Enter") {
        event.preventDefault();
        answerCall();
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [filtered, selectedId, selected]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">{tr("Communication")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Desktop call operations board with quality insight and device/session jump links.")}
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[520px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold text-text-primary">{tr("Live Queue")}</h2>
              <p className="mt-1 text-xs text-text-secondary">{tr("Track active, ringing and missed call tickets.")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="h-9 rounded-md border border-border bg-bg-tertiary px-2 text-xs text-text-primary"
                >
                  <option value="all">{tr("All")}</option>
                  <option value="ringing">{tr("Ringing")}</option>
                  <option value="connected">{tr("Connected")}</option>
                  <option value="missed">{tr("Missed")}</option>
                </select>
                <input
                  ref={searchInputRef}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={tr("Search queue")}
                  className="h-9 rounded-md border border-border bg-bg-tertiary px-2 text-xs text-text-primary"
                />
              </div>
              <p className="mt-2 text-[11px] text-text-muted">{tr("Shortcuts: Ctrl/Cmd+K, Arrow Up/Down, Enter, M")}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 border-b border-border p-3 text-center">
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Total")}</p>
                <p className="text-xs font-semibold text-text-primary">{summary.total}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Ringing")}</p>
                <p className="text-xs font-semibold text-text-primary">{summary.ringing}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Connected")}</p>
                <p className="text-xs font-semibold text-text-primary">{summary.connected}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Missed")}</p>
                <p className="text-xs font-semibold text-text-primary">{summary.missed}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {filtered.map((item) => {
                  const active = selected?.id === item.id;
                  const targetLabel = formatTarget(item.target);
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
                      <p className="text-sm font-semibold text-text-primary">{targetLabel}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {formatDirection(item.direction)} | {formatStatus(item.status)}
                      </p>
                      <p className="mt-1 text-[11px] text-text-muted">{formatTime(item.startedAt)}</p>
                    </button>
                  );
                })}
                {filtered.length === 0 ? <p className="text-xs text-text-muted">{tr("No call tickets matched.")}</p> : null}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary p-5">
            {selected ? (
              <>
                <h2 className="text-lg font-semibold text-text-primary">{formatTarget(selected.target)}</h2>
                <p className="mt-1 text-sm text-text-secondary">{tr("Status: {{status}}", { status: formatStatus(selected.status) })}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Direction")}</p>
                    <p className="text-sm font-semibold text-text-primary">{formatDirection(selected.direction)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Started")}</p>
                    <p className="text-sm font-semibold text-text-primary">{formatTime(selected.startedAt)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Network")}</p>
                    <p className="text-sm font-semibold text-text-primary">{formatQuality(selected.quality)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <button onClick={answerCall} className="rounded-md bg-primary px-3 py-2 text-sm text-white">
                    {tr("Answer / Join (Enter)")}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                  >
                    {isMuted ? tr("Unmute (M)") : tr("Mute (M)")}
                  </button>
                  <button
                    onClick={() => notifyAction(tr("Switched to the preferred desktop audio device."))}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                  >
                    {tr("Switch Device")}
                  </button>
                  <button
                    onClick={() => notifyAction(tr("Ended current call session."))}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                  >
                    {tr("Hang Up")}
                  </button>
                </div>

                <div className="mt-5 rounded-lg border border-border bg-bg-primary p-4">
                  <h3 className="text-sm font-semibold text-text-primary">{tr("Desktop Collaboration")}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        notifyAction(tr("Opened Device Center."));
                        navigate("/devices");
                      }}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {tr("Open Device Center")}
                    </button>
                    <button
                      onClick={() => {
                        notifyAction(tr("Opened Terminal Session."));
                        navigate("/terminal");
                      }}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {tr("Open Terminal Session")}
                    </button>
                    <button
                      onClick={() => {
                        notifyAction(tr("Opened Notifications Center."));
                        navigate("/notifications");
                      }}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {tr("Open Notifications")}
                    </button>
                  </div>
                </div>
                <p className="mt-4 rounded-md border border-border bg-bg-primary px-3 py-2 text-xs text-text-secondary">
                  {actionMessage}
                </p>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                {tr("Select a call ticket.")}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default CallsPage;
