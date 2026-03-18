import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button } from "@sdkwork/openchat-pc-ui";

export const EmptyChat = memo(() => {
  const { tr } = useAppTranslation();

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-bg-primary">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-purple-500/20 blur-[100px]" />
      </div>

      <div className="relative z-10 animate-fade-in text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 shadow-glow-primary transition-all duration-500 hover:rotate-3 hover:scale-110">
          <svg className="h-12 w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <h3 className="mb-3 text-2xl font-bold tracking-tight text-text-primary">{tr("OpenChat AI")}</h3>
        <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-text-tertiary">
          {tr("Select a conversation from the sidebar to get started, or launch a brand new AI chat below.")}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="primary" size="large" className="rounded-xl px-8 shadow-glow-primary transition-all hover:scale-105 active:scale-95">
            {tr("Start a new conversation")}
          </Button>
          <Button variant="outline" size="large" className="rounded-xl px-8 hover:bg-bg-hover">
            {tr("Learn more")}
          </Button>
        </div>
      </div>

      <div className="absolute bottom-12 flex gap-12 text-text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-secondary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xs">{tr("Fast response")}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-secondary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xs">{tr("Encrypted security")}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-secondary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.727 2.903a2 2 0 01-1.156 1.37l-4.481 2.24a2 2 0 01-2.105-.335l-3.135-3.135a2 2 0 01-.335-2.105l2.24-4.481a2 2 0 011.37-1.156l2.903-.727a2 2 0 001.414-1.96l-.477-2.387a2 2 0 00-.547-1.022L7.05 2.05a2 2 0 00-2.828 0L2.05 4.222a2 2 0 000 2.828l9.765 9.765a2 2 0 002.828 0l2.172-2.172a2 2 0 000-2.828l-2.387-2.387z" />
            </svg>
          </div>
          <span className="text-xs">{tr("Multi-device sync")}</span>
        </div>
      </div>
    </div>
  );
});

EmptyChat.displayName = "EmptyChat";
