import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

import type { Friend } from "../entities/contact.entity";

type CallType = "audio" | "video";

interface FriendDetailProps {
  friend: Friend;
  onCall?: (callType: CallType) => void;
  onStartChat?: (friend: Friend) => void;
}

export const FriendDetail = memo(function FriendDetail({
  friend,
  onCall,
  onStartChat,
}: FriendDetailProps) {
  const { tr } = useAppTranslation();
  const statusText = friend.status || (friend.isOnline ? tr("Online") : tr("Offline"));

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-primary)]">
      <div className="flex h-[60px] items-center border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6">
        <h2 className="text-base font-medium text-[var(--text-primary)]">{friend.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8">
            <div className="flex items-start space-x-6">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--ai-primary)] to-[var(--ai-primary-hover)] text-3xl font-semibold text-white shadow-[var(--shadow-glow)]">
                {friend.avatar}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-semibold text-[var(--text-primary)]">{friend.name}</h3>
                <div className="mt-2 flex items-center space-x-4">
                  <div className="flex items-center">
                    <div
                      className={`mr-2 h-2.5 w-2.5 rounded-full ${
                        friend.isOnline ? "bg-[var(--ai-primary)]" : "bg-[var(--text-muted)]"
                      }`}
                    />
                    <span className="text-sm text-[var(--text-tertiary)]">{statusText}</span>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">
                    {tr("OpenChat ID")} {friend.id}
                  </span>
                </div>

                <div className="mt-5 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => onStartChat?.(friend)}
                    className="rounded-xl bg-[var(--ai-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--ai-primary-hover)]"
                  >
                    {tr("Message")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCall?.("audio")}
                    className="rounded-xl bg-[var(--bg-hover)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
                  >
                    {tr("Audio Call")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCall?.("video")}
                    className="rounded-xl bg-[var(--bg-hover)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
                  >
                    {tr("Video Call")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="border-b border-[var(--border-color)] px-6 py-4">
              <h4 className="text-sm font-medium text-[var(--text-tertiary)]">{tr("Profile")}</h4>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center">
                <span className="w-24 flex-shrink-0 text-sm text-[var(--text-muted)]">{tr("Display Name")}</span>
                <span className="text-sm text-[var(--text-primary)]">{friend.name}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 flex-shrink-0 text-sm text-[var(--text-muted)]">{tr("Alias")}</span>
                <span className="text-sm text-[var(--text-primary)]">{friend.remark || friend.name}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 flex-shrink-0 text-sm text-[var(--text-muted)]">{tr("Region")}</span>
                <span className="text-sm text-[var(--text-primary)]">{friend.region || tr("China")}</span>
              </div>
              <div className="flex items-start">
                <span className="w-24 flex-shrink-0 text-sm text-[var(--text-muted)]">{tr("Bio")}</span>
                <span className="flex-1 text-sm text-[var(--text-primary)]">
                  {friend.signature || tr("No status message yet.")}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="border-b border-[var(--border-color)] px-6 py-4">
              <h4 className="text-sm font-medium text-[var(--text-tertiary)]">{tr("More")}</h4>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              <button type="button" className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--bg-hover)]">
                <span className="text-sm text-[var(--text-primary)]">{tr("Moments")}</span>
                <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button type="button" className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--bg-hover)]">
                <span className="text-sm text-[var(--text-primary)]">{tr("Shared Groups")}</span>
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-[var(--text-muted)]">3</span>
                  <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
              <button type="button" className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--bg-hover)]">
                <span className="text-sm text-[var(--ai-error)]">{tr("Delete Contact")}</span>
                <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

FriendDetail.displayName = "FriendDetail";
