import { useCallback, useEffect, useRef, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { Agent, AgentMessage, AgentSession, ChatMessage } from "../entities/agent.entity";
import { AgentResultService } from "../services";

interface AgentChatProps {
  agent: Agent;
  session?: AgentSession;
  onSessionCreated?: (session: AgentSession) => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({
  agent,
  session: initialSession,
  onSessionCreated,
}) => {
  const { tr } = useAppTranslation();
  const [session, setSession] = useState<AgentSession | undefined>(initialSession);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom, streamingContent]);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    if (session) {
      void loadMessages();
    }
  }, [session]);

  const toMessageText = (content: ChatMessage["content"]): string => {
    if (typeof content === "string") {
      return content;
    }

    return content
      .map((part) => {
        if (part.type === "text") {
          return part.text;
        }

        if (part.type === "image_url") {
          return tr("[Image] {{url}}", { url: part.imageUrl.url });
        }

        return tr("[File] {{name}}", { name: part.file.name });
      })
      .join(" ");
  };

  const toErrorMessage = (nextError: unknown): string => {
    if (nextError instanceof Error && nextError.message) {
      return nextError.message;
    }

    return tr("Failed to send message.");
  };

  const loadMessages = async () => {
    if (!session) {
      return;
    }

    try {
      const result = await AgentResultService.getSessionMessages(session.id);
      if (!result.success || !result.data) {
        throw new Error(result.error || result.message || tr("Failed to load messages."));
      }

      const nextMessages: AgentMessage[] = result.data.map((message) => ({
        id: message.id,
        sessionId: session.id,
        content: toMessageText(message.content),
        role: message.role,
        createdAt: new Date(message.timestamp).toISOString(),
      }));

      setMessages(nextMessages);
    } catch (nextError) {
      console.error("Failed to load agent messages:", nextError);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) {
      return;
    }

    setError(null);
    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    try {
      let currentSession = session;

      if (!currentSession) {
        const sessionResult = await AgentResultService.createSession(agent.id, {
          title: userMessage.slice(0, 50),
        });

        if (!sessionResult.success || !sessionResult.data) {
          setError(sessionResult.error || sessionResult.message || tr("Failed to create session."));
          setLoading(false);
          return;
        }

        currentSession = sessionResult.data;
        setSession(currentSession);
        onSessionCreated?.(currentSession);
      }

      const tempUserMessage: AgentMessage = {
        id: `temp-${Date.now()}`,
        sessionId: currentSession.id,
        content: userMessage,
        role: "user",
        createdAt: new Date().toISOString(),
      };

      setMessages((previous) => [...previous, tempUserMessage]);
      setStreamingContent("");

      const streamResult = await AgentResultService.streamMessage(
        currentSession.id,
        { content: userMessage },
        (chunk: { id: string; content: string; done: boolean }) => {
          setStreamingContent(chunk.content || "");
        },
        () => {
          setStreamingContent((previous) => {
            if (currentSession) {
              const assistantMessage: AgentMessage = {
                id: `msg-${Date.now()}`,
                sessionId: currentSession.id,
                content: previous,
                role: "assistant",
                createdAt: new Date().toISOString(),
              };
              setMessages((currentMessages) => [...currentMessages, assistantMessage]);
            }
            return "";
          });
          setLoading(false);
        },
        (streamError: Error) => {
          setError(streamError.message);
          setLoading(false);
        },
      );

      if (!streamResult.success) {
        setError(streamResult.error || streamResult.message || tr("Failed to send message."));
        setLoading(false);
      }
    } catch (nextError) {
      setError(toErrorMessage(nextError));
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
      case "active":
        return "bg-green-100 text-green-700";
      case "chatting":
        return "bg-blue-100 text-blue-700";
      case "error":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ready":
        return tr("Ready");
      case "active":
        return tr("Active");
      case "chatting":
        return tr("Chatting");
      case "error":
        return tr("Error");
      case "idle":
        return tr("Idle");
      default:
        return status;
    }
  };

  const welcomeMessage = agent.config.welcomeMessage || tr("Start chatting with this agent.");
  const exampleQuestions = Array.isArray(agent.config.customSettings?.exampleQuestions)
    ? (agent.config.customSettings.exampleQuestions as string[]).filter(
        (item) => typeof item === "string" && item.trim().length > 0,
      )
    : [];

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex flex-shrink-0 items-center gap-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-2xl">
          {agent.avatar || "AI"}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-[var(--text-primary)]">{agent.name}</h3>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {agent.description?.slice(0, 50)}
            {agent.description && agent.description.length > 50 ? "..." : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs ${getStatusColor(agent.status)}`}>
          {getStatusLabel(agent.status)}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-muted)]">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)] text-5xl">
              {agent.avatar || "AI"}
            </div>
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">{agent.name}</p>
            <p className="max-w-md text-center text-sm">{welcomeMessage}</p>
            {exampleQuestions.length > 0 ? (
              <div className="mt-6 space-y-2">
                {exampleQuestions.slice(0, 3).map((question) => (
                  <button
                    key={question}
                    onClick={() => setInput(question)}
                    className="block w-full rounded-xl bg-[var(--bg-tertiary)] px-4 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`mb-4 flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                  isUser ? "bg-[var(--ai-primary)]" : "bg-[var(--bg-tertiary)]"
                }`}
              >
                {isUser ? (
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                ) : (
                  <span className="text-lg">{agent.avatar || "AI"}</span>
                )}
              </div>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? "rounded-tr-sm bg-[var(--ai-primary)] text-white"
                    : "rounded-tl-sm border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                }`}
              >
                <p className="break-words whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          );
        })}

        {streamingContent ? (
          <div className="mb-4 flex gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
              <span className="text-lg">{agent.avatar || "AI"}</span>
            </div>
            <div className="max-w-[70%] rounded-2xl rounded-tl-sm border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-3 text-[var(--text-primary)]">
              <p className="whitespace-pre-wrap text-sm">{streamingContent}</p>
            </div>
          </div>
        ) : null}

        {loading && !streamingContent ? (
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
              <span className="text-lg">{agent.avatar || "AI"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-3">
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-[var(--ai-primary)]"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-[var(--ai-primary)]"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-[var(--ai-primary)]"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {error ? (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="flex-shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tr("Type a message...")}
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--ai-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ai-primary)]/20"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-[var(--ai-primary)] px-5 py-3 text-white shadow-[var(--shadow-md)] transition-all hover:bg-[var(--ai-primary-hover)] hover:shadow-[var(--shadow-lg)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
