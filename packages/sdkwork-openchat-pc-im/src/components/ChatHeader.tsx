import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { Conversation } from "../entities/conversation.entity";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

type CallType = "audio" | "video";

interface ChatHeaderProps {
  conversation: Conversation;
  onCall?: (callType: CallType) => void;
  onToggleDevicePanel?: () => void;
  showDeviceButton?: boolean;
}

export const ChatHeader = memo(
  ({ conversation, onCall, onToggleDevicePanel, showDeviceButton }: ChatHeaderProps) => {
    const { tr } = useAppTranslation();

    return (
      <div className="sticky top-0 z-10 flex h-[70px] items-center justify-between border-b border-border bg-bg-secondary/80 px-6 backdrop-blur-sm">
        <div className="flex items-center">
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-md">
            {conversation.avatar}
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">{conversation.name}</h2>
            <div className="mt-0.5 flex items-center">
              <div className={`mr-2 h-2 w-2 rounded-full ${conversation.isOnline ? "bg-success shadow-glow-success" : "bg-text-muted"}`} />
              <span className="text-xs text-text-tertiary">
                {conversation.isOnline ? tr("Online") : tr("Offline")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {showDeviceButton ? (
            <SharedUi.Button
              onClick={onToggleDevicePanel}
              className="group rounded-xl p-2.5 transition-colors hover:bg-bg-hover"
              title={tr("Device management")}
            >
              <svg className="h-5 w-5 text-text-tertiary transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2 2" />
              </svg>
            </SharedUi.Button>
          ) : null}
          <SharedUi.Button
            onClick={() => onCall?.("audio")}
            className="group rounded-xl p-2.5 transition-colors hover:bg-bg-hover"
            title={tr("Voice Call")}
          >
            <svg className="h-5 w-5 text-text-tertiary transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </SharedUi.Button>
          <SharedUi.Button
            onClick={() => onCall?.("video")}
            className="group rounded-xl p-2.5 transition-colors hover:bg-bg-hover"
            title={tr("Video Call")}
          >
            <svg className="h-5 w-5 text-text-tertiary transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </SharedUi.Button>
          <SharedUi.Button className="group rounded-xl p-2.5 transition-colors hover:bg-bg-hover" title={tr("More")}>
            <svg className="h-5 w-5 text-text-tertiary transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </SharedUi.Button>
        </div>
      </div>
    );
  },
);

ChatHeader.displayName = "ChatHeader";
