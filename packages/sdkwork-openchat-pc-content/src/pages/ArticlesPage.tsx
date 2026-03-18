import { useEffect, useMemo, useRef, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { DiscoverResultService } from "@sdkwork/openchat-pc-discover";
import {
  buildArticleWorkspaceSummary,
  FALLBACK_ARTICLES,
  type ArticleItem,
} from "./content.workspace.model";

function toArticle(
  item: any,
  tr: (key: string, options?: Record<string, unknown>) => string,
): ArticleItem {
  return {
    id: String(item?.id || Math.random()),
    title: String(item?.title || tr("Untitled")),
    summary: String(item?.summary || item?.content || ""),
    source: String(item?.source || tr("Unknown")),
    readCount: Number(item?.reads || 0),
    publishedAt: item?.createTime ? new Date(item.createTime).toISOString() : new Date().toISOString(),
  };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function ArticlesPage() {
  const { tr, formatDateTime, formatNumber, formatTime } = useAppTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState("");
  const [articles, setArticles] = useState<ArticleItem[]>(FALLBACK_ARTICLES);
  const [selectedId, setSelectedId] = useState(FALLBACK_ARTICLES[0]?.id || "");
  const [readingList, setReadingList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(
    tr("Tip: Ctrl/Cmd+K search, Arrow Up/Down switch, Enter open, L save."),
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const result = await DiscoverResultService.getFeed({ type: "article" }, 1, 30);
        const next = (result.data?.content || []).map((item) => toArticle(item, tr));
        if (!cancelled && next.length > 0) {
          setArticles(next);
        }
      } catch {
        // Keep fallback list.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tr]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return articles;
    }
    return articles.filter((item) => {
      const searchable = `${tr(item.title)} ${tr(item.summary)} ${tr(item.source)}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [articles, keyword, tr]);

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
    return buildArticleWorkspaceSummary(filtered);
  }, [filtered]);

  function notifyAction(message: string): void {
    setActionMessage(
      tr("{{time}} - {{message}}", {
        time: formatTime(Date.now()),
        message,
      }),
    );
  }

  function openSelectedArticle(): void {
    if (!selected) {
      return;
    }
    notifyAction(tr("Opened full article: {{title}}", { title: tr(selected.title) }));
  }

  async function copySelectedTitle(): Promise<void> {
    if (!selected) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      notifyAction(tr("Clipboard is not available in current environment."));
      return;
    }
    try {
      const titleLabel = tr(selected.title);
      await navigator.clipboard.writeText(titleLabel);
      notifyAction(tr("Copied title: {{title}}", { title: titleLabel }));
    } catch {
      notifyAction(tr("Failed to copy article title."));
    }
  }

  function toggleReadingList(): void {
    if (!selected) {
      return;
    }
    setReadingList((current) => {
      if (current.includes(selected.id)) {
        notifyAction(tr("Removed from reading list: {{title}}", { title: tr(selected.title) }));
        return current.filter((id) => id !== selected.id);
      }
      notifyAction(tr("Added to reading list: {{title}}", { title: tr(selected.title) }));
      return [...current, selected.id];
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

      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        toggleReadingList();
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
        openSelectedArticle();
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [filtered, selectedId, selected, readingList]);

  const isSaved = selected ? readingList.includes(selected.id) : false;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">{tr("Content")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Article desk for reading, filtering and quick curation in desktop mode.")}
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
                placeholder={tr("Search article title or source")}
                className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              />
              <p className="mt-2 text-[11px] text-text-muted">
                {tr("Shortcuts: Ctrl/Cmd+K, Arrow Up/Down, Enter, L")}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 border-b border-border p-3 text-center">
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Articles")}</p>
                <p className="text-xs font-semibold text-text-primary">{formatNumber(summary.total)}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Saved")}</p>
                <p className="text-xs font-semibold text-text-primary">{formatNumber(readingList.length)}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Avg Reads")}</p>
                <p className="text-xs font-semibold text-text-primary">{formatNumber(summary.avgReads)}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-1 py-2">
                <p className="text-[11px] text-text-muted">{tr("Top Reads")}</p>
                <p className="text-xs font-semibold text-text-primary">{formatNumber(summary.maxRead)}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {isLoading ? <p className="text-xs text-text-secondary">{tr("Loading article feed...")}</p> : null}
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
                    <p className="line-clamp-1 text-sm font-semibold text-text-primary">{tr(item.title)}</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {tr(item.source)} | {tr("{{count}} reads", { count: item.readCount })}
                    </p>
                  </button>
                ))}
                {filtered.length === 0 ? <p className="text-xs text-text-muted">{tr("No articles matched.")}</p> : null}
              </div>
            </div>
          </aside>

          <section className="rounded-xl border border-border bg-bg-secondary p-5">
            {selected ? (
              <>
                <h2 className="text-lg font-semibold text-text-primary">{tr(selected.title)}</h2>
                <p className="mt-1 text-xs text-text-muted">
                  {tr(selected.source)} | {formatDateTime(selected.publishedAt)}
                </p>
                <p className="mt-4 text-sm leading-7 text-text-secondary">{tr(selected.summary)}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={openSelectedArticle} className="rounded-md bg-primary px-3 py-1.5 text-xs text-white">
                    {tr("Open Full Article (Enter)")}
                  </button>
                  <button
                    onClick={toggleReadingList}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    {isSaved ? tr("Remove From Reading List (L)") : tr("Add to Reading List (L)")}
                  </button>
                  <button
                    onClick={() => void copySelectedTitle()}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    {tr("Copy Title")}
                  </button>
                </div>
                <p className="mt-4 rounded-md border border-border bg-bg-primary px-3 py-2 text-xs text-text-secondary">
                  {actionMessage}
                </p>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">
                {tr("No article selected.")}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default ArticlesPage;
