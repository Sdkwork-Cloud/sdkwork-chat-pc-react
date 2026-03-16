import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  buildMeWorkspaceSummary,
  filterQuickActions,
  QUICK_ACTIONS,
  type QuickActionId,
} from "./me.workspace.model";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function MePage() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<QuickActionId | "">(QUICK_ACTIONS[0]?.id || "");
  const [actionMessage, setActionMessage] = useState("Tip: Ctrl/Cmd+K search, Arrow Up/Down switch, Enter open.");

  const filteredActions = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) {
      return QUICK_ACTIONS;
    }
    return filterQuickActions(QUICK_ACTIONS, query);
  }, [keyword]);

  const summary = useMemo(() => buildMeWorkspaceSummary(QUICK_ACTIONS, filteredActions), [filteredActions]);

  useEffect(() => {
    if (!filteredActions.some((item) => item.id === selectedActionId)) {
      setSelectedActionId(filteredActions[0]?.id || "");
    }
  }, [filteredActions, selectedActionId]);

  const selectedAction = useMemo(
    () => filteredActions.find((item) => item.id === selectedActionId) || filteredActions[0] || null,
    [filteredActions, selectedActionId],
  );

  function notifyAction(message: string): void {
    setActionMessage(`${new Date().toLocaleTimeString()} - ${message}`);
  }

  function openAction(actionId?: QuickActionId): void {
    const targetAction = filteredActions.find((item) => item.id === (actionId || selectedAction?.id));
    if (!targetAction) {
      return;
    }
    navigate(targetAction.path);
    notifyAction(`Opened ${targetAction.label}.`);
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

      if (!filteredActions.length) {
        return;
      }

      const currentIndex = filteredActions.findIndex((item) => item.id === selectedActionId);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = Math.min(filteredActions.length - 1, safeIndex + 1);
        setSelectedActionId(filteredActions[nextIndex].id);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const nextIndex = Math.max(0, safeIndex - 1);
        setSelectedActionId(filteredActions[nextIndex].id);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        openAction();
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [filteredActions, selectedActionId, selectedAction]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Me</h1>
        <p className="mt-1 text-sm text-text-secondary">
          PC-first personal workspace with quick navigation, account status and action shortcuts.
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-border bg-bg-secondary p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
                OC
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary">OpenChat User</h2>
                <p className="text-xs text-text-secondary">workspace@openchat.ai</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Plan</p>
                <p className="text-sm font-semibold text-text-primary">Pro</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Team</p>
                <p className="text-sm font-semibold text-text-primary">3 Members</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Tokens Today</p>
                <p className="text-sm font-semibold text-text-primary">128k</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Storage</p>
                <p className="text-sm font-semibold text-text-primary">42 GB</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Quick Actions</p>
                <p className="text-sm font-semibold text-text-primary">{summary.total}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Visible Now</p>
                <p className="text-sm font-semibold text-text-primary">{summary.visible}</p>
              </div>
            </div>
          </aside>

          <section className="rounded-xl border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
            <div className="mt-3">
              <input
                ref={searchInputRef}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search quick action"
                className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              />
              <p className="mt-2 text-[11px] text-text-muted">Shortcuts: Ctrl/Cmd+K, Arrow Up/Down, Enter</p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredActions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedActionId(item.id);
                    openAction(item.id);
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    selectedAction?.id === item.id
                      ? "border-primary bg-primary-soft/25"
                      : "border-border bg-bg-primary hover:bg-bg-hover"
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.desc}</p>
                </button>
              ))}
              {filteredActions.length === 0 ? <p className="text-xs text-text-muted">No action matched.</p> : null}
            </div>

            <div className="mt-5 rounded-lg border border-border bg-bg-primary p-4">
              <h4 className="text-sm font-semibold text-text-primary">Keyboard Shortcuts</h4>
              <div className="mt-2 grid gap-2 text-xs text-text-secondary md:grid-cols-2">
                <p>
                  <span className="font-semibold text-text-primary">Ctrl + K</span> Focus quick action search
                </p>
                <p>
                  <span className="font-semibold text-text-primary">Arrow Up / Down</span> Switch selected action
                </p>
                <p>
                  <span className="font-semibold text-text-primary">Enter</span> Open selected action
                </p>
                <p>
                  <span className="font-semibold text-text-primary">Ctrl + ,</span> Open settings
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-md border border-border bg-bg-primary px-3 py-2 text-xs text-text-secondary">
              {actionMessage}
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}

export default MePage;
