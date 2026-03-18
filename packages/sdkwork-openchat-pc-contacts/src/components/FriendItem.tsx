import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

import type { Friend } from "../entities/contact.entity";

interface FriendItemProps {
  friend: Friend;
  isSelected: boolean;
  onClick: () => void;
}

export const FriendItem = memo(function FriendItem({ friend, isSelected, onClick }: FriendItemProps) {
  const { tr } = useAppTranslation();
  const fallbackStatus = friend.isOnline ? tr("Online") : tr("Offline");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center px-4 py-3 text-left transition-all duration-150 group ${
        isSelected ? "bg-[var(--ai-primary-soft)]" : "hover:bg-[var(--bg-hover)]"
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--ai-primary)] to-[var(--ai-primary-hover)] text-sm font-semibold text-white shadow-[var(--shadow-sm)]">
          {friend.avatar}
        </div>
        {friend.isOnline ? (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--ai-success)]" />
        ) : null}
      </div>

      <div className="ml-3 min-w-0 flex-1">
        <h3
          className={`truncate text-sm font-medium ${
            isSelected ? "text-[var(--ai-primary)]" : "text-[var(--text-primary)]"
          }`}
        >
          {friend.name}
        </h3>
        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{friend.status || fallbackStatus}</p>
      </div>

      {isSelected ? <div className="ml-2 h-1.5 w-1.5 rounded-full bg-[var(--ai-primary)]" /> : null}
    </button>
  );
});

FriendItem.displayName = "FriendItem";
