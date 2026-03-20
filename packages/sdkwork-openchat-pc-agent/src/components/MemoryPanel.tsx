import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { AgentMemoryResultService } from "../services";
import { MemorySource, MemoryType } from "../entities/memory.entity";
import type {
  AgentMemory,
  KnowledgeDocument,
  KnowledgeStats,
  MemoryStats,
} from "../entities/memory.entity";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

interface MemoryPanelProps {
  agentId: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ agentId }) => {
  const { tr, formatDateTime, formatNumber } = useAppTranslation();
  const [activeTab, setActiveTab] = useState<"memory" | "knowledge" | "stats">("memory");
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMemoryOpen, setAddMemoryOpen] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [newMemory, setNewMemory] = useState({ content: "", type: MemoryType.EPISODIC });
  const [newDocument, setNewDocument] = useState({ title: "", content: "" });

  const memoryTypeLabels = useMemo<Record<MemoryType, string>>(
    () => ({
      [MemoryType.EPISODIC]: tr("Episodic memory"),
      [MemoryType.SEMANTIC]: tr("Semantic memory"),
      [MemoryType.PROCEDURAL]: tr("Procedural memory"),
      [MemoryType.WORKING]: tr("Working memory"),
    }),
    [tr],
  );

  const memorySourceLabels = useMemo<Record<MemorySource, string>>(
    () => ({
      [MemorySource.CONVERSATION]: tr("Conversation"),
      [MemorySource.DOCUMENT]: tr("Document"),
      [MemorySource.SYSTEM]: tr("System"),
      [MemorySource.USER]: tr("User"),
      [MemorySource.KNOWLEDGE]: tr("Knowledge base"),
    }),
    [tr],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [memoriesResult, documentsResult, memoryStatsResult, knowledgeStatsResult] =
        await Promise.all([
          AgentMemoryResultService.getMemories(agentId, { limit: 50 }),
          AgentMemoryResultService.getKnowledgeDocuments(agentId),
          AgentMemoryResultService.getStats(agentId),
          AgentMemoryResultService.getKnowledgeStats(agentId),
        ]);

      if (
        !memoriesResult.success ||
        !documentsResult.success ||
        !memoryStatsResult.success ||
        !knowledgeStatsResult.success
      ) {
        setError(
          memoriesResult.error ||
            memoriesResult.message ||
            documentsResult.error ||
            documentsResult.message ||
            memoryStatsResult.error ||
            memoryStatsResult.message ||
            knowledgeStatsResult.error ||
            knowledgeStatsResult.message ||
            tr("Failed to load memory data."),
        );
        return;
      }

      setMemories(memoriesResult.data || []);
      setDocuments(documentsResult.data || []);
      setMemoryStats(memoryStatsResult.data || null);
      setKnowledgeStats(knowledgeStatsResult.data || null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tr("Failed to load memory data."));
    } finally {
      setLoading(false);
    }
  }, [agentId, tr]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      void loadData();
      return;
    }

    setLoading(true);
    try {
      const result = await AgentMemoryResultService.searchMemories(agentId, searchQuery);
      if (!result.success || !result.data) {
        setError(result.error || result.message || tr("Search failed."));
        return;
      }

      setMemories(result.data.map((item) => item.memory));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tr("Search failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.content.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await AgentMemoryResultService.storeMemory(agentId, {
        content: newMemory.content,
        type: newMemory.type,
      });

      if (!result.success) {
        setError(result.error || result.message || tr("Failed to add memory."));
        return;
      }

      setAddMemoryOpen(false);
      setNewMemory({ content: "", type: MemoryType.EPISODIC });
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tr("Failed to add memory."));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!window.confirm(tr("Delete this memory?"))) {
      return;
    }

    try {
      const result = await AgentMemoryResultService.deleteMemory(agentId, memoryId);
      if (!result.success) {
        setError(result.error || result.message || tr("Failed to delete memory."));
        return;
      }

      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tr("Failed to delete memory."));
    }
  };

  const handleAddDocument = async () => {
    if (!newDocument.title.trim() || !newDocument.content.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await AgentMemoryResultService.addKnowledgeDocument(agentId, {
        title: newDocument.title,
        content: newDocument.content,
      });

      if (!result.success) {
        setError(result.error || result.message || tr("Failed to add document."));
        return;
      }

      setAddDocumentOpen(false);
      setNewDocument({ title: "", content: "" });
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tr("Failed to add document."));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm(tr("Delete this document?"))) {
      return;
    }

    try {
      const result = await AgentMemoryResultService.deleteKnowledgeDocument(agentId, documentId);
      if (!result.success) {
        setError(result.error || result.message || tr("Failed to delete document."));
        return;
      }

      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tr("Failed to delete document."));
    }
  };

  const getDocumentStatusVariant = (
    status: string,
  ): "success" | "warning" | "error" | "secondary" => {
    switch (status) {
      case "ready":
        return "success";
      case "processing":
        return "warning";
      case "error":
        return "error";
      default:
        return "secondary";
    }
  };

  const getDocumentStatusLabel = (status: string) => {
    switch (status) {
      case "ready":
        return tr("Ready");
      case "processing":
        return tr("Processing");
      case "error":
        return tr("Error");
      case "pending":
        return tr("Pending");
      default:
        return status;
    }
  };

  const tabs = [
    { key: "memory" as const, label: tr("Memory"), icon: "M" },
    { key: "knowledge" as const, label: tr("Knowledge Base"), icon: "K" },
    { key: "stats" as const, label: tr("Statistics"), icon: "S" },
  ];

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex-shrink-0 border-b border-[var(--border-color)]">
        <div className="flex">
          {tabs.map((tab) => (
            <SharedUi.Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-[var(--ai-primary)] text-[var(--ai-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </SharedUi.Button>
          ))}
        </div>
      </div>

      {error ? (
        <SharedUi.StatusNotice tone="error" className="mx-4 mt-4" title={tr("Memory panel error")}>
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <SharedUi.Button
              onClick={() => setError(null)}
              className="rounded p-1 text-[var(--ai-error)] transition-colors hover:bg-[var(--ai-error-soft)]"
              aria-label={tr("Dismiss")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </SharedUi.Button>
          </div>
        </SharedUi.StatusNotice>
      ) : null}

      {loading ? <SharedUi.LoadingBlock className="py-4" label={tr("Loading...")} /> : null}

      <div className="flex-1 overflow-auto p-4">
        {activeTab === "memory" ? (
          <div>
            <div className="mb-4 flex gap-2">
              <SharedUi.Input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSearch();
                  }
                }}
                placeholder={tr("Search memory...")}
                className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--ai-primary)] focus:outline-none"
              />
              <SharedUi.Button
                onClick={() => void handleSearch()}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 transition-colors hover:bg-[var(--bg-hover)]"
                title={tr("Search")}
              >
                <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </SharedUi.Button>
              <SharedUi.Button
                onClick={() => setAddMemoryOpen(true)}
                className="rounded-xl bg-[var(--ai-primary)] px-4 py-2 text-white transition-colors hover:bg-[var(--ai-primary-hover)]"
                title={tr("Add memory")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </SharedUi.Button>
            </div>

            <div className="space-y-3">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--ai-primary)]"
                >
                  <p className="mb-2 line-clamp-2 text-sm text-[var(--text-primary)]">
                    {memory.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <SharedUi.Badge variant="secondary">
                        {memoryTypeLabels[memory.type]}
                      </SharedUi.Badge>
                      <SharedUi.Badge variant="outline">
                        {memorySourceLabels[memory.source]}
                      </SharedUi.Badge>
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatDateTime(memory.createdAt)}
                      </span>
                    </div>
                    <SharedUi.Button
                      onClick={() => void handleDeleteMemory(memory.id)}
                      className="p-1 text-[var(--text-muted)] transition-colors hover:text-red-500"
                      title={tr("Delete")}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </SharedUi.Button>
                  </div>
                </div>
              ))}

              {memories.length === 0 ? (
                <SharedUi.EmptyState
                  title={tr("No memory found.")}
                  description={tr("Add a memory entry or refine your search to see results here.")}
                  className="py-8"
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "knowledge" ? (
          <div>
            <div className="mb-4 flex justify-end">
              <SharedUi.Button
                onClick={() => setAddDocumentOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[var(--ai-primary)] px-4 py-2 text-white transition-colors hover:bg-[var(--ai-primary-hover)]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {tr("Add document")}
              </SharedUi.Button>
            </div>

            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="mb-1 text-sm font-medium text-[var(--text-primary)]">
                        {document.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <SharedUi.Badge variant={getDocumentStatusVariant(document.status)}>
                          {getDocumentStatusLabel(document.status)}
                        </SharedUi.Badge>
                        <span className="text-xs text-[var(--text-muted)]">
                          {tr("{{chunkCount}} chunks · {{tokenCount}} tokens", {
                            chunkCount: formatNumber(document.chunkCount),
                            tokenCount: formatNumber(document.tokenCount),
                          })}
                        </span>
                      </div>
                    </div>
                    <SharedUi.Button
                      onClick={() => void handleDeleteDocument(document.id)}
                      className="p-1 text-[var(--text-muted)] transition-colors hover:text-red-500"
                      title={tr("Delete")}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </SharedUi.Button>
                  </div>
                </div>
              ))}

              {documents.length === 0 ? (
                <SharedUi.EmptyState
                  title={tr("No knowledge documents found.")}
                  description={tr("Add a knowledge document to build the agent knowledge base.")}
                  className="py-8"
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "stats" ? (
          <div className="space-y-6">
            {memoryStats ? (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <h3 className="mb-4 text-base font-medium text-[var(--text-primary)]">
                  {tr("Memory statistics")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{tr("Total memories")}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatNumber(memoryStats.totalMemories)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{tr("Total tokens")}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatNumber(memoryStats.totalTokens)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{tr("Average importance")}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatNumber(memoryStats.avgImportance, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-[var(--text-muted)]">{tr("By type")}</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(memoryStats.byType).map(([type, count]) => (
                        <SharedUi.Badge key={type} variant="secondary">
                          {memoryTypeLabels[type as MemoryType]}: {formatNumber(count)}
                        </SharedUi.Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {knowledgeStats ? (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <h3 className="mb-4 text-base font-medium text-[var(--text-primary)]">
                  {tr("Knowledge base statistics")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{tr("Documents")}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatNumber(knowledgeStats.totalDocuments)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{tr("Chunks")}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatNumber(knowledgeStats.totalChunks)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{tr("Total tokens")}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatNumber(knowledgeStats.totalTokens)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <SharedUi.Dialog
        isOpen={addMemoryOpen}
        onClose={() => setAddMemoryOpen(false)}
        title={tr("Add memory")}
        size="md"
        closeOnOverlayClick={false}
        closeOnEscape={false}
        bodyClassName="p-4"
        footer={
          <SharedUi.ModalButtonGroup
            onCancel={() => setAddMemoryOpen(false)}
            onConfirm={() => void handleAddMemory()}
            confirmText={tr("Add")}
            disabled={!newMemory.content.trim()}
          />
        }
      >
        <div className="space-y-4">
          <SharedUi.Field>
            <SharedUi.FieldLabel>{tr("Memory content")}</SharedUi.FieldLabel>
            <SharedUi.Textarea
              value={newMemory.content}
              onChange={(event) =>
                setNewMemory((previous) => ({ ...previous, content: event.target.value }))
              }
              placeholder={tr("Memory content...")}
              rows={4}
              className="w-full resize-none"
            />
          </SharedUi.Field>
          <SharedUi.Field>
            <SharedUi.FieldLabel>{tr("Memory type")}</SharedUi.FieldLabel>
            <div className="flex flex-wrap gap-2">
              {Object.entries(memoryTypeLabels).map(([type, label]) => (
                <SharedUi.Button
                  key={type}
                  variant={newMemory.type === type ? "primary" : "secondary"}
                  size="small"
                  onClick={() =>
                    setNewMemory((previous) => ({
                      ...previous,
                      type: type as MemoryType,
                    }))
                  }
                  className="rounded-lg"
                >
                  {label}
                </SharedUi.Button>
              ))}
            </div>
          </SharedUi.Field>
        </div>
      </SharedUi.Dialog>

      <SharedUi.Dialog
        isOpen={addDocumentOpen}
        onClose={() => setAddDocumentOpen(false)}
        title={tr("Add knowledge document")}
        size="md"
        closeOnOverlayClick={false}
        closeOnEscape={false}
        bodyClassName="p-4"
        footer={
          <SharedUi.ModalButtonGroup
            onCancel={() => setAddDocumentOpen(false)}
            onConfirm={() => void handleAddDocument()}
            confirmText={tr("Add")}
            disabled={!newDocument.title.trim() || !newDocument.content.trim()}
          />
        }
      >
        <div className="space-y-4">
          <SharedUi.Field>
            <SharedUi.FieldLabel>{tr("Document title")}</SharedUi.FieldLabel>
            <SharedUi.Input
              type="text"
              value={newDocument.title}
              onChange={(event) =>
                setNewDocument((previous) => ({ ...previous, title: event.target.value }))
              }
              placeholder={tr("Document title")}
              className="w-full"
            />
          </SharedUi.Field>
          <SharedUi.Field>
            <SharedUi.FieldLabel>{tr("Document content")}</SharedUi.FieldLabel>
            <SharedUi.Textarea
              value={newDocument.content}
              onChange={(event) =>
                setNewDocument((previous) => ({ ...previous, content: event.target.value }))
              }
              placeholder={tr("Document content...")}
              rows={6}
              className="w-full resize-none"
            />
          </SharedUi.Field>
        </div>
      </SharedUi.Dialog>
    </div>
  );
};

export default MemoryPanel;
