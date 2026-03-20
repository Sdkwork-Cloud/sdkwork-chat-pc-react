import { useEffect, useMemo, useRef, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import {
  buildNearbyWorkspaceSummary,
  NEARBY_SPACES,
} from "./nearby.workspace.model";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function NearbyPage() {
  const { tr, formatNumber, formatTime } = useAppTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState(NEARBY_SPACES[0]?.id || "");
  const [keyword, setKeyword] = useState("");
  const [maxDistanceKm, setMaxDistanceKm] = useState(10);
  const [actionMessage, setActionMessage] = useState(
    tr("Tip: Ctrl/Cmd+K search, Arrow Up/Down switch, Enter plan route."),
  );

  const localizedSpaces = useMemo(
    () =>
      NEARBY_SPACES.map((item) => ({
        ...item,
        name: tr(item.name),
        category: tr(item.category),
        activity: tr(item.activity),
      })),
    [tr],
  );

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return localizedSpaces.filter((item) => {
      if (item.distanceKm > maxDistanceKm) {
        return false;
      }
      if (!query) {
        return true;
      }
      return `${item.name} ${item.category} ${item.activity}`.toLowerCase().includes(query);
    });
  }, [keyword, localizedSpaces, maxDistanceKm]);

  useEffect(() => {
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id || "");
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );

  const summary = useMemo(() => {
    return buildNearbyWorkspaceSummary(filtered);
  }, [filtered]);

  function notifyAction(message: string): void {
    setActionMessage(`${formatTime(new Date())} - ${message}`);
  }

  function formatDistance(distanceKm: number): string {
    return tr("{{value}} km", {
      value: formatNumber(distanceKm, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    });
  }

  function planRoute(): void {
    if (!selected) {
      return;
    }
    notifyAction(
      tr("Planned route to {{name}} ({{distance}} km).", {
        name: selected.name,
        distance: formatNumber(selected.distanceKm, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      }),
    );
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

      if (event.key === "Enter") {
        event.preventDefault();
        planRoute();
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
        <h1 className="text-xl font-semibold text-text-primary">{tr("Nearby")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Geo-aware desktop workspace finder for local teams and offline activities.")}
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[520px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
                <SharedUi.Input
                  ref={searchInputRef}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={tr("Search workspace")}
                  className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                />
              <div className="mt-3">
                <label className="text-[11px] text-text-muted">
                  {tr("Max Distance: {{value}} km", {
                    value: formatNumber(maxDistanceKm, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                  })}
                </label>
                <SharedUi.Input
                  type="range"
                  min={1}
                  max={20}
                  step={0.5}
                  value={maxDistanceKm}
                  onChange={(event) => setMaxDistanceKm(Number(event.target.value))}
                  className="mt-1 h-2 w-full cursor-pointer accent-primary"
                />
              </div>
              <p className="mt-2 text-[11px] text-text-muted">
                {tr("Shortcuts: Ctrl/Cmd+K, Arrow Up/Down, Enter")}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 border-b border-border p-3 text-center">
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Spaces")}</p>
                <p className="text-xs font-semibold text-text-primary">{formatNumber(summary.total)}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Online")}</p>
                <p className="text-xs font-semibold text-text-primary">{formatNumber(summary.onlineCount)}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Nearest")}</p>
                <p className="text-xs font-semibold text-text-primary">
                  {formatDistance(summary.nearest)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Farthest")}</p>
                <p className="text-xs font-semibold text-text-primary">
                  {formatDistance(summary.farthest)}
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {filtered.map((item) => (
                  <SharedUi.Button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      selected?.id === item.id
                        ? "border-primary bg-primary-soft/25"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                    <p className="mt-1 text-xs text-text-secondary">{item.category}</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {formatDistance(item.distanceKm)}
                    </p>
                  </SharedUi.Button>
                ))}
                {filtered.length === 0 ? (
                  <p className="text-xs text-text-muted">{tr("No workspace matched.")}</p>
                ) : null}
              </div>
            </div>
          </aside>

          <section className="rounded-xl border border-border bg-bg-secondary p-5">
            {selected ? (
              <>
                <h2 className="text-lg font-semibold text-text-primary">{selected.name}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {tr("Live activity: {{activity}}", { activity: selected.activity })}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Distance")}</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatDistance(selected.distanceKm)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Category")}</p>
                    <p className="text-sm font-semibold text-text-primary">{selected.category}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Online")}</p>
                    <p className="text-sm font-semibold text-text-primary">{formatNumber(selected.membersOnline)}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-dashed border-border bg-bg-primary/50 p-5">
                  <p className="text-sm text-text-secondary">
                    {tr(
                      "Desktop map canvas placeholder: integrate GIS tile view and route planning in this panel.",
                    )}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <SharedUi.Button onClick={planRoute} className="rounded-md bg-primary px-3 py-1.5 text-xs text-white">
                    {tr("Plan Route (Enter)")}
                  </SharedUi.Button>
                  <SharedUi.Button
                    onClick={() =>
                      notifyAction(
                        tr("Joined local activity in {{name}}.", { name: selected.name }),
                      )
                    }
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    {tr("Join Activity")}
                  </SharedUi.Button>
                  <SharedUi.Button
                    onClick={() =>
                      notifyAction(
                        tr("Saved {{name}} for quick access.", { name: selected.name }),
                      )
                    }
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    {tr("Save Workspace")}
                  </SharedUi.Button>
                </div>
                <p className="mt-4 rounded-md border border-border bg-bg-primary px-3 py-2 text-xs text-text-secondary">
                  {actionMessage}
                </p>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}

export default NearbyPage;
