import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { AgentCategory, AgentStatus, type Agent } from "../entities/agent.entity";
import { AgentResultService, AgentService } from "../services";
import {
  applyAgentWorkbenchFilter,
  buildAgentWorkbenchLibrary,
  buildAgentWorkbenchSummary,
  pickAgentPreviewTarget,
  type AgentWorkbenchRail,
} from "./agent.workspace.model";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

function getStatusClass(status: AgentStatus): string {
  switch (status) {
    case AgentStatus.READY:
      return "bg-[var(--ai-success-soft)] text-[var(--ai-success)]";
    case AgentStatus.CHATTING:
    case AgentStatus.EXECUTING:
      return "bg-[var(--ai-primary-soft)] text-[var(--ai-primary)]";
    case AgentStatus.ERROR:
      return "bg-[var(--ai-error-soft)] text-[var(--ai-error)]";
    default:
      return "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]";
  }
}

function formatStatus(status: AgentStatus): string {
  if (status === AgentStatus.CHATTING) {
    return "Chatting";
  }
  if (status === AgentStatus.EXECUTING) {
    return "Executing";
  }
  if (status === AgentStatus.READY) {
    return "Ready";
  }
  if (status === AgentStatus.ERROR) {
    return "Error";
  }
  return status;
}

export function AgentMarketPage() {
  const { tr, formatDate, formatNumber } = useAppTranslation();
  const navigate = useNavigate();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<AgentCategory>(AgentCategory.ALL);
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "rating">("popular");
  const [rail, setRail] = useState<AgentWorkbenchRail>("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => AgentService.getFavoriteAgentIds());
  const [recentOpenedIds, setRecentOpenedIds] = useState<string[]>(() => AgentService.getRecentAgentIds());

  const categoryOptions = useMemo<Array<{ value: AgentCategory; label: string }>>(
    () => [
      { value: AgentCategory.ALL, label: tr("All categories") },
      { value: AgentCategory.PRODUCTIVITY, label: tr("Productivity") },
      { value: AgentCategory.EDUCATION, label: tr("Education") },
      { value: AgentCategory.ENTERTAINMENT, label: tr("Entertainment") },
      { value: AgentCategory.LIFE, label: tr("Lifestyle") },
      { value: AgentCategory.PROGRAMMING, label: tr("Programming") },
      { value: AgentCategory.WRITING, label: tr("Writing") },
      { value: AgentCategory.BUSINESS, label: tr("Business") },
      { value: AgentCategory.CREATIVE, label: tr("Creative") },
    ],
    [tr],
  );

  const sortOptions = useMemo<Array<{ value: "popular" | "newest" | "rating"; label: string }>>(
    () => [
      { value: "popular", label: tr("Most popular") },
      { value: "newest", label: tr("Newest first") },
      { value: "rating", label: tr("Highest rating") },
    ],
    [tr],
  );

  const railOptions = useMemo<Array<{ key: AgentWorkbenchRail; label: string; description: string }>>(
    () => [
      { key: "all", label: tr("All agents"), description: tr("Marketplace overview") },
      { key: "featured", label: tr("Featured"), description: tr("High rating and usage") },
      { key: "mine", label: tr("My agents"), description: tr("Created or managed by you") },
      { key: "active", label: tr("Active"), description: tr("Currently chatting or running") },
      { key: "recent", label: tr("Recently updated"), description: tr("Latest maintenance and releases") },
    ],
    [tr],
  );

  useEffect(() => {
    setFavoriteIds(AgentService.getFavoriteAgentIds());
    setRecentOpenedIds(AgentService.getRecentAgentIds());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      setIsLoading(true);
      setErrorText("");
      try {
        const result = await AgentResultService.getAgents({
          category,
          search: keyword.trim() || undefined,
          sortBy,
          page: 1,
          pageSize: 24,
        });

        if (!cancelled) {
          if (!result.success || !result.data) {
            setErrorText(result.error || result.message || "Failed to load agent list.");
            setAgents([]);
            return;
          }
          setAgents(result.data.agents);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load agents:", error);
          setErrorText("Failed to load agent list.");
          setAgents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAgents();
    return () => {
      cancelled = true;
    };
  }, [category, keyword, sortBy]);

  const summary = useMemo(() => buildAgentWorkbenchSummary(agents), [agents]);
  const library = useMemo(
    () =>
      buildAgentWorkbenchLibrary(agents, {
        favoriteAgentIds: favoriteIds,
        recentOpenedAgentIds: recentOpenedIds,
      }),
    [agents, favoriteIds, recentOpenedIds],
  );

  const scopedAgents = useMemo(() => {
    return applyAgentWorkbenchFilter({
      agents,
      rail,
      category,
      keyword,
    });
  }, [agents, rail, category, keyword]);

  useEffect(() => {
    const next = pickAgentPreviewTarget({
      agents,
      preferredId: selectedAgentId,
      rail,
      category,
      keyword,
    });

    if (next !== selectedAgentId) {
      setSelectedAgentId(next);
    }
  }, [agents, category, keyword, rail, selectedAgentId]);

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) {
      return scopedAgents[0] || null;
    }
    return scopedAgents.find((item) => item.id === selectedAgentId) || scopedAgents[0] || null;
  }, [scopedAgents, selectedAgentId]);

  const emptyText = useMemo(() => {
    if (keyword.trim()) {
      return "No matching agent. Try another keyword or category.";
    }
    return "No available agent in current filter set.";
  }, [keyword]);

  const featuredAgents = useMemo(() => summary.featured.slice(0, 4), [summary.featured]);
  const favoriteAgentIdSet = useMemo(
    () => new Set(library.favorites.map((item) => item.id)),
    [library.favorites],
  );
  const recentOpenedAgents = useMemo(() => library.recentOpened.slice(0, 4), [library.recentOpened]);

  const examplePrompts = useMemo(() => {
    if (!selectedAgent) {
      return [];
    }
    const source = selectedAgent.config.customSettings?.exampleQuestions;
    if (!Array.isArray(source)) {
      return [];
    }
    return source.filter((item): item is string => typeof item === "string").slice(0, 3);
  }, [selectedAgent]);

  const resetFilters = () => {
    setKeyword("");
    setCategory(AgentCategory.ALL);
    setSortBy("popular");
    setRail("all");
  };

  const handleToggleFavorite = (agentId: string) => {
    AgentService.toggleFavoriteAgent(agentId);
    setFavoriteIds(AgentService.getFavoriteAgentIds());
  };

  const handleOpenDetail = (agentId: string) => {
    setRecentOpenedIds(AgentService.markAgentOpened(agentId));
    navigate(`/agents/${agentId}`);
  };

  const handleLaunchChat = (agent: Agent, prompt?: string) => {
    setRecentOpenedIds(AgentService.markAgentOpened(agent.id));
    const params = new URLSearchParams({
      agentId: agent.id,
      agentName: agent.name,
    });
    if (prompt) {
      params.set("prompt", prompt);
    }
    navigate(`/chat?${params.toString()}`);
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{tr("Agent Market")}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {tr("Discover, compare, and launch specialized agents with a desktop-first control panel.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SharedUi.Button
              onClick={() => navigate("/skills")}
              className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
            >
              {tr("Skill Market")}
            </SharedUi.Button>
            <SharedUi.Button
              onClick={() => navigate("/appstore")}
              className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
            >
              {tr("App Store")}
            </SharedUi.Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 overflow-auto rounded-2xl border border-border bg-bg-secondary p-4">
          <h2 className="text-sm font-semibold text-text-primary">{tr("Workbench Lens")}</h2>
          <p className="mt-1 text-xs text-text-muted">{tr("Select a business lens first, then narrow list filters.")}</p>

          <div className="mt-4 space-y-2">
            {railOptions.map((option) => {
              const active = option.key === rail;
              return (
                <SharedUi.Button
                  key={option.key}
                  onClick={() => setRail(option.key)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="mt-1 text-xs opacity-80">{option.description}</p>
                </SharedUi.Button>
              );
            })}
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Category")}</h3>
          <div className="mt-2 space-y-1">
            {categoryOptions.map((item) => {
              const active = item.value === category;
              return (
                <SharedUi.Button
                  key={item.value}
                  onClick={() => setCategory(item.value)}
                  className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {item.label}
                </SharedUi.Button>
              );
            })}
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Quick Tags")}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoryOptions
              .filter((item) => item.value !== AgentCategory.ALL)
              .slice(0, 6)
              .map((item) => (
                <SharedUi.Button
                  key={`quick-${item.value}`}
                  onClick={() => setCategory(item.value)}
                  className="rounded-full border border-border bg-bg-primary px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-primary/40 hover:bg-bg-hover"
                >
                  {item.label}
                </SharedUi.Button>
              ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Total")}</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Active")}</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{summary.active}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Mine")}</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{summary.mine}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Favorites")}</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{library.favorites.length}</p>
            </div>
          </div>
        </aside>

        <div className="min-h-0 overflow-auto rounded-2xl border border-border bg-bg-secondary p-4">
          {featuredAgents.length > 0 ? (
            <div className="mb-4 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-bg-primary to-bg-primary p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{tr("Today Focus")}</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {featuredAgents.map((item) => (
                  <SharedUi.Button
                    key={`focus-${item.id}`}
                    onClick={() => setSelectedAgentId(item.id)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-left transition-colors hover:border-primary/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-tertiary text-lg">
                      {item.avatar || "AG"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
                      <p className="truncate text-xs text-text-muted">
                          {item.config.rating !== undefined
                            ? formatNumber(item.config.rating, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })
                            : "-"} / {formatNumber(item.config.usageCount || 0)}
                      </p>
                    </div>
                  </SharedUi.Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
            <SharedUi.Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={tr("Search by name, description, or tags")}
              className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <SharedUi.Select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "popular" | "newest" | "rating")}
              className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              {sortOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SharedUi.Select>
          </div>

          {errorText ? (
            <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {tr(errorText)}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-border bg-bg-primary p-5 text-sm text-text-secondary">
              {tr("Loading agents...")}
            </div>
          ) : scopedAgents.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-primary p-5 text-sm text-text-secondary">
              <p>{tr(emptyText)}</p>
              <SharedUi.Button
                onClick={resetFilters}
                className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
              >
                {tr("Reset filters")}
              </SharedUi.Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scopedAgents.map((agent) => {
                const active = selectedAgent?.id === agent.id;
                return (
                  <article
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      active ? "border-primary bg-primary/5" : "border-border bg-bg-primary hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-tertiary text-xl">
                          {agent.avatar || "AG"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-text-primary">{agent.name}</h3>
                          <p className="truncate text-xs text-text-muted">{agent.config.creator || "OpenChat"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SharedUi.Button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleFavorite(agent.id);
                          }}
                          className={`rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
                            favoriteAgentIdSet.has(agent.id)
                              ? "bg-warning/15 text-warning hover:bg-warning/25"
                              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                          }`}
                        >
                          {favoriteAgentIdSet.has(agent.id) ? tr("Saved") : tr("Save")}
                        </SharedUi.Button>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${getStatusClass(agent.status)}`}>
                          {tr(formatStatus(agent.status))}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-[40px] text-sm text-text-secondary">
                      {agent.description || tr("No description.")}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(agent.config.tags || []).slice(0, 4).map((tag) => (
                        <span key={`${agent.id}-${tag}`} className="rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-tertiary">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                            <span>{tr("Rating")} {agent.config.rating !== undefined
                              ? formatNumber(agent.config.rating, {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })
                              : "-"}</span>
                      <span>{tr("Usage")} {formatNumber(agent.config.usageCount || 0)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="hidden min-h-0 overflow-auto rounded-2xl border border-border bg-bg-secondary p-4 xl:block">
          <h2 className="text-sm font-semibold text-text-primary">{tr("Live Preview")}</h2>
          {!selectedAgent ? (
            <div className="mt-3 rounded-lg border border-border bg-bg-primary p-4 text-sm text-text-secondary">
              {tr("Select an agent to view details.")}
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="rounded-lg border border-border bg-bg-primary p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary text-xl">
                    {selectedAgent.avatar || "AG"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-text-primary">{selectedAgent.name}</h3>
                    <p className="truncate text-xs text-text-muted">{selectedAgent.config.creator || "OpenChat"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{selectedAgent.description || tr("No description.")}</p>
              </div>

              <div className="rounded-lg border border-border bg-bg-primary p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Capabilities")}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedAgent.config.tags || []).length > 0 ? (
                    (selectedAgent.config.tags || []).map((tag) => (
                      <span key={`${selectedAgent.id}-${tag}`} className="rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-tertiary">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">{tr("No tags")}</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-primary p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Actions")}</h4>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <SharedUi.Button
                    onClick={() => handleOpenDetail(selectedAgent.id)}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover"
                  >
                    {tr("Open detail workspace")}
                  </SharedUi.Button>
                  <SharedUi.Button
                    onClick={() => handleLaunchChat(selectedAgent)}
                    className="rounded-md bg-primary px-3 py-2 text-sm text-white transition-colors hover:brightness-110"
                  >
                    {tr("Start chat")}
                  </SharedUi.Button>
                  <SharedUi.Button
                    onClick={() => handleToggleFavorite(selectedAgent.id)}
                    className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning transition-colors hover:bg-warning/20"
                  >
                    {favoriteAgentIdSet.has(selectedAgent.id) ? tr("Remove from favorites") : tr("Save to favorites")}
                  </SharedUi.Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-primary p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Starter Prompt")}</h4>
                <p className="mt-2 text-xs text-text-secondary">
                  {selectedAgent.config.welcomeMessage || tr("Describe your goal and expected outcome.")}
                </p>
                {examplePrompts.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {examplePrompts.map((prompt) => (
                      <SharedUi.Button
                        key={`${selectedAgent.id}-${prompt}`}
                        onClick={() => handleLaunchChat(selectedAgent, prompt)}
                        className="w-full rounded-md bg-bg-tertiary px-2.5 py-1.5 text-left text-xs text-text-secondary transition-colors hover:bg-bg-hover"
                      >
                        {prompt}
                      </SharedUi.Button>
                    ))}
                  </div>
                ) : null}
              </div>

              {recentOpenedAgents.length > 0 ? (
                <div className="rounded-lg border border-border bg-bg-primary p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Recently Opened")}</h4>
                  <div className="mt-2 space-y-2">
                    {recentOpenedAgents.map((item) => (
                      <SharedUi.Button
                        key={`opened-${item.id}`}
                        onClick={() => setSelectedAgentId(item.id)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="text-text-muted">
                          {favoriteAgentIdSet.has(item.id) ? tr("Saved") : tr("Recent")}
                        </span>
                      </SharedUi.Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {summary.recent.length > 0 ? (
                <div className="rounded-lg border border-border bg-bg-primary p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Recently Updated")}</h4>
                  <div className="mt-2 space-y-2">
                    {summary.recent.slice(0, 3).map((item) => (
                      <SharedUi.Button
                        key={`recent-${item.id}`}
                        onClick={() => setSelectedAgentId(item.id)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="text-text-muted">{formatDate(item.updatedAt, { dateStyle: "medium" })}</span>
                      </SharedUi.Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default AgentMarketPage;
