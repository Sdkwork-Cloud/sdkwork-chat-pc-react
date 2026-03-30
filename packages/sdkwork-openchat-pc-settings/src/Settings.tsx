import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { motion } from "motion/react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Input } from "@sdkwork/openchat-pc-ui";
import { AboutSettings } from "./AboutSettings";
import { AccountSettings } from "./AccountSettings";
import { DataPrivacySettings } from "./DataPrivacySettings";
import { DesktopSettings } from "./DesktopSettings";
import { FeedbackSettings } from "./FeedbackSettings";
import { GeneralSettings } from "./GeneralSettings";
import { ImConfigSettings } from "./ImConfigSettings";
import { InstallerSettings } from "./InstallerSettings";
import { NotificationSettings } from "./NotificationSettings";
import { OpenClawSettings } from "./OpenClawSettings";
import { SecuritySettings } from "./SecuritySettings";
import {
  buildSettingsSearchParams,
  resolveSettingsTab,
  resolveSettingsTabFromPath,
  settingsTabs,
  type SettingsTabId,
} from "./settingsTabs";

function renderSettingsPanel(activeTab: SettingsTabId) {
  switch (activeTab) {
    case "account":
      return <AccountSettings />;
    case "notifications":
      return <NotificationSettings />;
    case "security":
      return <SecuritySettings />;
    case "feedback":
      return <FeedbackSettings />;
    case "privacy":
      return <DataPrivacySettings />;
    case "imconfig":
      return <ImConfigSettings />;
    case "installer":
      return <InstallerSettings />;
    case "desktop":
      return <DesktopSettings />;
    case "openclaw":
      return <OpenClawSettings />;
    case "about":
      return <AboutSettings />;
    case "general":
    default:
      return <GeneralSettings />;
  }
}

export function SettingsPage() {
  const { tr } = useAppTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  const activeTab = resolveSettingsTab(searchParams.get("tab"), location.pathname);

  useEffect(() => {
    if (location.pathname === "/settings" || location.pathname === "/settings/") {
      return;
    }

    const legacyTab = resolveSettingsTabFromPath(location.pathname);
    const nextSearchParams = buildSettingsSearchParams(searchParams, legacyTab);
    const nextSearch = nextSearchParams.toString();

    navigate(
      {
        pathname: "/settings",
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, navigate, searchParams]);

  const translatedTabs = useMemo(() => {
    return settingsTabs.map((item) => ({
      ...item,
      label: tr(item.labelKey),
    }));
  }, [tr]);

  const filteredTabs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return translatedTabs;
    }

    return translatedTabs.filter((item) => {
      return item.label.toLowerCase().includes(normalizedQuery)
        || item.id.toLowerCase().includes(normalizedQuery);
    });
  }, [searchQuery, translatedTabs]);

  return (
    <div className="flex h-full min-w-0 w-full flex-1 bg-zinc-50/50 dark:bg-zinc-950/50">
      <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="p-6 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {tr("settings.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {tr("settings.description")}
          </p>
          <div className="mt-6">
            <Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder={tr("settings.page.searchPlaceholder")}
              prefix={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        <nav className="scrollbar-hide flex-1 space-y-1.5 overflow-y-auto px-4 pb-6">
          {filteredTabs.length > 0 ? (
            filteredTabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <Button
                  key={tab.id}
                  variant="unstyled"
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    setSearchParams(buildSettingsSearchParams(searchParams, tab.id), {
                      replace: true,
                    });
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[14px] font-medium transition-all duration-200 ${
                    isActive
                      ? "border-zinc-200/50 bg-white text-primary-600 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800 dark:text-primary-400"
                      : "border-transparent text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                  }`}
                >
                  <tab.icon
                    className={`h-4 w-4 ${
                      isActive ? "text-primary-500 dark:text-primary-400" : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  />
                  {tab.label}
                </Button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {tr("settings.page.empty")}
            </div>
          )}
        </nav>
      </aside>

      <main className="scrollbar-hide min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="min-w-0 w-full max-w-none px-6 py-8 md:px-8 md:py-10 xl:px-10">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="min-w-0 w-full"
          >
            {renderSettingsPanel(activeTab)}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;
