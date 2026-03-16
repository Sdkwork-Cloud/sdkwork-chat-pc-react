import React from "react";

interface IconProps {
  active: boolean;
  className?: string;
}

const baseClass =
  "transition-all duration-200 text-text-tertiary group-hover:text-text-secondary";

function iconClass(active: boolean, className: string): string {
  return `${baseClass} ${active ? "text-primary" : ""} ${className}`.trim();
}

export const AIChatIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    {active ? (
      <>
        <circle cx="8" cy="11.5" r="1" fill="currentColor" />
        <circle cx="12" cy="11.5" r="1" fill="currentColor" />
        <circle cx="16" cy="11.5" r="1" fill="currentColor" />
      </>
    ) : null}
  </svg>
);

export const AIContactsIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="7"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
  </svg>
);

export const AIAgentIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <rect
      x="3"
      y="8"
      width="18"
      height="12"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M12 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="3" r="1.5" fill="currentColor" />
    <circle cx="8" cy="14" r="1.5" fill="currentColor" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    {active ? <path d="M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /> : null}
  </svg>
);

export const AISkillIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <rect
      x="4.5"
      y="7.5"
      width="11"
      height="11"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M7.5 5.5v2M11 5.5v2M7.5 18.5v2M11 18.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2.5 11h2M2.5 14.5h2M15.5 11h2M15.5 14.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M18.5 4.5l0.6 1.2 1.3 0.2-1 0.9 0.2 1.3-1.1-0.6-1.1 0.6 0.2-1.3-1-0.9 1.3-0.2 0.6-1.2z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
  </svg>
);

export const AINotificationIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AIShopIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AISocialIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export const AIDiscoverIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <polygon
      points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const AIWalletIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <rect
      x="2"
      y="6"
      width="20"
      height="14"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="17" cy="14" r="1.5" fill="currentColor" />
  </svg>
);

export const AIVipIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M4 8l3.5 3.5L12 5l4.5 6.5L20 8l-2 10H6L4 8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M8 18h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AICreationIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M12 2l2 4 4.5 0.5-3.25 3 0.75 4.5L12 12l-4 2 0.75-4.5-3.25-3L10 6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M12 14v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 18l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AICloudIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
  </svg>
);

export const AIShortVideoIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <polygon
      points="10,8 16,12 10,16"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const AIToolsIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
  </svg>
);

export const AITerminalIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M7 9l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M13 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AISettingsIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const AIMoreIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <rect
      x="4"
      y="6"
      width="16"
      height="12"
      rx="6"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <circle cx="9" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" />
    <path d="M18.5 5.5v3M17 7h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AIAppStoreIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <path
      d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M3.5 10l1.5-4h14l1.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 10v10M16 10v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M7 14h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M10 17h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const AIOpenClawInstallerIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <ellipse
      cx="12"
      cy="13"
      rx="4.2"
      ry="3.2"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M9 8.8L7.2 7.2M15 8.8l1.8-1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M7.5 12l-2.2-0.6 1.1-1.8 1.9 0.9M16.5 12l2.2-0.6-1.1-1.8-1.9 0.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.2 16.2v2.1M12 16.6v2.2M13.8 16.2v2.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M12 4.2v4.1M10.2 6.7L12 8.5l1.8-1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AIOpenClawSettingsIcon = ({ active, className = "" }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={iconClass(active, className)}>
    <ellipse
      cx="11"
      cy="13"
      rx="4.1"
      ry="3.1"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M8.2 8.8L6.6 7.3M13.8 8.8l1.6-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M6.8 12l-2-.5 1-1.7 1.7 0.8M15.2 12l2-.5-1-1.7-1.7 0.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 16.1v2M11 16.4v2.1M12.5 16.1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="17.8" cy="8.2" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M17.8 5.1v1M17.8 10.3v1M14.7 8.2h1M19.9 8.2h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
