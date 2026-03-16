import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import { MemorySource, MemoryType } from "../entities/memory.entity";
import type {
  AddKnowledgeDocumentRequest,
  AgentMemory,
  ConsolidateResult,
  ConversationHistoryItem,
  GetMemoriesRequest,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeSearchResult,
  KnowledgeStats,
  MemorySearchResult,
  MemoryStats,
  MemorySummary,
  StoreMemoryRequest,
} from "../entities/memory.entity";

function unwrapData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const wrapped = payload as { data?: T };
    return wrapped.data ?? fallback;
  }
  if (payload === undefined || payload === null) {
    return fallback;
  }
  return payload as T;
}

function buildEmptyMemoryStats(): MemoryStats {
  return {
    totalMemories: 0,
    byType: {
      [MemoryType.EPISODIC]: 0,
      [MemoryType.SEMANTIC]: 0,
      [MemoryType.PROCEDURAL]: 0,
      [MemoryType.WORKING]: 0,
    },
    bySource: {
      [MemorySource.CONVERSATION]: 0,
      [MemorySource.DOCUMENT]: 0,
      [MemorySource.SYSTEM]: 0,
      [MemorySource.USER]: 0,
      [MemorySource.KNOWLEDGE]: 0,
    },
    totalTokens: 0,
    avgImportance: 0,
  };
}

function buildEmptyKnowledgeStats(): KnowledgeStats {
  return {
    totalDocuments: 0,
    totalChunks: 0,
    totalTokens: 0,
    byStatus: {},
    bySourceType: {},
  };
}

