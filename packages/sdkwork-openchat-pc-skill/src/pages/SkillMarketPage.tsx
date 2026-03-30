import { startTransition, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import * as SharedUi from "@sdkwork/openchat-pc-ui";
import type { SkillCategoryInfo, SkillMarketItem } from "../entities/skill.entity";
import { SkillResultService, SkillService } from "../services";
import { filterSkillsByStage, type SkillPipelineStage } from "./skill.workspace.model";
import { SkillMarketCard, SkillMarketEmptyState } from "../components/SkillMarketComponents";

type SkillSortType = "popular" | "rating" | "newest";

const stageTabs: Array<{ key: SkillPipelineStage; label: string; description: string }> = [
  { key: "all", label: "All", description: "Browse the full catalog" },
  { key: "enabled", label: "Enabled", description: "Currently available" },
  { key: "disabled", label: "Disabled", description: "Not installed or off" },
  { key: "needs_config", label: "Needs config", description: "Enabled but pending setup" },
];

function formatFallbackLabel(value: string): string {
  if (!value) {
    return value;
  }

  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function SkillMarketPage() {
  const navigate = useNavigate();
  const { tr, formatNumber } = useAppTranslation();

  const [categories, setCategories] = useState<SkillCategoryInfo[]>([]);
  const [skills, setSkills] = useState<SkillMarketItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SkillSortType>("popular");
  const [stage, setStage] = useState<SkillPipelineStage>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [processingSkillId, setProcessingSkillId] = useState<string | null>(null);
  const [favoriteSkillIds, setFavoriteSkillIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const result = await SkillResultService.getCategories();
        if (cancelled) {
          return;
        }

        if (!result.success || !result.data) {
          setErrorText(result.error || result.message || tr("Failed to load categories."));
          setCategories([{ id: "all", name: "All", icon: "ALL" }]);
          return;
        }

        setCategories([{ id: "all", name: "All", icon: "ALL" }, ...result.data.filter((item) => item.id !== "all")]);
        setFavoriteSkillIds(SkillService.getFavoriteSkillIds());
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
  }, [tr]);

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

          if (cancelled) {
            return;
          }

          if (!result.success || !result.data) {
            setErrorText(result.error || result.message || tr("Failed to load skills."));
            setSkills([]);
            return;
          }

          setSkills(result.data);
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
  }, [category, keyword, sortBy, tr]);

  const visibleSkills = useMemo(() => filterSkillsByStage(skills, stage), [skills, stage]);
  const favoriteSkillIdSet = useMemo(() => new Set(favoriteSkillIds), [favoriteSkillIds]);
  const categoryTabs = useMemo(
    () => (categories.length > 0 ? categories : [{ id: "all", name: "All", icon: "ALL" }]),
    [categories],
  );

  useEffect(() => {
    if (!categoryTabs.some((item) => item.id === category)) {
      setCategory("all");
    }
  }, [category, categoryTabs]);

  const handleOpenSkillDetail = (skillId: string) => {
    SkillService.markSkillOpened(skillId);
    navigate(`/skills/${skillId}`);
  };

  const handleToggleFavorite = (skillId: string) => {
    const enabled = SkillService.toggleFavoriteSkill(skillId);
    setFavoriteSkillIds(SkillService.getFavoriteSkillIds());
    setStatusText(enabled ? tr("Skill added to favorites.") : tr("Skill removed from favorites."));
    setErrorText("");
  };

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

  const resetFilters = () => {
    setKeyword("");
    setCategory("all");
    setSortBy("popular");
    setStage("all");
  };

  const categoryLabel = (value: string, fallback?: string) =>
    value === "all" ? tr("All") : fallback || formatFallbackLabel(value);

  return (
    <section className="flex h-full min-w-0 w-full flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto pb-1">
            <div
              role="tablist"
              aria-label={tr("Skill Marketplace")}
              className="inline-flex min-w-full gap-2 rounded-2xl border border-border bg-bg-primary p-1 sm:min-w-0"
            >
              {stageTabs.map((tab) => {
                const active = tab.key === stage;
                return (
                  <SharedUi.Button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      startTransition(() => {
                        setStage(tab.key);
                      });
                    }}
                    className={`inline-flex min-w-[120px] flex-1 items-center justify-center rounded-[14px] px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    {tr(tab.label)}
                  </SharedUi.Button>
                );
              })}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
            <div className="relative w-full sm:w-[320px] xl:w-[340px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <SharedUi.Input
                type="text"
                value={keyword}
                placeholder={tr("Search skills...")}
                onChange={(event) => setKeyword(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-bg-primary pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <SharedUi.Select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SkillSortType)}
              className="h-11 w-full rounded-xl border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-primary focus:outline-none sm:w-[170px]"
            >
              <option value="popular">{tr("By popularity")}</option>
              <option value="rating">{tr("By rating")}</option>
              <option value="newest">{tr("By newest")}</option>
            </SharedUi.Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          {categoryTabs.map((item) => {
            const active = item.id === category;
            return (
              <SharedUi.Button
                key={item.id}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setCategory(item.id);
                  });
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200"
                    : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {item.icon} {categoryLabel(item.id, item.name)}
              </SharedUi.Button>
            );
          })}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6">
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-[240px] rounded-2xl border border-border bg-bg-secondary"
              />
            ))}
          </div>
        ) : visibleSkills.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleSkills.map((skill) => (
              <SkillMarketCard
                key={skill.id}
                skill={skill}
                isFavorite={favoriteSkillIdSet.has(skill.id)}
                isBusy={processingSkillId === skill.id}
                onOpen={() => handleOpenSkillDetail(skill.id)}
                onEnable={handleEnable}
                onDisable={handleDisable}
                onToggleFavorite={handleToggleFavorite}
                tr={tr}
                formatNumber={formatNumber}
                categoryLabel={formatFallbackLabel(skill.category)}
              />
            ))}
          </div>
        ) : (
          <SkillMarketEmptyState
            title={tr("No skill matches current filters.")}
            description={tr("Try a different keyword, stage, or category, then clear filters if needed.")}
            onReset={resetFilters}
            resetLabel={tr("Reset filters")}
          />
        )}
      </div>
    </section>
  );
}

export default SkillMarketPage;
