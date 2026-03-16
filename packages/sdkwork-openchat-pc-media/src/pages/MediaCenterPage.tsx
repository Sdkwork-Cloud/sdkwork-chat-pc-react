import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildMediaWorkspaceSummary,
  filterMediaWorkspace,
  MEDIA_CHANNELS,
  type MediaChannel,
} from "./media.workspace.model";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function MediaCenterPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState(MEDIA_CHANNELS[0]?.id || "");
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | MediaChannel["type"]>("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [actionMessage, setActionMessage] = useState(
    "Tip: Ctrl/Cmd+K search, Arrow Up/Down switch, Space play/pause, +/- volume.",
  );

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return filterMediaWorkspace(MEDIA_CHANNELS, { keyword: query, type: typeFilter });
  }, [keyword, typeFilter]);

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
    () => buildMediaWorkspaceSummary(filtered),
    [filtered],
  );

  function notifyAction(message: string): void {
    setActionMessage(`${new Date().toLocaleTimeString()} - ${message}`);
  }

  function togglePlayback(): void {
    setIsPlaying((current) => {
      const next = !current;
      notifyAction(next ? "Playback started." : "Playback paused.");
      return next;
    });
  }

  function adjustVolume(delta: number): void {
    setVolume((current) => {
      const next = Math.max(0, Math.min(100, current + delta));
      notifyAction(`Volume set to ${next}%.`);
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

      if (event.key === " ") {
        event.preventDefault();
        togglePlayback();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        adjustVolume(5);
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        adjustVolume(-5);
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
  }, [filtered, selectedId]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Media Center</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Multi-channel desktop monitor for audio, video and podcast streams.
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[520px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                  className="h-9 rounded-md border border-border bg-bg-tertiary px-2 text-xs text-text-primary"
                >
                  <option value="all">All</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="podcast">Podcast</option>
                </select>
                <input
                  ref={searchInputRef}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search channel"
                  className="h-9 rounded-md border border-border bg-bg-tertiary px-2 text-xs text-text-primary"
                />
              </div>
              <p className="mt-2 text-[11px] text-text-muted">Shortcuts: Ctrl/Cmd+K, Arrow Up/Down, Space, + / -</p>
            </div>
            <div className="grid grid-cols-4 gap-2 border-b border-border p-3 text-center">
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">Total</p>
                <p className="text-xs font-semibold text-text-primary">{summary.total}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">Audio</p>
                <p className="text-xs font-semibold text-text-primary">{summary.audio}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">Video</p>
                <p className="text-xs font-semibold text-text-primary">{summary.video}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">Podcast</p>
                <p className="text-xs font-semibold text-text-primary">{summary.podcast}</p>
              </div>
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
                    <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                    <p className="mt-1 text-xs text-text-secondary">{item.type}</p>
                    <p className="mt-1 text-[11px] text-text-muted">Audience {item.audience}</p>
                  </button>
                ))}
                {filtered.length === 0 ? <p className="text-xs text-text-muted">No channels matched.</p> : null}
              </div>
            </div>
          </aside>

          <section className="rounded-xl border border-border bg-bg-secondary p-5">
            {selected ? (
              <>
                <h2 className="text-lg font-semibold text-text-primary">{selected.name}</h2>
                <p className="mt-1 text-sm text-text-secondary">Now Playing: {selected.nowPlaying}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">Audience</p>
                    <p className="text-sm font-semibold text-text-primary">{selected.audience}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">Volume</p>
                    <p className="text-sm font-semibold text-text-primary">{volume}%</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                    <p className="text-[11px] text-text-muted">State</p>
                    <p className="text-sm font-semibold text-text-primary">{isPlaying ? "Playing" : "Paused"}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-dashed border-border bg-bg-primary/40 p-8 text-center text-sm text-text-muted">
                  Desktop player canvas placeholder (spectrum, subtitles, chapter timeline).
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={togglePlayback} className="rounded-md bg-primary px-3 py-1.5 text-xs text-white">
                    {isPlaying ? "Pause (Space)" : "Play (Space)"}
                  </button>
                  <button
                    onClick={() => notifyAction("Queued next recommended media item.")}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    Queue Next
                  </button>
                  <button
                    onClick={() => notifyAction("Opened transcript panel.")}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    Open Transcript
                  </button>
                  <button
                    onClick={() => adjustVolume(-5)}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    Volume -
                  </button>
                  <button
                    onClick={() => adjustVolume(5)}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    Volume +
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

export default MediaCenterPage;
