import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SkillCard } from "../components/SkillCard";
import type { SkillCategoryInfo, SkillMarketItem } from "../entities/skill.entity";
import { SkillResultService, SkillService } from "../services";
import { buildSkillWorkspaceSummary, filterSkillsByStage, type SkillPipelineStage } from "./skill.workspace.model";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

type SkillSortType = "popular" | "rating" | "newest";

const stageOptions: Array<{ key: SkillPipelineStage; label: string; description: string }> = [
  { key: "all", label: "All", description: "Browse full marketplace inventory" },
  { key: "enabled", label: "Enabled", description: "Available in current workspace" },
  { key: "disabled", label: "Disabled", description: "Not installed or turned off" },
  { key: "needs_config", label: "Needs config", description: "Enabled but missing required setup" },
];

export function SkillMarketPage() {
  const navigate = useNavigate();
  const { tr, formatNumber } = useAppTranslation();

  const [categories, setCategories] = useState<SkillCategoryInfo[]>([]);
  const [skills, setSkills] = useState<SkillMarketItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SkillSortType>("popular");
  const [stage, setStage] = useState<SkillPipelineStage>("all");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [processingSkillId, setProcessingSkillId] = useState<string | null>(null);
  const [favoriteSkillIds, setFavoriteSkillIds] = useState<string[]>([]);
  const [recentSkillIds, setRecentSkillIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const result = await SkillResultService.getCategories();
        if (!cancelled) {
          if (!result.success || !result.data) {
            setErrorText(result.error || result.message || tr("Failed to load categories."));
            setCategories([{ id: "all", name: "All", icon: "ALL" }]);
            return;
          }
          setCategories(result.data);
          setFavoriteSkillIds(SkillService.getFavoriteSkillIds());
          setRecentSkillIds(SkillService.getRecentSkillIds());
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : tr("Failed to load categories."));
          setCategories([{ id: "all", name: "All", icon: "ALL" }]);
        }
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const loadSkills = async () => {
        setIsLoading(true);
        setErrorText("");
        try {
          const result = await SkillResultService.getSkills(
            category === "all" ? undefined : category,
            keyword.trim() || undefined,
            sortBy,
          );
          if (!cancelled) {
            if (!result.success || !result.data) {
              setErrorText(result.error || result.message || tr("Failed to load skills."));
              setSkills([]);
              return;
            }
            setSkills(result.data);
          }
        } catch (error) {
          if (!cancelled) {
            setErrorText(error instanceof Error ? error.message : tr("Failed to load skills."));
            setSkills([]);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      void loadSkills();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [category, keyword, sortBy]);

  const summary = useMemo(() => buildSkillWorkspaceSummary(skills), [skills]);
  const visibleSkills = useMemo(() => filterSkillsByStage(skills, stage), [skills, stage]);

  const featuredSkills = useMemo(() => {
    return [...visibleSkills]
      .sort((left, right) => right.rating * 10_000 + right.usageCount - (left.rating * 10_000 + left.usageCount))
      .slice(0, 4);
  }, [visibleSkills]);

  useEffect(() => {
    if (visibleSkills.length === 0) {
      setSelectedSkillId(null);
      return;
    }

    if (!selectedSkillId || !visibleSkills.some((item) => item.id === selectedSkillId)) {
      setSelectedSkillId(visibleSkills[0]!.id);
    }
  }, [visibleSkills, selectedSkillId]);

  const selectedSkill = useMemo(() => {
    if (!selectedSkillId) {
      return null;
    }
    return visibleSkills.find((item) => item.id === selectedSkillId) || null;
  }, [visibleSkills, selectedSkillId]);

  const recentVisibleSkills = useMemo(() => {
    const byId = new Map(visibleSkills.map((item) => [item.id, item]));
    return recentSkillIds
      .map((skillId) => byId.get(skillId))
      .filter((item): item is SkillMarketItem => Boolean(item))
      .slice(0, 5);
  }, [visibleSkills, recentSkillIds]);

  const isSelectedSkillFavorite = useMemo(() => {
    if (!selectedSkill) {
      return false;
    }
    return favoriteSkillIds.includes(selectedSkill.id);
  }, [selectedSkill, favoriteSkillIds]);

  const handleEnable = async (skillId: string) => {
    setStatusText("");
    setProcessingSkillId(skillId);
    try {
      const result = await SkillResultService.enableSkill(skillId);
        if (!result.success) {
          setErrorText(result.error || result.message || tr("Failed to enable skill."));
          return;
        }
      setSkills((previous) =>
        previous.map((item) =>
          item.id === skillId
            ? {
                ...item,
                isEnabled: true,
                isConfigured: false,
              }
            : item,
        ),
      );
        setStatusText(tr("Skill enabled. Open detail workspace to complete policy configuration."));
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : tr("Failed to enable skill."));
      } finally {
        setProcessingSkillId(null);
      }
  };

  const handleDisable = async (skillId: string) => {
    setStatusText("");
    setProcessingSkillId(skillId);
    try {
      const result = await SkillResultService.disableSkill(skillId);
        if (!result.success) {
          setErrorText(result.error || result.message || tr("Failed to disable skill."));
          return;
        }
      setSkills((previous) => previous.map((item) => (item.id === skillId ? { ...item, isEnabled: false } : item)));
      setStatusText(tr("Skill disabled."));
    } catch (error) {
        setErrorText(error instanceof Error ? error.message : tr("Failed to disable skill."));
      } finally {
        setProcessingSkillId(null);
      }
  };

  const handleOpenSkillDetail = (skillId: string) => {
    const updatedRecent = SkillService.markSkillOpened(skillId);
    setRecentSkillIds(updatedRecent);
    navigate(`/skills/${skillId}`);
  };

  const handleToggleFavorite = (skillId: string) => {
    const enabled = SkillService.toggleFavoriteSkill(skillId);
    setFavoriteSkillIds(SkillService.getFavoriteSkillIds());
    setStatusText(
      enabled ? tr("Skill added to favorites.") : tr("Skill removed from favorites."),
    );
    setErrorText("");
  };

  const resetFilters = () => {
    setKeyword("");
    setCategory("all");
    setSortBy("popular");
    setStage("all");
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{tr("Skill Marketplace")}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {tr("Build a clear Discover, Enable, Configure workflow for reusable skill capabilities.")}
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
              onClick={() => navigate("/appstore")}
              className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
            >
              {tr("App Store")}
            </SharedUi.Button>
            <SharedUi.Button
              onClick={() => navigate("/skills/my")}
              className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
            >
              {tr("My Skills")}
            </SharedUi.Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 overflow-auto rounded-2xl border border-border bg-bg-secondary p-4">
          <h2 className="text-sm font-semibold text-text-primary">{tr("Pipeline")}</h2>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Discover")}</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Enable")}</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{summary.enabled}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Configure")}</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{summary.needsConfig}</p>
            </div>
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {tr("Stage Filter")}
          </h3>
          <div className="mt-2 space-y-2">
            {stageOptions.map((option) => {
              const active = stage === option.key;
              return (
                <SharedUi.Button
                  key={option.key}
                  onClick={() => setStage(option.key)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  <p className="text-sm font-medium">{tr(option.label)}</p>
                  <p className="mt-1 text-xs opacity-80">{tr(option.description)}</p>
                </SharedUi.Button>
              );
            })}
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {tr("Category")}
          </h3>
          <div className="mt-2 space-y-1">
            {categories.map((item) => {
              const active = category === item.id;
              return (
                <SharedUi.Button
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {item.icon} {item.name}
                </SharedUi.Button>
              );
            })}
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {tr("Flow Advice")}
          </h3>
          <div className="mt-2 space-y-2 rounded-xl border border-border bg-bg-primary p-3">
            <div className="text-xs text-text-secondary">{tr("1. Discover reusable capabilities.")}</div>
            <div className="text-xs text-text-secondary">{tr("2. Enable and verify runtime behavior.")}</div>
            <div className="text-xs text-text-secondary">{tr("3. Apply governance scope for rollout control.")}</div>
          </div>
        </aside>

        <div className="min-h-0 overflow-auto rounded-2xl border border-border bg-bg-secondary p-4">
          {recentVisibleSkills.length > 0 ? (
            <div className="mb-4 rounded-xl border border-border bg-bg-primary p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {tr("Recently used")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentVisibleSkills.map((skill) => (
                  <SharedUi.Button
                    key={`recent-${skill.id}`}
                    onClick={() => handleOpenSkillDetail(skill.id)}
                    className="rounded-full border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
                  >
                    {skill.icon} {skill.name}
                  </SharedUi.Button>
                ))}
              </div>
            </div>
          ) : null}

          {featuredSkills.length > 0 ? (
            <div className="mb-4 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-bg-primary to-bg-primary p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {tr("Curated Skills")}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {featuredSkills.map((skill) => (
                  <SharedUi.Button
                    key={`featured-${skill.id}`}
                    onClick={() => setSelectedSkillId(skill.id)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-left transition-colors hover:border-primary/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-tertiary text-xs font-semibold text-text-primary">
                      {skill.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{skill.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {formatNumber(skill.rating, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })} / {formatNumber(skill.usageCount)} {tr("uses")}
                      </p>
                    </div>
                  </SharedUi.Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
            <SharedUi.Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={tr("Search by name, description, or tags")}
              className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <SharedUi.Select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SkillSortType)}
              className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="popular">{tr("By popularity")}</option>
              <option value="rating">{tr("By rating")}</option>
              <option value="newest">{tr("By newest")}</option>
            </SharedUi.Select>
          </div>

          {statusText ? (
            <div className="mb-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
              {statusText}
            </div>
          ) : null}

          {errorText ? (
            <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {errorText}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-border bg-bg-primary p-5 text-sm text-text-secondary">
              {tr("Loading skills...")}
            </div>
          ) : visibleSkills.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-primary p-5 text-sm text-text-secondary">
              <p>{tr("No skill matches current filters.")}</p>
              <SharedUi.Button
                onClick={resetFilters}
                className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
              >
                {tr("Reset filters")}
              </SharedUi.Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {visibleSkills.map((skill) => (
                <div key={skill.id} onClick={() => setSelectedSkillId(skill.id)}>
                  <SkillCard
                    skill={skill}
                    onEnable={handleEnable}
                    onDisable={handleDisable}
                    onClick={() => setSelectedSkillId(skill.id)}
                    disabled={processingSkillId === skill.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="hidden min-h-0 overflow-auto rounded-2xl border border-border bg-bg-secondary p-4 xl:block">
          <h2 className="text-sm font-semibold text-text-primary">{tr("Skill Preview")}</h2>
          {!selectedSkill ? (
            <div className="mt-3 rounded-lg border border-border bg-bg-primary p-4 text-sm text-text-secondary">
              {tr("Select a skill to view detail.")}
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="rounded-lg border border-border bg-bg-primary p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary text-sm font-semibold text-text-primary">
                    {selectedSkill.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-text-primary">{selectedSkill.name}</h3>
                    <p className="truncate text-xs text-text-muted">v{selectedSkill.version}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{selectedSkill.description}</p>
              </div>

              <div className="rounded-lg border border-border bg-bg-primary p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {tr("Capabilities")}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSkill.isEnabled && !selectedSkill.isConfigured ? (
                    <span className="text-xs text-warning">
                      {tr("Enabled but not configured yet. Open detail workspace and save runtime policy.")}
                    </span>
                  ) : selectedSkill.capabilities.length > 0 ? (
                    selectedSkill.capabilities.map((capability) => (
                      <span key={`${selectedSkill.id}-${capability}`} className="rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-tertiary">
                        {capability}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">
                      {tr("No capability metadata available.")}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-primary p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {tr("Actions")}
                </h4>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {selectedSkill.isEnabled ? (
                    <SharedUi.Button
                      onClick={() => {
                        void handleDisable(selectedSkill.id);
                      }}
                      disabled={processingSkillId === selectedSkill.id}
                      className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning transition-colors hover:bg-warning/20 disabled:opacity-60"
                    >
                      {tr("Disable skill")}
                    </SharedUi.Button>
                  ) : (
                    <SharedUi.Button
                      onClick={() => {
                        void handleEnable(selectedSkill.id);
                      }}
                      disabled={processingSkillId === selectedSkill.id}
                      className="rounded-md bg-primary px-3 py-2 text-sm text-white transition-colors hover:brightness-110 disabled:opacity-60"
                    >
                      {tr("Enable skill")}
                    </SharedUi.Button>
                  )}

                  <SharedUi.Button
                    onClick={() => handleOpenSkillDetail(selectedSkill.id)}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover"
                  >
                    {tr("Open detail workspace")}
                  </SharedUi.Button>
                  <SharedUi.Button
                    onClick={() => handleToggleFavorite(selectedSkill.id)}
                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                      isSelectedSkillFavorite
                        ? "border-primary/40 bg-primary/10 text-primary hover:brightness-110"
                        : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                    }`}
>
                    {isSelectedSkillFavorite ? tr("Favorited") : tr("Add favorite")}
                  </SharedUi.Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-primary p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {tr("Rollout Advice")}
                </h4>
                <div className="mt-2 space-y-2 text-xs text-text-secondary">
                  <p>
                    {tr(
                      "Scope: start from workspace canary, then expand to team/global after stability checks.",
                    )}
                  </p>
                  <p>
                    {tr("Reliability: enable timeout and retry policies for session-level quality.")}
                  </p>
                  <p>
                    {tr("Docs: provide policy docs in detail workspace for team reuse.")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default SkillMarketPage;
