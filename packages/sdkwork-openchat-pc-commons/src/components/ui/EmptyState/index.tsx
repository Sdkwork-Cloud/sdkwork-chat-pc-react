import React from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { cn } from "../../../utils/cn";
import { Button } from "../Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  size?: "small" | "medium" | "large";
  className?: string;
}

const EmptyIcon: React.FC<{
  type?: "default" | "search" | "message" | "file";
}> = ({ type = "default" }) => {
  const icons = {
    default: (
      <svg className="h-full w-full" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <circle cx="45" cy="50" r="8" fill="currentColor" opacity="0.4" />
        <circle cx="75" cy="50" r="8" fill="currentColor" opacity="0.4" />
        <path
          d="M40 75 Q60 90 80 75"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    ),
    search: (
      <svg className="h-full w-full" viewBox="0 0 120 120" fill="none">
        <circle cx="55" cy="55" r="30" stroke="currentColor" strokeWidth="3" opacity="0.3" />
        <path
          d="M78 78 L95 95"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.3"
        />
        <circle cx="55" cy="55" r="20" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      </svg>
    ),
    message: (
      <svg className="h-full w-full" viewBox="0 0 120 120" fill="none">
        <rect x="20" y="30" width="80" height="60" rx="8" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <path
          d="M35 50 H85 M35 65 H65"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.2"
        />
        <path d="M50 90 L60 80 L70 90" fill="currentColor" opacity="0.3" />
      </svg>
    ),
    file: (
      <svg className="h-full w-full" viewBox="0 0 120 120" fill="none">
        <path d="M35 20 H70 L90 40 V100 H35 V20 Z" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <path d="M70 20 V40 H90" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <path
          d="M45 55 H80 M45 70 H80 M45 85 H60"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.2"
        />
      </svg>
    ),
  };

  return icons[type];
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  size = "medium",
  className,
}) => {
  const { tr } = useAppTranslation();
  const sizeClasses = {
    small: { container: "py-8", icon: "h-16 w-16", title: "text-base", description: "text-sm" },
    medium: { container: "py-12", icon: "h-24 w-24", title: "text-lg", description: "text-base" },
    large: { container: "py-16", icon: "h-32 w-32", title: "text-xl", description: "text-lg" },
  };

  const currentSize = sizeClasses[size];
  const resolvedTitle = title ?? tr("No data available.");
  const resolvedDescription = description ?? tr("There is nothing to show right now.");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        currentSize.container,
        className,
      )}
    >
      <div className={cn("mb-4 text-text-muted", currentSize.icon)}>{icon ?? <EmptyIcon />}</div>
      <h3 className={cn("mb-2 font-medium text-text-primary", currentSize.title)}>{resolvedTitle}</h3>
      <p className={cn("max-w-xs text-text-secondary", currentSize.description)}>
        {resolvedDescription}
      </p>
      {action ? <div className="mt-6 animate-slideUp">{action}</div> : null}
    </div>
  );
};

export const EmptySearch: React.FC<{ keyword?: string; onClear?: () => void }> = ({
  keyword,
  onClear,
}) => {
  const { tr } = useAppTranslation();

  return (
    <EmptyState
      icon={<EmptyIcon type="search" />}
      title={
        keyword
          ? tr('No results found for "{{keyword}}"', { keyword })
          : tr("No search results")
      }
      description={tr("Try a different keyword or clear the current search.")}
      action={
        onClear ? (
          <Button variant="primary" onClick={onClear}>
            {tr("Clear search")}
          </Button>
        ) : undefined
      }
    />
  );
};

export const EmptyChat: React.FC<{ onStartChat?: () => void }> = ({ onStartChat }) => {
  const { tr } = useAppTranslation();

  return (
    <EmptyState
      icon={<EmptyIcon type="message" />}
      title={tr("Start a new conversation")}
      description={tr("Choose a contact or group to begin chatting.")}
      action={
        onStartChat ? (
          <Button variant="primary" onClick={onStartChat}>
            {tr("New conversation")}
          </Button>
        ) : undefined
      }
    />
  );
};

export const EmptyFile: React.FC<{ onUpload?: () => void }> = ({ onUpload }) => {
  const { tr } = useAppTranslation();

  return (
    <EmptyState
      icon={<EmptyIcon type="file" />}
      title={tr("No files yet")}
      description={tr("Upload a file to get started.")}
      action={
        onUpload ? (
          <Button variant="primary" onClick={onUpload}>
            {tr("Upload file")}
          </Button>
        ) : undefined
      }
    />
  );
};

export default EmptyState;
