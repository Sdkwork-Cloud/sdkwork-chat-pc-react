import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import {
  AgentCategory,
  AgentStatus,
  AgentType,
  type Agent,
  type AgentSession,
  type AgentStats,
  type ChatMessage,
  type CreateAgentRequest,
  type CreateSessionRequest,
  type SendMessageRequest,
  type UpdateAgentRequest,
} from "../entities/agent.entity";

const FAVORITE_STORAGE_KEY = "openchat.agent.favorite";
const RECENT_STORAGE_KEY = "openchat.agent.recent";
const MAX_RECENT_AGENT_COUNT = 12;

type AgentSortType = "popular" | "newest" | "rating";

interface GetAgentsParams {
  category?: AgentCategory;
  type?: AgentType;
  search?: string;
  sortBy?: AgentSortType;
  page?: number;
  pageSize?: number;
}

interface AgentListResponse {
  agents: Agent[];
  total: number;
}

function readFavoriteAgentIds(): Set<string> {
  if (typeof localStorage === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = localStorage.getItem(FAVORITE_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeFavoriteAgentIds(favoriteIds: Set<string>): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(Array.from(favoriteIds)));
}

function readRecentAgentIds(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT_AGENT_COUNT);
  } catch {
    return [];
  }
}

function writeRecentAgentIds(recentIds: string[]): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentIds.slice(0, MAX_RECENT_AGENT_COUNT)));
}

let favoriteAgentIds = readFavoriteAgentIds();
let recentAgentIds = readRecentAgentIds();

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

