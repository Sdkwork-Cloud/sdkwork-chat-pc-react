import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { NavLink, useLocation } from "react-router-dom";
import {
  AIAgentIcon,
  AIAppStoreIcon,
  AIChatIcon,
  AICloudIcon,
  AIContactsIcon,
  AICreationIcon,
  AIDiscoverIcon,
  AIMoreIcon,
  AINotificationIcon,
  AISettingsIcon,
  AIShortVideoIcon,
  AISkillIcon,
  AISocialIcon,
  AIVipIcon,
  AIOpenClawInstallerIcon,
  AIOpenClawSettingsIcon,
  AIShopIcon,
  AITerminalIcon,
  AIToolsIcon,
  AIWalletIcon,
} from "./SidebarIcons";

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: (active: boolean) => ReactNode;
  badge?: number;
}

const primaryNavItems: NavItem[] = [
  { id: "chat", path: "/chat", label: "Chat", icon: (active) => <AIChatIcon active={active} />, badge: 3 },
  { id: "agents", path: "/agents", label: "Agents", icon: (active) => <AIAgentIcon active={active} /> },
  { id: "skills", path: "/skills", label: "Skills", icon: (active) => <AISkillIcon active={active} /> },
  { id: "appstore", path: "/appstore", label: "App Store", icon: (active) => <AIAppStoreIcon active={active} /> },
];

const moreNavItems: NavItem[] = [
  { id: "contacts", path: "/contacts", label: "Contacts", icon: (active) => <AIContactsIcon active={active} /> },
  { id: "me", path: "/me", label: "Me", icon: (active) => <AIWalletIcon active={active} /> },
  { id: "app", path: "/app", label: "App Center", icon: (active) => <AIAppStoreIcon active={active} /> },
  {
    id: "notifications",
    path: "/notifications",
    label: "Notifications",
    icon: (active) => <AINotificationIcon active={active} />,
    badge: 5,
  },
  { id: "commerce", path: "/commerce/mall", label: "Commerce", icon: (active) => <AIShopIcon active={active} /> },
  { id: "shopping", path: "/shopping", label: "Shopping", icon: (active) => <AIShopIcon active={active} /> },
  { id: "order-center", path: "/order-center", label: "Order Center", icon: (active) => <AIShopIcon active={active} /> },
  { id: "moments", path: "/moments", label: "Moments", icon: (active) => <AISocialIcon active={active} /> },
  { id: "discover", path: "/discover", label: "Discover", icon: (active) => <AIDiscoverIcon active={active} /> },
  { id: "content", path: "/content", label: "Content", icon: (active) => <AIDiscoverIcon active={active} /> },
  { id: "look", path: "/look", label: "Look", icon: (active) => <AIShortVideoIcon active={active} /> },
  { id: "media", path: "/media", label: "Media", icon: (active) => <AIShortVideoIcon active={active} /> },
  { id: "nearby", path: "/nearby", label: "Nearby", icon: (active) => <AICloudIcon active={active} /> },
  { id: "appointments", path: "/appointments", label: "Appointments", icon: (active) => <AISettingsIcon active={active} /> },
  { id: "communication", path: "/communication", label: "Communication", icon: (active) => <AIChatIcon active={active} /> },
  { id: "wallet", path: "/wallet", label: "Wallet", icon: (active) => <AIWalletIcon active={active} /> },
  { id: "vip", path: "/vip", label: "VIP", icon: (active) => <AIVipIcon active={active} /> },
  { id: "creation", path: "/creation", label: "Creation", icon: (active) => <AICreationIcon active={active} /> },
  { id: "drive", path: "/drive", label: "Drive", icon: (active) => <AICloudIcon active={active} /> },
  {
    id: "short-video",
    path: "/short-video",
    label: "Short Video",
    icon: (active) => <AIShortVideoIcon active={active} />,
  },
  { id: "tools", path: "/tools", label: "Tools", icon: (active) => <AIToolsIcon active={active} /> },
  { id: "terminal", path: "/terminal", label: "Terminal", icon: (active) => <AITerminalIcon active={active} /> },
];

const openClawBottomItems: NavItem[] = [
  {
    id: "openclaw-installer",
    path: "/settings/installer",
    label: "OpenClaw Installer",
    icon: (active) => <AIOpenClawInstallerIcon active={active} />,
  },
  {
    id: "openclaw-settings",
    path: "/settings/openclaw",
    label: "OpenClaw Settings",
    icon: (active) => <AIOpenClawSettingsIcon active={active} />,
  },
];

const settingsCenterItem: NavItem = {
  id: "settings",
  path: "/settings",
  label: "Settings",
  icon: (active) => <AISettingsIcon active={active} />,
};

export const sidebarNavItems: NavItem[] = [
  ...primaryNavItems,
  ...moreNavItems,
  ...openClawBottomItems,
  settingsCenterItem,
];