function buildEmptySummary(agentId: string, sessionId: string): MemorySummary {
  const now = new Date().toISOString();
  const id = `summary-${Date.now()}`;
  return {
    id,
    uuid: `${id}-uuid`,
    agentId,
    sessionId,
    summary: "",
    keyPoints: [],
    entities: [],
    tokenCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export class MemoryService {
  async getMemories(agentId: string, params?: GetMemoriesRequest): Promise<AgentMemory[]> {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.source) queryParams.source = params.source;
    if (params?.sessionId) queryParams.sessionId = params.sessionId;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;

    const response = await getAppSdkClientWithSession().agent.getListMemory(agentId, queryParams);

    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as AgentMemory[]) : [];
  }

  async searchMemories(
    agentId: string,
    query: string,
    type?: MemoryType,
    limit: number = 10,
    threshold: number = 0,
  ): Promise<MemorySearchResult[]> {
    const params: Record<string, string | number | boolean> = { q: query };
    if (type) params.type = type;
    if (limit) params.limit = limit;
    if (threshold) params.threshold = threshold;

    const response = await getAppSdkClientWithSession().agent.search(agentId, params);

    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as MemorySearchResult[]) : [];
  }

  async semanticSearch(agentId: string, query: string, limit: number = 10): Promise<MemorySearchResult[]> {
    return this.searchMemories(agentId, query, undefined, limit, 0);
  }

  async getStats(agentId: string): Promise<MemoryStats> {
    const response = await getAppSdkClientWithSession().agent.getStatsMemory(agentId);
    return unwrapData<MemoryStats>(response, buildEmptyMemoryStats());
  }

  async getConversationHistory(
    agentId: string,
    sessionId: string,
    maxTokens?: number,
  ): Promise<ConversationHistoryItem[]> {
    const params: Record<string, string | number | boolean> = {};
    if (maxTokens) params.maxTokens = maxTokens;

    const response = await getAppSdkClientWithSession().agent.listSessionHistory(agentId, sessionId, params);

    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as ConversationHistoryItem[]) : [];
  }

  async summarizeSession(agentId: string, sessionId: string): Promise<MemorySummary> {
    const response = await getAppSdkClientWithSession().agent.summarizeSession(agentId, sessionId);
    return unwrapData<MemorySummary>(response, buildEmptySummary(agentId, sessionId));
  }

  async storeMemory(agentId: string, request: StoreMemoryRequest): Promise<AgentMemory> {
    const response = await getAppSdkClientWithSession().agent.createMemory(agentId, request as any);
    return unwrapData<AgentMemory>(response, {
      id: "",
      uuid: "",
      agentId,
      userId: "current-user",
      sessionId: request.sessionId,
      type: request.type || MemoryType.EPISODIC,
      source: request.source || MemorySource.USER,
      content: request.content,
      importance: 0.5,
      accessCount: 0,
      metadata: request.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteMemory(agentId: string, memoryId: string): Promise<{ success: boolean }> {
    const response = await getAppSdkClientWithSession().agent.deleteMemory(agentId, memoryId);
    return unwrapData<{ success: boolean }>(response, { success: true });
  }

  async clearSessionMemories(agentId: string, sessionId: string): Promise<{ success: boolean }> {
    const response = await getAppSdkClientWithSession().agent.deleteClearSession(agentId, sessionId);
    return unwrapData<{ success: boolean }>(response, { success: true });
  }

  async consolidateMemories(agentId: string): Promise<ConsolidateResult> {
    const response = await getAppSdkClientWithSession().agent.consolidate(agentId);
    return unwrapData<ConsolidateResult>(response, {
      processed: 0,
      consolidated: 0,
      archived: 0,
      deleted: 0,
    });
  }

  async getKnowledgeDocuments(agentId: string): Promise<KnowledgeDocument[]> {
    const response = await getAppSdkClientWithSession().agent.listKnowledge(agentId);
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as KnowledgeDocument[]) : [];
  }

  async addKnowledgeDocument(
    agentId: string,
    request: AddKnowledgeDocumentRequest,
  ): Promise<KnowledgeDocument> {
    const response = await getAppSdkClientWithSession().agent.createKnowledge(agentId, request as any);
    const now = new Date().toISOString();
    return unwrapData<KnowledgeDocument>(response, {
      id: "",
      uuid: "",
      agentId,
      title: request.title,
      description: request.description,
      content: request.content,
      sourcePath: request.sourcePath,
      sourceType: request.sourceType,
      chunkCount: 0,
      tokenCount: 0,
      status: "pending",
      metadata: request.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  async searchKnowledge(
    agentId: string,
    query: string,
    limit: number = 10,
    threshold: number = 0,
  ): Promise<KnowledgeSearchResult[]> {
    const params: Record<string, string | number | boolean> = { q: query };
    if (limit) params.limit = limit;
    if (threshold) params.threshold = threshold;

    const response = await getAppSdkClientWithSession().agent.searchKnowledge(agentId, params);
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as KnowledgeSearchResult[]) : [];
  }

  async getKnowledgeStats(agentId: string): Promise<KnowledgeStats> {
    const response = await getAppSdkClientWithSession().agent.knowledgeStats(agentId);
    return unwrapData<KnowledgeStats>(response, buildEmptyKnowledgeStats());
  }

  async getKnowledgeDocument(agentId: string, documentId: string): Promise<KnowledgeDocument> {
    const response = await getAppSdkClientWithSession().agent.getKnowledge(agentId, documentId);
    const now = new Date().toISOString();
    return unwrapData<KnowledgeDocument>(response, {
      id: documentId,
      uuid: "",
      agentId,
      title: "Unknown Document",
      content: "",
      chunkCount: 0,
      tokenCount: 0,
      status: "ready",
      createdAt: now,
      updatedAt: now,
    });
  }

  async deleteKnowledgeDocument(
    agentId: string,
    documentId: string,
  ): Promise<{ success: boolean }> {
    const response = await getAppSdkClientWithSession().agent.deleteKnowledge(agentId, documentId);
    return unwrapData<{ success: boolean }>(response, { success: true });
  }

  async getDocumentChunks(agentId: string, documentId: string): Promise<KnowledgeChunk[]> {
    const response = await getAppSdkClientWithSession().agent.listKnowledgeChunks(agentId, documentId);
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? (list as KnowledgeChunk[]) : [];
  }
}

export const memoryService = new MemoryService();
