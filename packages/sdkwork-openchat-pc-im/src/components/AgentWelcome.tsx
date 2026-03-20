import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { Agent } from "@sdkwork/openchat-pc-agent";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

interface AgentWelcomeProps {
  agent: Agent;
  onSendMessage: (message: string) => void;
}

export const AgentWelcome = memo(({ agent, onSendMessage }: AgentWelcomeProps) => {
  const { tr } = useAppTranslation();
  const config = agent.config as {
    welcomeMessage?: string;
    exampleQuestions?: string[];
  };

  const welcomeMessage =
    config?.welcomeMessage
    || tr("Hello! I am {{name}}. How can I help you today?", { name: agent.name });
  const exampleQuestions = config?.exampleQuestions || [
    tr("What can you do?"),
    tr("Tell me a joke."),
    tr("Explain what artificial intelligence is."),
  ];

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-bg-primary p-8">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-purple-500/20 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg animate-fade-in text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 shadow-glow-primary">
          <span className="text-5xl">{agent.avatar || "🤖"}</span>
        </div>

        <h3 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">{agent.name}</h3>

        {agent.description ? (
          <p className="mb-6 text-sm text-text-tertiary">{agent.description}</p>
        ) : null}

        <p className="mb-8 text-sm leading-relaxed text-text-secondary">{welcomeMessage}</p>

        {exampleQuestions.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">{tr("Try asking me")}</p>
            <div className="flex flex-col gap-2">
              {exampleQuestions.slice(0, 4).map((question, index) => (
                <SharedUi.Button
                  key={`${question}-${index}`}
                  onClick={() => onSendMessage(question)}
                  className="rounded-xl border border-border bg-bg-secondary px-6 py-3 text-left text-sm text-text-secondary transition-all hover:border-primary hover:bg-bg-tertiary hover:text-text-primary"
                >
                  {question}
                </SharedUi.Button>
              ))}
            </div>
          </div>
        ) : null}

        {agent.capabilities && agent.capabilities.length > 0 ? (
          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-3 text-xs text-text-muted">{tr("My capabilities")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {agent.capabilities.slice(0, 4).map((capability) => (
                <span key={capability.name} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary">
                  {capability.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});

AgentWelcome.displayName = "AgentWelcome";
