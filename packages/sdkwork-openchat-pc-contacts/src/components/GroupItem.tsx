import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

import type { Group } from "../entities/contact.entity";

interface GroupItemProps {
  group: Group;
  isSelected: boolean;
  onClick: () => void;
}

export const GroupItem = memo(function GroupItem({ group, isSelected, onClick }: GroupItemProps) {
  const { tr } = useAppTranslation();

  return (
    <SharedUi.Button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center px-4 py-3 text-left transition-all duration-150 group ${
        isSelected ? "bg-[var(--ai-purple-soft)]" : "hover:bg-[var(--bg-hover)]"
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--ai-purple)] to-[var(--ai-primary-dark)] text-sm font-semibold text-white shadow-[var(--shadow-sm)]">
          {group.avatar}
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-1 text-[9px] font-medium text-[var(--text-muted)]">
          {group.memberCount}
        </div>
      </div>

      <div className="ml-3 min-w-0 flex-1">
        <h3
          className={`truncate text-sm font-medium ${
            isSelected ? "text-[var(--ai-purple)]" : "text-[var(--text-primary)]"
          }`}
        >
          {group.name}
        </h3>
        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {tr("{{count}} members", { count: group.memberCount })}
        </p>
      </div>

      {isSelected ? <div className="ml-2 h-1.5 w-1.5 rounded-full bg-[var(--ai-purple)]" /> : null}
    </SharedUi.Button>
  );
});

GroupItem.displayName = "GroupItem";
