import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage, useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { App, AppCategory } from "../entities/app.entity";
import { AppCard, CategoryCarousel, FeaturedHero, SearchBar } from "../components";
import {
  AppstoreResultService,
  type AppInstallState,
  getAppInstallStateMap,
  markAppOpened,
} from "../services";
import {
  buildAppTypeStats,
  buildInstalledAppLibrary,
  buildRankingLanes,
  filterAppStoreCatalog,
  filterAppsByType,
  resolveCapabilityPathByType,
  type AppStoreCatalogType,
} from "./appstore.workspace.model";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

const baseCategory: AppCategory = {
  id: "all",
  name: "All",
  nameEn: "All",
  icon: "APP",
  color: "#2563eb",
  appCount: 0,
};

type AppStoreTypeFilter = "all" | AppStoreCatalogType;
type StoreTab = "today" | "charts" | "browse" | "library";
type BrowseSort = "featured" | "rating" | "downloads" | "latest";

function formatDownloads(value: number, locale: AppLanguage): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateTime(value: string | null | undefined, locale: AppLanguage): string {
  if (!value) {
    return "-";
  }
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "-";
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function sortBrowseApps(items: App[], sortBy: BrowseSort): App[] {
  const list = [...items];

  if (sortBy === "rating") {
    return list.sort((left, right) => right.rating.average - left.rating.average);
  }

  if (sortBy === "downloads") {
    return list.sort((left, right) => right.downloads - left.downloads);
  }

  if (sortBy === "latest") {
    return list.sort(
      (left, right) => new Date(right.released).getTime() - new Date(left.released).getTime(),
    );
  }

  return list.sort((left, right) => {
    const leftScore =
      Number(left.editorChoice) * 10_000 + Number(left.featured) * 5_000 + Number(left.trending) * 2_000 + left.downloads;
    const rightScore =
      Number(right.editorChoice) * 10_000 + Number(right.featured) * 5_000 + Number(right.trending) * 2_000 + right.downloads;
    return rightScore - leftScore;
  });
}

export function AppStorePage() {
  const { tr, language } = useAppTranslation();
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [categoryId, setCategoryId] = useState("all");
  const [typeFilter, setTypeFilter] = useState<AppStoreTypeFilter>("all");
  const [activeTab, setActiveTab] = useState<StoreTab>("today");
  const [browseSort, setBrowseSort] = useState<BrowseSort>("featured");
  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState<AppCategory[]>([baseCategory]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [installStateMap, setInstallStateMap] = useState<Record<string, AppInstallState>>({});

  const typeOptions = useMemo<Array<{ key: AppStoreTypeFilter; label: string }>>(
    () => [
      { key: "all", label: tr("All") },
      { key: "tool", label: tr("Tools") },
      { key: "plugin", label: tr("Plugins") },
      { key: "theme", label: tr("Themes") },
    ],
    [tr],
  );

  const tabOptions = useMemo<Array<{ key: StoreTab; label: string; hint: string }>>(
    () => [
      { key: "today", label: tr("Today"), hint: tr("Editorial highlights") },
      { key: "charts", label: tr("Top Charts"), hint: tr("Downloads and ratings") },
      { key: "browse", label: tr("Browse"), hint: tr("Category discovery") },
      { key: "library", label: tr("Library"), hint: tr("Installed and recent") },
    ],
    [tr],
  );

  const browseSortOptions = useMemo<Array<{ key: BrowseSort; label: string }>>(
    () => [
      { key: "featured", label: tr("Featured first") },
      { key: "rating", label: tr("Highest rating") },
      { key: "downloads", label: tr("Most downloads") },
      { key: "latest", label: tr("Newest release") },
    ],
    [tr],
  );

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const result = await AppstoreResultService.getCategories();
        if (!result.success || !result.data) {
          throw new Error(result.error || tr("Failed to load categories."));
        }
        const data = result.data;
        if (cancelled) {
          return;
        }

        const hasAll = data.some((item) => item.id === "all");
        setCategories(hasAll ? data : [baseCategory, ...data]);
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : tr("Failed to load categories."));
          setCategories([baseCategory]);
        }
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [tr]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const loadApps = async () => {
        setIsLoading(true);
        setErrorText(null);
        try {
          const result = await AppstoreResultService.searchApps({
            categoryId,
            keyword: keyword.trim() || undefined,
            page: 1,
            pageSize: 48,
          });
          if (!result.success || !result.data) {
            throw new Error(result.error || tr("Failed to load apps."));
          }
          if (!cancelled) {
            setApps(result.data.apps);
          }
        } catch (error) {
          if (!cancelled) {
            setApps([]);
            setErrorText(error instanceof Error ? error.message : tr("Failed to load apps."));
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      void loadApps();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [categoryId, keyword, tr]);

  const storeApps = useMemo(() => filterAppStoreCatalog(apps), [apps]);
  const typeStats = useMemo(() => buildAppTypeStats(storeApps), [storeApps]);
  const typedApps = useMemo(() => filterAppsByType(storeApps, typeFilter), [storeApps, typeFilter]);

  useEffect(() => {
    if (storeApps.length === 0) {
      setInstallStateMap({});
      return;
    }

    setInstallStateMap(getAppInstallStateMap(storeApps.map((item) => item.id)));
  }, [storeApps]);

  const visibleApps = useMemo(() => {
    if (!keyword.trim()) {
      return typedApps;
    }

    const normalizedKeyword = keyword.trim().toLowerCase();
    return typedApps.filter((app) => {
      const source = `${app.name} ${app.shortDescription} ${app.tags.join(" ")}`.toLowerCase();
      return source.includes(normalizedKeyword);
    });
  }, [keyword, typedApps]);

  const rankingLanes = useMemo(() => buildRankingLanes(visibleApps), [visibleApps]);
  const browseApps = useMemo(() => sortBrowseApps(visibleApps, browseSort), [visibleApps, browseSort]);
  const installedLibrary = useMemo(
    () => buildInstalledAppLibrary(visibleApps, installStateMap),
    [visibleApps, installStateMap],
  );

  const storeCategories = useMemo(() => {
    const scoped = categories.filter((item) => {
      return item.id === "all" || item.id === "tool" || item.id === "plugin" || item.id === "theme";
    });

    return scoped.map((item) => {
      const appCount =
        item.id === "all"
          ? storeApps.length
          : storeApps.filter((app) => app.category.id === item.id).length;
      return {
        ...item,
        appCount,
      };
    });
  }, [categories, storeApps]);

  useEffect(() => {
    if (!storeCategories.some((item) => item.id === categoryId)) {
      setCategoryId("all");
    }
  }, [categoryId, storeCategories]);

  const featuredApp = useMemo(
    () => visibleApps.find((item) => item.featured || item.editorChoice) || visibleApps[0] || null,
    [visibleApps],
  );

  const editorChoiceApps = useMemo(
    () => visibleApps.filter((item) => item.editorChoice).slice(0, 6),
    [visibleApps],
  );

  const trendingApps = useMemo(() => visibleApps.filter((item) => item.trending).slice(0, 8), [visibleApps]);
  const latestApps = useMemo(() => rankingLanes.fresh.slice(0, 8), [rankingLanes.fresh]);

  const resetFilters = () => {
    setKeyword("");
    setTypeFilter("all");
    setCategoryId("all");
    setBrowseSort("featured");
  };

  const getAppActionLabel = (app: App): string => {
    return installStateMap[app.id]?.installed ? tr("OPEN") : tr("GET");
  };

  const handleAppAction = async (app: App) => {
    const lifecycle = installStateMap[app.id];
    if (lifecycle?.installed) {
      markAppOpened(app.id);
      navigate(resolveCapabilityPathByType(app.type));
      return;
    }

    setStatusText(null);
    setErrorText(null);
    setProcessingAppId(app.id);

    try {
      const result = await AppstoreResultService.installApp(app.id);
      if (!result.success || !result.data) {
        throw new Error(result.error || tr("Failed to install app."));
      }
      const installed = result.data;
      setInstallStateMap((previous) => ({
        ...previous,
        [app.id]: installed,
      }));
      setStatusText(tr("{{name}} installed. You can open it now.", { name: app.name }));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : tr("Failed to install app."));
    } finally {
      setProcessingAppId(null);
    }
  };

  const handleRemoveApp = async (app: App) => {
    const lifecycle = installStateMap[app.id];
    if (!lifecycle?.installed) {
      return;
    }

    setStatusText(null);
    setErrorText(null);
    setProcessingAppId(app.id);

    try {
      const result = await AppstoreResultService.uninstallApp(app.id);
      if (!result.success) {
        throw new Error(result.error || tr("Failed to remove app."));
      }
      setInstallStateMap((previous) => ({
        ...previous,
        [app.id]: {
          appId: app.id,
          installed: false,
          installedAt: null,
          lastOpenedAt: null,
          openCount: 0,
        },
      }));
      setStatusText(tr("{{name}} removed from your library.", { name: app.name }));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : tr("Failed to remove app."));
    } finally {
      setProcessingAppId(null);
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{tr("App Store")}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {tr(
                "Apple-style marketplace for Tool, Plugin, and Theme packages. Agent and Skill remain independent modules.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SharedUi.Button
              onClick={() => navigate("/agents")}
              className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
            >
              {tr("Agent Market")}
            </SharedUi.Button>
            <SharedUi.Button
              onClick={() => navigate("/skills")}
              className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
            >
              {tr("Skill Market")}
            </SharedUi.Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabOptions.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <SharedUi.Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {tab.label}
                <span className={`ml-2 ${active ? "text-white/80" : "text-text-muted"}`}>{tab.hint}</span>
              </SharedUi.Button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
          <SearchBar value={keyword} onChange={setKeyword} />
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((option) => {
              const active = option.key === typeFilter;
              const count = typeStats[option.key as keyof typeof typeStats];
              return (
                <SharedUi.Button
                  key={option.key}
                  onClick={() => setTypeFilter(option.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-muted">{count}</span>
                </SharedUi.Button>
              );
            })}
          </div>
        </div>

        <CategoryCarousel categories={storeCategories} selectedId={categoryId} onSelect={setCategoryId} />

        {errorText ? (
          <div className="mt-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        ) : null}

        {statusText ? (
          <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            {statusText}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
            {tr("Loading applications...")}
          </div>
        ) : null}

        {!isLoading && visibleApps.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
            <p>{tr("No apps found for current filters.")}</p>
            <SharedUi.Button
              onClick={resetFilters}
              className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {tr("Reset filters")}
            </SharedUi.Button>
          </div>
        ) : null}

        {!isLoading && visibleApps.length > 0 && activeTab === "today" ? (
          <div className="mt-4 space-y-8">
            {featuredApp ? (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {tr("Today Spotlight")}
                </h2>
                <FeaturedHero app={featuredApp} onClick={() => navigate(`/appstore/${featuredApp.id}`)} />
              </section>
            ) : null}

            {editorChoiceApps.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text-primary">{tr("Editors Choice")}</h2>
                  <SharedUi.Button onClick={() => setActiveTab("browse")} className="text-xs font-medium text-primary hover:underline">
                    {tr("View all")}
                  </SharedUi.Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {editorChoiceApps.map((app) => (
                    <AppCard
                      key={`editor-${app.id}`}
                      app={app}
                      variant="banner"
                      onClick={() => navigate(`/appstore/${app.id}`)}
                      actionLabel={getAppActionLabel(app)}
                      actionDisabled={processingAppId === app.id}
                      onActionClick={() => {
                        void handleAppAction(app);
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {trendingApps.length > 0 ? (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-text-primary">{tr("Trending")}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {trendingApps.map((app) => (
                    <AppCard
                      key={`trend-${app.id}`}
                      app={app}
                      variant="small"
                      onClick={() => navigate(`/appstore/${app.id}`)}
                      actionLabel={getAppActionLabel(app)}
                      actionDisabled={processingAppId === app.id}
                      onActionClick={() => {
                        void handleAppAction(app);
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {!isLoading && visibleApps.length > 0 && activeTab === "charts" ? (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {[
              { key: "hot", title: tr("Top Free"), apps: rankingLanes.hot },
              { key: "rating", title: tr("Top Rated"), apps: rankingLanes.rating },
              { key: "fresh", title: tr("New Releases"), apps: rankingLanes.fresh },
            ].map((lane) => (
              <section key={lane.key} className="rounded-2xl border border-border bg-bg-secondary p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{lane.title}</h2>
                <div className="mt-3 space-y-2">
                  {lane.apps.slice(0, 10).map((app, index) => (
                    <article key={`${lane.key}-${app.id}`} className="flex items-center gap-3 rounded-xl bg-bg-primary px-3 py-2">
                      <span className="w-5 text-right text-xs font-semibold text-text-muted">{index + 1}</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-tertiary text-lg">
                        {app.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{app.name}</p>
                        <p className="truncate text-xs text-text-muted">
                          {app.category.name} / {formatDownloads(app.downloads, language)}
                        </p>
                      </div>
                      <SharedUi.Button
                        onClick={() => {
                          void handleAppAction(app);
                        }}
                        disabled={processingAppId === app.id}
                        className="rounded-full bg-bg-tertiary px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {getAppActionLabel(app)}
                      </SharedUi.Button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {!isLoading && activeTab === "library" ? (
          <div className="mt-4 space-y-6">
            {installedLibrary.installed.length === 0 ? (
              <div className="rounded-2xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
                <p>{tr("No installed apps yet.")}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {tr("Install tool, plugin, or theme packages to build your desktop workspace.")}
                </p>
                <SharedUi.Button
                  onClick={() => setActiveTab("browse")}
                  className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                >
                  {tr("Browse App Catalog")}
                </SharedUi.Button>
              </div>
            ) : (
              <>
                {installedLibrary.recent.length > 0 ? (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-text-primary">{tr("Recently Opened")}</h2>
                      <span className="text-xs text-text-muted">
                        {tr("{{count}} apps", { count: installedLibrary.recent.length })}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {installedLibrary.recent.slice(0, 8).map((app) => {
                        const lifecycle = installStateMap[app.id];
                        return (
                          <article key={`recent-${app.id}`} className="rounded-xl border border-border bg-bg-secondary p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-tertiary text-lg">
                                {app.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-text-primary">{app.name}</p>
                                <p className="truncate text-xs text-text-muted">
                                  {tr("Last opened {{time}}", {
                                    time: formatDateTime(lifecycle?.lastOpenedAt, language),
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
                              <span>{tr("{{count}} opens", { count: lifecycle?.openCount ?? 0 })}</span>
                              <SharedUi.Button
                                onClick={() => {
                                  void handleAppAction(app);
                                }}
                                disabled={processingAppId === app.id}
                                className="rounded-full bg-bg-tertiary px-2.5 py-1 font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {tr("OPEN")}
                              </SharedUi.Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-text-primary">{tr("Installed Apps")}</h2>
                    <span className="text-xs text-text-muted">
                      {tr("{{count}} apps", { count: installedLibrary.installed.length })}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {installedLibrary.installed.map((app) => {
                      const lifecycle = installStateMap[app.id];
                      return (
                        <article key={`installed-${app.id}`} className="rounded-2xl border border-border bg-bg-secondary p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary text-xl">
                                {app.icon}
                              </div>
                              <div className="min-w-0">
                                <SharedUi.Button
                                  onClick={() => navigate(`/appstore/${app.id}`)}
                                  className="truncate text-left text-base font-semibold text-text-primary hover:text-primary"
                                >
                                  {app.name}
                                </SharedUi.Button>
                                <p className="truncate text-xs text-text-muted">{app.shortDescription}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <SharedUi.Button
                                onClick={() => {
                                  void handleAppAction(app);
                                }}
                                disabled={processingAppId === app.id}
                                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {tr("OPEN")}
                              </SharedUi.Button>
                              <SharedUi.Button
                                onClick={() => {
                                  void handleRemoveApp(app);
                                }}
                                disabled={processingAppId === app.id}
                                className="rounded-full border border-warning/50 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {tr("REMOVE")}
                              </SharedUi.Button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-muted">
                            <span className="rounded bg-bg-tertiary px-2 py-1">
                              {tr("Installed {{time}}", {
                                time: formatDateTime(lifecycle?.installedAt, language),
                              })}
                            </span>
                            <span className="rounded bg-bg-tertiary px-2 py-1">
                              {tr("Last opened {{time}}", {
                                time: formatDateTime(lifecycle?.lastOpenedAt, language),
                              })}
                            </span>
                            <span className="rounded bg-bg-tertiary px-2 py-1">
                              {tr("Opens {{count}}", { count: lifecycle?.openCount ?? 0 })}
                            </span>
                            <span className="rounded bg-bg-tertiary px-2 py-1">{app.category.name}</span>
                            <span className="rounded bg-bg-tertiary px-2 py-1">
                              {tr("{{count}} downloads", { count: app.downloads })}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        ) : null}

        {!isLoading && visibleApps.length > 0 && activeTab === "browse" ? (
          <div className="mt-4 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{tr("Browse Order")}</h2>
              <SharedUi.Select
                value={browseSort}
                onChange={(event) => setBrowseSort(event.target.value as BrowseSort)}
                className="h-9 rounded-lg border border-border bg-bg-tertiary px-3 text-xs text-text-primary focus:border-primary focus:outline-none"
              >
                {browseSortOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </SharedUi.Select>
            </div>

            {latestApps.length > 0 ? (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-text-primary">{tr("Latest Releases")}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {latestApps.map((app) => (
                    <AppCard
                      key={`latest-${app.id}`}
                      app={app}
                      variant="small"
                      onClick={() => navigate(`/appstore/${app.id}`)}
                      actionLabel={getAppActionLabel(app)}
                      actionDisabled={processingAppId === app.id}
                      onActionClick={() => {
                        void handleAppAction(app);
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="mb-3 text-lg font-semibold text-text-primary">{tr("All Apps")}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {browseApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onClick={() => navigate(`/appstore/${app.id}`)}
                    actionLabel={getAppActionLabel(app)}
                    actionDisabled={processingAppId === app.id}
                    onActionClick={() => {
                      void handleAppAction(app);
                    }}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default AppStorePage;