function normalizeAgent(input: Partial<Agent>): Agent {
  const timestamp = new Date().toISOString();

  return {
    id: input.id || `agent-${Date.now()}`,
    uuid: input.uuid || `agent-uuid-${Date.now()}`,
    name: input.name || "Unnamed Agent",
    description: input.description || "",
    avatar: input.avatar || "agent",
    type: input.type || AgentType.ASSISTANT,
    status: input.status || AgentStatus.READY,
    config: {
      model: input.config?.model,
      temperature: input.config?.temperature,
      maxTokens: input.config?.maxTokens,
      systemPrompt: input.config?.systemPrompt,
      welcomeMessage: input.config?.welcomeMessage,
      tools: input.config?.tools,
      skills: input.config?.skills,
      memory: input.config?.memory,
      llm: input.config?.llm,
      customSettings: input.config?.customSettings,
      category: input.config?.category || AgentCategory.ALL,
      tags: Array.isArray(input.config?.tags) ? input.config?.tags : [],
      rating: Number(input.config?.rating ?? 0),
      usageCount: Number(input.config?.usageCount ?? 0),
      creator: input.config?.creator || "OpenChat",
      llmConfig: {
        model: input.config?.llmConfig?.model || input.config?.model,
        temperature: input.config?.llmConfig?.temperature ?? input.config?.temperature,
        maxTokens: input.config?.llmConfig?.maxTokens ?? input.config?.maxTokens,
        systemPrompt: input.config?.llmConfig?.systemPrompt || input.config?.systemPrompt,
      },
    },
    ownerId: input.ownerId || "current-user",
    isPublic: input.isPublic ?? true,
    isDeleted: input.isDeleted ?? false,
    capabilities: input.capabilities,
    knowledgeBaseIds: input.knowledgeBaseIds,
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

function normalizeSession(input: Partial<AgentSession>): AgentSession {
  const timestamp = new Date().toISOString();
  return {
    id: input.id || `session-${Date.now()}`,
    uuid: input.uuid,
    agentId: input.agentId || "",
    userId: input.userId || "current-user",
    title: input.title || "New Session",
    context: Array.isArray(input.context) ? input.context : [],
    lastActivityAt: input.lastActivityAt,
    metadata: input.metadata,
    status: input.status,
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

function normalizeChatMessage(input: Partial<ChatMessage>): ChatMessage {
  return {
    id: input.id || `msg-${Date.now()}`,
    role: input.role || "assistant",
    content: input.content || "",
    name: input.name,
    toolCalls: input.toolCalls,
    toolCallId: input.toolCallId,
    metadata: input.metadata,
    timestamp: Number(input.timestamp ?? Date.now()),
  };
}

function toTextContent(content: ChatMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      if (part.type === "image_url") {
        return `[image] ${part.imageUrl.url}`;
      }
      return `[file] ${part.file.name}`;
    })
    .join(" ");
}

export const AgentService = {
  getFavoriteAgentIds(): string[] {
    return Array.from(favoriteAgentIds);
  },

  isAgentFavorite(agentId: string): boolean {
    return favoriteAgentIds.has(agentId);
  },

  toggleFavoriteAgent(agentId: string): boolean {
    if (favoriteAgentIds.has(agentId)) {
      favoriteAgentIds.delete(agentId);
      writeFavoriteAgentIds(favoriteAgentIds);
      return false;
    }

    favoriteAgentIds.add(agentId);
    writeFavoriteAgentIds(favoriteAgentIds);
    return true;
  },

  getRecentAgentIds(): string[] {
    return [...recentAgentIds];
  },

  markAgentOpened(agentId: string): string[] {
    const filtered = recentAgentIds.filter((id) => id !== agentId);
    recentAgentIds = [agentId, ...filtered].slice(0, MAX_RECENT_AGENT_COUNT);
    writeRecentAgentIds(recentAgentIds);
    return [...recentAgentIds];
  },

  async getAgents(params?: GetAgentsParams): Promise<AgentListResponse> {
    const response = await getAppSdkClientWithSession().agent.getList({
      category: params?.category && params.category !== AgentCategory.ALL ? params.category : undefined,
      type: params?.type,
      search: params?.search?.trim() || undefined,
      sortBy: params?.sortBy,
      page: params?.page,
      pageSize: params?.pageSize,
    });

    const unwrapped = unwrapData<unknown>(response, response);
    const payload = unwrapped as Partial<AgentListResponse> & { items?: unknown[] };

    const list = Array.isArray(payload.agents)
      ? payload.agents
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(unwrapped)
          ? unwrapped
          : [];

    const agents = list.map((item) => normalizeAgent(item as Partial<Agent>));
    return {
      agents,
      total: Number(payload.total ?? agents.length),
    };
  },

  async getAgent(agentId: string): Promise<Agent> {
    const response = await getAppSdkClientWithSession().agent.get(agentId);
    return normalizeAgent(unwrapData<Partial<Agent>>(response, {}));
  },

  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    const response = await getAppSdkClientWithSession().agent.create(request as any);
    return normalizeAgent(unwrapData<Partial<Agent>>(response, {}));
  },

  async updateAgent(agentId: string, request: UpdateAgentRequest): Promise<Agent> {
    const response = await getAppSdkClientWithSession().agent.update(agentId, request as any);
    return normalizeAgent(unwrapData<Partial<Agent>>(response, {}));
  },

  async deleteAgent(agentId: string): Promise<void> {
    await getAppSdkClientWithSession().agent.delete(agentId);
  },

  async getAgentSessions(agentId: string): Promise<AgentSession[]> {
    const response = await getAppSdkClientWithSession().agent.listSessions(agentId);
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? list.map((item) => normalizeSession(item as Partial<AgentSession>)) : [];
  },

  async createSession(agentId: string, request: CreateSessionRequest): Promise<AgentSession> {
    const response = await getAppSdkClientWithSession().agent.createSession(agentId, request as any);
    return normalizeSession(unwrapData<Partial<AgentSession>>(response, {}));
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await getAppSdkClientWithSession().agent.listSessionMessages(sessionId);
    const list = unwrapData<unknown[]>(response, []);
    return Array.isArray(list) ? list.map((item) => normalizeChatMessage(item as Partial<ChatMessage>)) : [];
  },

  async sendMessage(sessionId: string, request: SendMessageRequest): Promise<ChatMessage> {
    const response = await getAppSdkClientWithSession().agent.sendSessionMessage(sessionId, request as any);
    return normalizeChatMessage(unwrapData<Partial<ChatMessage>>(response, {}));
  },

  async streamMessage(
    sessionId: string,
    request: SendMessageRequest,
    onChunk: (chunk: { id: string; content: string; done: boolean }) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    try {
      const message = await this.sendMessage(sessionId, request);
      onChunk({
        id: message.id,
        content: toTextContent(message.content),
        done: true,
      });
      onComplete();
    } catch (error) {
      onError(error as Error);
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    await getAppSdkClientWithSession().agent.deleteSession(sessionId);
  },

  async clearSessionHistory(sessionId: string): Promise<void> {
    await getAppSdkClientWithSession().agent.createClearSession(sessionId);
  },

  async resetAgent(agentId: string): Promise<void> {
    await getAppSdkClientWithSession().agent.reset(agentId);
  },

  async getAgentStats(agentId: string): Promise<AgentStats> {
    const response = await getAppSdkClientWithSession().agent.getStats(agentId);
    const stats = unwrapData<Partial<AgentStats>>(response, {});
    return {
      totalUsage: Number(stats.totalUsage ?? 0),
      todayUsage: Number(stats.todayUsage ?? 0),
      weeklyUsage: Number(stats.weeklyUsage ?? 0),
      averageRating: Number(stats.averageRating ?? 0),
      favoriteCount: Number(stats.favoriteCount ?? 0),
      totalSessions: Number(stats.totalSessions ?? 0),
      totalMessages: Number(stats.totalMessages ?? 0),
      avgResponseTime: Number(stats.avgResponseTime ?? 0),
      satisfactionRate: Number(stats.satisfactionRate ?? 0),
    };
  },

  async searchAgents(
    keyword: string,
    category?: AgentCategory,
    type?: AgentType,
    sortBy: AgentSortType = "popular",
  ): Promise<Agent[]> {
    const result = await this.getAgents({
      category,
      type,
      search: keyword,
      sortBy,
      page: 1,
      pageSize: 200,
    });

    return result.agents;
  },
};

export default AgentService;
