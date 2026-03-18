import { useEffect, useMemo, useRef, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { buildLookWorkspaceSummary, LOOK_CARDS } from "./look.workspace.model";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function LookPage() {
  const { tr, formatNumber, formatTime } = useAppTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState(LOOK_CARDS[0]?.id || "");
  const [keyword, setKeyword] = useState("");
  const [previewScale, setPreviewScale] = useState(100);
  const [actionMessage, setActionMessage] = useState(
    tr("Tip: Ctrl/Cmd+K search, Arrow Up/Down switch, Enter apply, +/- scale."),
  );

  const localizedCards = useMemo(
    () =>
      LOOK_CARDS.map((item) => ({
        ...item,
        title: tr(item.title),
        theme: tr(item.theme),
        usage: tr(item.usage),
      })),
    [tr],
  );

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) {
      return localizedCards;
    }
    return localizedCards.filter((item) =>
      `${item.title} ${item.theme} ${item.palette} ${item.usage}`.toLowerCase().includes(query),
    );
  }, [keyword, localizedCards]);

  const summary = useMemo(() => buildLookWorkspaceSummary(filtered), [filtered]);

  useEffect(() => {
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id || "");
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );

  function notifyAction(message: string): void {
    setActionMessage(`${formatTime(new Date())} - ${message}`);
  }

  function applyPreset(): void {
    if (!selected) {
      return;
    }
    notifyAction(
      tr("Applied preset \"{{title}}\" to workspace.", {
        title: selected.title,
      }),
    );
  }

  function adjustScale(delta: number): void {
    setPreviewScale((current) => {
      const next = Math.min(140, Math.max(70, current + delta));
      notifyAction(
        tr("Preview scale set to {{value}}%.", {
          value: next,
        }),
      );
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

      if (event.key === "Enter") {
        event.preventDefault();
        applyPreset();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        adjustScale(5);
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        adjustScale(-5);
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
        <h1 className="text-xl font-semibold text-text-primary">{tr("Look")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Visual style review board for desktop themes and view presets.")}
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[520px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <input
                ref={searchInputRef}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={tr("Search presets by title or theme")}
                className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              />
              <p className="mt-2 text-[11px] text-text-muted">
                {tr("Shortcuts: Ctrl/Cmd+K, Arrow Up/Down, Enter, + / -")}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      selected?.id === item.id
                        ? "border-primary bg-primary-soft/25"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{item.theme}</p>
                  </button>
                ))}
                {filtered.length === 0 ? (
                  <p className="text-xs text-text-muted">{tr("No presets matched.")}</p>
                ) : null}
              </div>
            </div>
          </aside>

          <section className="rounded-xl border border-border bg-bg-secondary p-5">
            {selected ? (
              <>
                <h2 className="text-lg font-semibold text-text-primary">{selected.title}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {tr("Theme: {{theme}}", { theme: selected.theme })}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {tr("Palette: {{palette}}", { palette: selected.palette })}
                </p>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{selected.usage}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Scale")}</p>
                    <p className="text-sm font-semibold text-text-primary">{formatNumber(previewScale)}%</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Filtered")}</p>
                    <p className="text-sm font-semibold text-text-primary">{formatNumber(filtered.length)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">{tr("Themes")}</p>
                    <p className="text-sm font-semibold text-text-primary">{formatNumber(summary.themes)}</p>
                  </div>
                </div>

                  <div className="mt-5 rounded-lg border border-dashed border-border bg-bg-primary/40 p-8 text-center text-sm text-text-muted">
                    {tr(
                      "Desktop preview canvas placeholder for typography / spacing / contrast validation.",
                    )}
                  </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={applyPreset} className="rounded-md bg-primary px-3 py-1.5 text-xs text-white">
                    {tr("Apply to Workspace (Enter)")}
                  </button>
                    <button
                      onClick={() =>
                        notifyAction(
                          tr("Duplicated preset \"{{title}}\".", {
                            title: selected.title,
                          }),
                        )
                      }
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {tr("Duplicate Preset")}
                    </button>
                    <button
                      onClick={() => adjustScale(-5)}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {tr("Scale -")}
                    </button>
                    <button
                      onClick={() => adjustScale(5)}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {tr("Scale +")}
                    </button>
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

export default LookPage;
