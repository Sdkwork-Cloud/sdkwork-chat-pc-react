import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Modal, ModalButtonGroup } from "@sdkwork/openchat-pc-ui";
import { AgentCategory, AgentStatus, AgentType, type Agent, type CreateAgentRequest } from "../entities/agent.entity";
import { AgentResultService, AgentService } from "../services";
import {
  applyAgentWorkbenchFilter,
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

function getAgentTypeLabel(tr: ReturnType<typeof useAppTranslation>["tr"], type: AgentType): string {
  return tr(type);
}

export function AgentMarketPage() {
  const { tr, formatNumber } = useAppTranslation();
  const navigate = useNavigate();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [rail, setRail] = useState<AgentWorkbenchRail>("all");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => AgentService.getFavoriteAgentIds());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createType, setCreateType] = useState<AgentType>(AgentType.ASSISTANT);
  const [createCategory, setCreateCategory] = useState<AgentCategory>(AgentCategory.PRODUCTIVITY);
  const [createTags, setCreateTags] = useState("");

  const railOptions = useMemo<Array<{ key: AgentWorkbenchRail; label: string }>>(
    () => [
      { key: "all", label: tr("All agents") },
      { key: "featured", label: tr("Featured") },
      { key: "mine", label: tr("My agents") },
      { key: "active", label: tr("Active") },
      { key: "recent", label: tr("Recently updated") },
    ],
    [tr],
  );

  const categoryOptions = useMemo<Array<{ value: AgentCategory; label: string }>>(
    () => [
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

  const typeOptions = useMemo<Array<{ value: AgentType; label: string }>>(
    () => [
      { value: AgentType.CHAT, label: getAgentTypeLabel(tr, AgentType.CHAT) },
      { value: AgentType.TASK, label: getAgentTypeLabel(tr, AgentType.TASK) },
      { value: AgentType.KNOWLEDGE, label: getAgentTypeLabel(tr, AgentType.KNOWLEDGE) },
      { value: AgentType.ASSISTANT, label: getAgentTypeLabel(tr, AgentType.ASSISTANT) },
      { value: AgentType.CUSTOM, label: getAgentTypeLabel(tr, AgentType.CUSTOM) },
    ],
    [tr],
  );

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      setIsLoading(true);
      setErrorText("");
      try {
        const result = await AgentResultService.getAgents({
          search: keyword.trim() || undefined,
          sortBy: "popular",
          page: 1,
          pageSize: 24,
        });

        if (!cancelled) {
          if (!result.success || !result.data) {
            setErrorText(result.error || result.message || tr("Failed to load agent list."));
            setAgents([]);
            return;
          }
          setAgents(result.data.agents);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load agents:", error);
          setErrorText(tr("Failed to load agent list."));
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
  }, [keyword, tr]);

  const scopedAgents = useMemo(() => {
    return applyAgentWorkbenchFilter({
      agents,
      rail,
      category: AgentCategory.ALL,
      keyword,
    });
  }, [agents, rail, keyword]);

  const favoriteAgentIdSet = useMemo(
    () => new Set(favoriteIds),
    [favoriteIds],
  );

  const resetFilters = () => {
    setKeyword("");
    setRail("all");
  };

  const handleToggleFavorite = (agentId: string) => {
    AgentService.toggleFavoriteAgent(agentId);
    setFavoriteIds(AgentService.getFavoriteAgentIds());
  };

  const handleOpenDetail = (agentId: string) => {
    AgentService.markAgentOpened(agentId);
    navigate(`/agents/${agentId}`);
  };

  const handleLaunchChat = (agent: Agent, prompt?: string) => {
    AgentService.markAgentOpened(agent.id);
    const params = new URLSearchParams({
      agentId: agent.id,
      agentName: agent.name,
    });
    if (prompt) {
      params.set("prompt", prompt);
    }
    navigate(`/chat?${params.toString()}`);
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCreateDescription("");
    setCreateType(AgentType.ASSISTANT);
    setCreateCategory(AgentCategory.PRODUCTIVITY);
    setCreateTags("");
    setCreateError("");
    setIsCreating(false);
  };

  const handleCreateClose = () => {
    setIsCreateOpen(false);
    resetCreateForm();
  };

  const handleCreateAgent = async () => {
    const name = createName.trim();
    if (!name || isCreating) {
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const request: CreateAgentRequest = {
        name,
        description: createDescription.trim() || undefined,
        type: createType,
        isPublic: true,
        config: {
          category: createCategory,
          creator: "You",
          tags: createTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
      };

      const result = await AgentResultService.createAgent(request);
      if (!result.success || !result.data) {
        setCreateError(result.error || result.message || tr("Save failed."));
        return;
      }

      const createdAgent = result.data as Agent;
      setAgents((previous) => [createdAgent, ...previous.filter((item) => item.id !== createdAgent.id)]);
      handleCreateClose();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : tr("Save failed."));
    } finally {
      setIsCreating(false);
    }
  };

  const modalConfirmDisabled = !createName.trim() || isCreating;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <div className="border-b border-border bg-bg-secondary/70 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto pb-1">
            <div
              role="tablist"
              aria-label={tr("Agent Market")}
              className="inline-flex min-w-full gap-2 rounded-2xl border border-border bg-bg-primary p-1 sm:min-w-0"
            >
              {railOptions.map((option) => {
                const active = option.key === rail;
                return (
                  <SharedUi.Button
                    key={option.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRail(option.key)}
                    className={`inline-flex min-w-[120px] flex-1 items-center justify-center rounded-[14px] px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    {option.label}
                  </SharedUi.Button>
                );
              })}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
            <SharedUi.Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={tr("Search by name, description, or tags")}
              className="h-11 w-full rounded-xl border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none sm:w-[320px]"
            />
            <SharedUi.Button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:brightness-110"
            >
              {tr("Create")}
            </SharedUi.Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6">
        {errorText ? (
          <div className="mb-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {tr(errorText)}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
            {tr("Loading agents...")}
          </div>
        ) : scopedAgents.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
            <p>{tr("Try a different keyword or clear the current search.")}</p>
            <SharedUi.Button
              onClick={resetFilters}
              className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {tr("Reset filters")}
            </SharedUi.Button>
          </div>
        ) : (
          <div
            data-testid="agents-market-results"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            {scopedAgents.map((agent) => {
              const favorite = favoriteAgentIdSet.has(agent.id);
              return (
                <article
                  key={agent.id}
                  onClick={() => handleOpenDetail(agent.id)}
                  className="group cursor-pointer rounded-2xl border border-border bg-bg-secondary p-4 transition-all hover:border-primary/40 hover:bg-bg-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-tertiary text-xl">
                        {agent.avatar || "AG"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-text-primary">
                          {agent.name}
                        </h3>
                        <p className="truncate text-xs text-text-muted">
                          {agent.config.creator || "OpenChat"}
                        </p>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${getStatusClass(agent.status)}`}>
                      {tr(formatStatus(agent.status))}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 min-h-[56px] text-sm text-text-secondary">
                    {agent.description || tr("No description.")}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(agent.config.tags || []).slice(0, 4).map((tag) => (
                      <span
                        key={`${agent.id}-${tag}`}
                        className="rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-tertiary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-text-muted">
                    <span>
                      {tr("Rating")}{" "}
                      {agent.config.rating !== undefined
                        ? formatNumber(agent.config.rating, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })
                        : "-"}
                    </span>
                    <span>
                      {tr("Usage")} {formatNumber(agent.config.usageCount || 0)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <SharedUi.Button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenDetail(agent.id);
                      }}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {tr("View Details")}
                    </SharedUi.Button>
                    <SharedUi.Button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleLaunchChat(agent);
                      }}
                      className="rounded-lg bg-primary px-3 py-2 text-xs text-white hover:brightness-110"
                    >
                      {tr("Start chat")}
                    </SharedUi.Button>
                    <SharedUi.Button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleFavorite(agent.id);
                      }}
                      className={`rounded-lg px-3 py-2 text-xs transition-colors ${
                        favorite
                          ? "bg-warning/15 text-warning hover:bg-warning/25"
                          : "border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                      }`}
                    >
                      {favorite ? tr("Saved") : tr("Save")}
                    </SharedUi.Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={handleCreateClose}
        title={tr("Create")}
        size="lg"
        bodyClassName="p-0"
        footer={
          <ModalButtonGroup
            onCancel={handleCreateClose}
            onConfirm={handleCreateAgent}
            confirmText={tr("Create")}
            isLoading={isCreating}
            disabled={modalConfirmDisabled}
          />
        }
      >
        <div className="space-y-4 p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="agent-create-name" className="text-xs text-text-muted">{tr("Name")}</label>
              <SharedUi.Input
                id="agent-create-name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder={tr("Display Name")}
                className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="agent-create-description" className="text-xs text-text-muted">{tr("Description")}</label>
              <SharedUi.Textarea
                id="agent-create-description"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder={tr("Add details...")}
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-bg-tertiary p-3 text-sm text-text-primary outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="agent-create-type" className="text-xs text-text-muted">{tr("Type")}</label>
              <SharedUi.Select
                id="agent-create-type"
                value={createType}
                onChange={(event) => setCreateType(event.target.value as AgentType)}
                className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none focus:border-primary"
              >
                {typeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SharedUi.Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="agent-create-category" className="text-xs text-text-muted">{tr("Category")}</label>
              <SharedUi.Select
                id="agent-create-category"
                value={createCategory}
                onChange={(event) => setCreateCategory(event.target.value as AgentCategory)}
                className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none focus:border-primary"
              >
                {categoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SharedUi.Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="agent-create-tags" className="text-xs text-text-muted">{tr("Tags")}</label>
              <SharedUi.Input
                id="agent-create-tags"
                value={createTags}
                onChange={(event) => setCreateTags(event.target.value)}
                placeholder={tr("Quick Tags")}
                className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none focus:border-primary"
              />
            </div>
          </div>

          {createError ? (
            <div className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
              {tr(createError)}
            </div>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}

export default AgentMarketPage;