function isPathActive(currentPath: string, targetPath: string): boolean {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function isSettingsCenterPath(pathname: string): boolean {
  return pathname.startsWith("/settings")
    && !pathname.startsWith("/settings/installer")
    && !pathname.startsWith("/settings/openclaw");
}

function SidebarLink({
  item,
  active,
  onClick,
  rotateOnHover = false,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
  rotateOnHover?: boolean;
}) {
  const { tr } = useAppTranslation();
  const localizedLabel = tr(item.label);

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      aria-label={localizedLabel}
      title={localizedLabel}
      className="group relative flex h-12 w-12 items-center justify-center rounded-xl p-2.5 transition-all duration-200"
    >
      <div
        className={`absolute inset-0 rounded-xl transition-all duration-300 ${
          active
            ? "bg-primary-soft shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]"
            : "opacity-0 group-hover:translate-x-0.5 group-hover:bg-bg-hover group-hover:opacity-100"
        }`}
      />

      <div
        className={`relative z-10 transition-transform duration-300 ${
          rotateOnHover ? "group-hover:rotate-45" : ""
        }`}
      >
        {item.icon(active)}
      </div>

      {item.badge && item.badge > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-bg-secondary bg-error px-1 text-[10px] font-bold text-white shadow-md">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}

      <div className="pointer-events-none absolute left-full z-50 ml-3 translate-x-2 whitespace-nowrap rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        {localizedLabel}
      </div>
    </NavLink>
  );
}

export function Sidebar() {
  const { tr } = useAppTranslation();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePopupPosition, setMorePopupPosition] = useState({ left: 0, top: 0 });
  const sidebarRef = useRef<HTMLElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const morePopupRef = useRef<HTMLDivElement | null>(null);

  const settingsActive = isSettingsCenterPath(pathname);
  const moreActive = moreOpen || moreNavItems.some((item) => isPathActive(pathname, item.path));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function updateMorePopupPosition() {
      if (!moreButtonRef.current) {
        return;
      }

      const rect = moreButtonRef.current.getBoundingClientRect();
      const popupWidth = 300;
      const estimatedPopupHeight = 380;
      const viewportPadding = 8;

      let left = rect.right + 10;
      if (left + popupWidth + viewportPadding > window.innerWidth) {
        left = Math.max(viewportPadding, rect.left - popupWidth - 10);
      }

      const top = Math.max(
        viewportPadding,
        Math.min(rect.top - 12, window.innerHeight - estimatedPopupHeight - viewportPadding),
      );

      setMorePopupPosition({
        left,
        top,
      });
    }

    if (!moreOpen) {
      return;
    }

    updateMorePopupPosition();
    window.addEventListener("resize", updateMorePopupPosition);
    window.addEventListener("scroll", updateMorePopupPosition, true);

    return () => {
      window.removeEventListener("resize", updateMorePopupPosition);
      window.removeEventListener("scroll", updateMorePopupPosition, true);
    };
  }, [moreOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!moreOpen) {
        return;
      }

      const targetNode = event.target as Node | null;
      if (!targetNode || !sidebarRef.current) {
        return;
      }

      if (morePopupRef.current?.contains(targetNode)) {
        return;
      }

      if (!sidebarRef.current.contains(targetNode)) {
        setMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreOpen]);

  const morePopup = moreOpen ? (
    <div
      ref={morePopupRef}
      style={{ left: `${morePopupPosition.left}px`, top: `${morePopupPosition.top}px` }}
      className="fixed z-[2147483647] w-[320px] max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-bg-elevated p-3 shadow-2xl"
    >
      <div className="mb-2 px-1 text-xs font-medium text-text-secondary">{tr("More Features")}</div>
      <div className="grid max-h-[62vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {moreNavItems.map((item) => {
          const active = isPathActive(pathname, item.path);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => setMoreOpen(false)}
              className={`group relative rounded-xl border p-2.5 transition ${
                active
                  ? "border-primary/40 bg-primary-soft"
                  : "border-border bg-bg-primary hover:bg-bg-hover"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-secondary">
                  {item.icon(active)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-text-primary">{tr(item.label)}</div>
                  <div className="truncate text-[11px] text-text-muted">{item.path}</div>
                </div>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="absolute right-2 top-2 rounded-full bg-error px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      <aside
        ref={sidebarRef}
        className="relative z-20 flex h-full w-[72px] select-none flex-col border-r border-border bg-bg-secondary py-4 backdrop-blur-md"
      >
        <div className="mb-6 flex justify-center">
          <div className="group relative cursor-pointer">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-lg font-bold text-white shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse-slow rounded-full border-2 border-bg-secondary bg-success" />
            <div className="pointer-events-none absolute left-full z-50 ml-3 translate-x-2 whitespace-nowrap rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-primary opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              {tr("OpenChat AI")}
            </div>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto py-2">
          {primaryNavItems.map((item) => (
            <SidebarLink key={item.id} item={item} active={isPathActive(pathname, item.path)} />
          ))}

          <button
            ref={moreButtonRef}
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-label={tr("More")}
            title={tr("More")}
            className="group relative flex h-12 w-12 items-center justify-center rounded-xl p-2.5 transition-all duration-200"
          >
            <div
              className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                moreActive
                  ? "bg-primary-soft shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]"
                  : "opacity-0 group-hover:translate-x-0.5 group-hover:bg-bg-hover group-hover:opacity-100"
              }`}
            />
            <div className="relative z-10">
              <AIMoreIcon active={moreActive} />
            </div>
            <div className="pointer-events-none absolute left-full z-50 ml-3 translate-x-2 whitespace-nowrap rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              {tr("More")}
            </div>
          </button>
        </nav>

        <div className="mt-auto flex flex-col items-center gap-1 border-t border-border pt-3">
          {openClawBottomItems.map((item) => (
            <SidebarLink key={item.id} item={item} active={isPathActive(pathname, item.path)} />
          ))}
          <SidebarLink item={settingsCenterItem} active={settingsActive} rotateOnHover />
        </div>
      </aside>
      {moreOpen && typeof document !== "undefined" ? createPortal(morePopup, document.body) : null}
    </>
  );
}

export default Sidebar;
