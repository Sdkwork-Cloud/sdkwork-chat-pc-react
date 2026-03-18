import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SkillMarketItem } from "../entities/skill.entity";
import { SkillResultService, SkillService } from "../services";
import { getSkillConfigValidation, type SkillScope } from "./skill.workspace.model";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

function prettyJson(input: Record<string, unknown>): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return "{}";
  }
}

type DetailTab = "overview" | "config" | "governance";

const tabs: Array<{ key: DetailTab; label: string; hint: string }> = [
  { key: "overview", label: "Overview", hint: "Capabilities and status" },
  { key: "config", label: "Configuration", hint: "JSON runtime config" },
  { key: "governance", label: "Governance", hint: "Scope and rollout" },
];

const presetOptions: Array<{ id: string; name: string; description: string; config: Record<string, unknown> }> = [
  {
    id: "safe",
    name: "Safe",
    description: "Lower-risk production baseline.",
    config: { enabled: true, timeout: 1500, retry: 1, cache: true },
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Default balanced policy.",
    config: { enabled: true, timeout: 2500, retry: 2, cache: true },
  },
  {
    id: "aggressive",
    name: "Aggressive",
    description: "Higher throughput with relaxed safeguards.",
    config: { enabled: true, timeout: 4000, retry: 3, cache: false },
  },
];

const scopeOptions: Array<{ value: SkillScope; label: string; description: string }> = [
  { value: "workspace", label: "Workspace", description: "Visible only in current workspace." },
  { value: "team", label: "Team", description: "Shared policy for team usage." },
  { value: "global", label: "Global", description: "Global rollout, use with caution." },
];

export function SkillDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tr, formatNumber } = useAppTranslation();

  const [skill, setSkill] = useState<SkillMarketItem | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [scope, setScope] = useState<SkillScope>("workspace");
  const [configText, setConfigText] = useState("{\n  \"enabled\": true\n}");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const skillId = id || "";
    if (!skillId) {
      setErrorText(tr("Missing skill id."));
      setSkill(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setIsLoading(true);
      setErrorText("");
      setStatusText("");

      try {
        const [detailResult, mySkillsResult] = await Promise.all([
          SkillResultService.getSkillById(skillId),
          SkillResultService.getMySkills(),
        ]);

        if (cancelled) {
          return;
        }

        if (!detailResult.success || !mySkillsResult.success) {
          setSkill(null);
        setErrorText(
          detailResult.error ||
            detailResult.message ||
            mySkillsResult.error ||
            mySkillsResult.message ||
            tr("Failed to load skill detail."),
        );
          return;
        }

        const detail = detailResult.data || null;
        const mySkills = mySkillsResult.data || [];

        if (!detail) {
          setSkill(null);
          setErrorText(tr("Skill not found."));
          return;
        }

        const mySkill = mySkills.find((item) => item.skillId === detail.id);
        const config = (mySkill?.config || { enabled: Boolean(detail.isEnabled), scope: "workspace" }) as Record<
          string,
          unknown
        >;

        setSkill(detail);
        setIsFavorite(SkillService.isSkillFavorite(detail.id));
        setConfigText(prettyJson(config));
        SkillService.markSkillOpened(detail.id);

        if (config.scope === "workspace" || config.scope === "team" || config.scope === "global") {
          setScope(config.scope);
        } else {
          setScope("workspace");
        }
      } catch (error) {
        if (!cancelled) {
          setSkill(null);
          setErrorText(error instanceof Error ? error.message : tr("Failed to load skill detail."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [id, tr]);

  const parsedConfig = useMemo(() => {
    try {
      return JSON.parse(configText) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [configText]);

  const mergedConfig = useMemo(() => {
    if (!parsedConfig) {
      return null;
    }
    return {
      ...parsedConfig,
      scope,
    };
  }, [parsedConfig, scope]);

  const validation = useMemo(() => {
    if (!mergedConfig) {
      return {
        valid: false,
        warnings: [tr("Configuration JSON is invalid.")],
      };
    }
    return getSkillConfigValidation(mergedConfig);
  }, [mergedConfig, tr]);

  const capabilityText = useMemo(() => {
    if (!skill || skill.capabilities.length === 0) {
      return "-";
    }
    return skill.capabilities.map((capability) => tr(capability)).join(" / ");
  }, [skill, tr]);

  const handleToggle = async () => {
    if (!skill) {
      return;
    }

    setStatusText("");
    setErrorText("");
    setIsToggling(true);
    try {
      if (skill.isEnabled) {
        const result = await SkillResultService.disableSkill(skill.id);
        if (!result.success) {
          setErrorText(result.error || result.message || tr("Failed to update skill state."));
          return;
        }
        setSkill((previous) => (previous ? { ...previous, isEnabled: false } : previous));
        setStatusText(tr("Skill disabled."));
      } else {
        const result = await SkillResultService.enableSkill(skill.id);
        if (!result.success) {
          setErrorText(result.error || result.message || tr("Failed to update skill state."));
          return;
        }
        setSkill((previous) => (previous ? { ...previous, isEnabled: true } : previous));
        setStatusText(tr("Skill enabled."));
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : tr("Failed to update skill state."));
    } finally {
      setIsToggling(false);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = presetOptions.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    const nextConfig = {
      ...preset.config,
      enabled: skill?.isEnabled ?? true,
      scope,
    };

    setConfigText(prettyJson(nextConfig));
    setStatusText(tr('Preset "{{name}}" applied.', { name: preset.name }));
    setErrorText("");
    setActiveTab("config");
  };

  const handleSaveConfig = async () => {
    if (!skill) {
      return;
    }

    if (!mergedConfig) {
      setErrorText(tr("Invalid JSON. Please fix before saving."));
      return;
    }

    if (!validation.valid) {
      setErrorText(
        tr("Config validation failed: {{warnings}}", {
          warnings: validation.warnings.map((warning) => tr(warning)).join("; "),
        }),
      );
      return;
    }

    setStatusText("");
    setErrorText("");
    setIsSaving(true);
    try {
      const result = await SkillResultService.updateSkillConfig(skill.id, mergedConfig);
      if (!result.success) {
        setErrorText(result.error || result.message || tr("Save failed."));
        return;
      }
      setSkill((previous) =>
        previous
          ? {
              ...previous,
              isConfigured: true,
              configuredAt: new Date().toISOString(),
            }
          : previous,
      );
      setStatusText(tr("Configuration saved."));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : tr("Save failed."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = () => {
    if (!skill) {
      return;
    }
    const enabled = SkillService.toggleFavoriteSkill(skill.id);
    setIsFavorite(enabled);
    setStatusText(enabled ? tr("Added to favorites.") : tr("Removed from favorites."));
    setErrorText("");
  };

  if (isLoading) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          {tr("Loading skill detail...")}
        </div>
      </section>
    );
  }

  if (!skill) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
          <button
            onClick={() => navigate("/skills")}
            className="w-fit rounded-full border border-border bg-bg-secondary px-4 py-2 text-xs text-text-secondary hover:bg-bg-hover"
          >
            {tr("Back to Skill Market")}
          </button>
        <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          {errorText || "Skill not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <button
          onClick={() => navigate("/skills")}
          className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
        >
          {tr("Back to Skill Market")}
        </button>
        <h1 className="mt-3 text-xl font-semibold text-text-primary">
          {skill.icon} {skill.name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{skill.description}</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-border bg-bg-tertiary px-3 py-1 text-xs text-text-muted">
          {tr(skill.category)} / v{skill.version}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-auto rounded-2xl border border-border bg-bg-secondary p-4">
          <h2 className="text-sm font-semibold text-text-primary">{tr("Skill Lifecycle")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Category")}</p>
              <p className="mt-1 text-sm text-text-primary">{tr(skill.category)}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Version")}</p>
              <p className="mt-1 text-sm text-text-primary">v{skill.version}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Rating")}</p>
              <p className="mt-1 text-sm text-text-primary">{formatNumber(skill.rating, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">{tr("Usage")}</p>
              <p className="mt-1 text-sm text-text-primary">{formatNumber(skill.usageCount)}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-bg-primary to-bg-primary p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr("Rollout Plan")}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {tr("Start from workspace rollout, validate stability, then scale to team or global scope.")}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              onClick={() => {
                void handleToggle();
              }}
              disabled={isToggling}
              className={`rounded-md px-3 py-2 text-sm text-white ${
                skill.isEnabled ? "bg-warning hover:brightness-110" : "bg-primary hover:bg-primary-hover"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isToggling
                ? tr("Updating...")
                : skill.isEnabled
                ? tr("Disable Skill")
                : tr("Enable Skill")}
            </button>
            <button
              onClick={() => {
                setActiveTab("config");
              }}
              className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover"
            >
              {tr("Edit Configuration")}
            </button>
            <button
              onClick={handleToggleFavorite}
              className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                isFavorite
                  ? "border-primary/40 bg-primary/10 text-primary hover:brightness-110"
                  : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {isFavorite ? tr("Favorited") : tr("Add to favorites")}
            </button>
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Presets")}</h3>
          <div className="mt-2 space-y-2">
            {presetOptions.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-left transition-colors hover:border-primary/40"
                >
                  <p className="text-sm font-medium text-text-primary">{tr(preset.name)}</p>
                  <p className="mt-1 text-xs text-text-muted">{tr(preset.description)}</p>
                </button>
            ))}
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {tr(tab.label)}
                  <span className={`ml-2 ${active ? "text-white/80" : "text-text-muted"}`}>
                    {tr(tab.hint)}
                  </span>
                </button>
              );
            })}
          </div>

          {statusText ? (
            <div className="mb-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
              {statusText}
            </div>
          ) : null}

          {errorText ? (
            <div className="mb-3 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
              {errorText}
            </div>
          ) : null}

          {activeTab === "overview" ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-bg-primary p-4">
                  <h3 className="text-sm font-semibold text-text-primary">{tr("Capabilities")}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{capabilityText}</p>
                </div>

                <div className="rounded-xl border border-border bg-bg-primary p-4">
                  <h3 className="text-sm font-semibold text-text-primary">{tr("Tags")}</h3>
                  {skill.tags.length === 0 ? (
                    <p className="mt-2 text-sm text-text-muted">{tr("No tags.")}</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skill.tags.map((tag) => (
                        <span key={`${skill.id}-${tag}`} className="rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-tertiary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-bg-primary p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-text-primary">{tr("Current Policy")}</h3>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm text-text-secondary">
                      {tr("Scope")}: <span className="font-medium text-text-primary">{tr(scope)}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm text-text-secondary">
                      {tr("State")}:{" "}
                      <span className="ml-1 font-medium text-text-primary">
                        {skill.isEnabled ? tr("Enabled") : tr("Disabled")}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm text-text-secondary">
                      {tr("Validation")}
                      :
                      <span className="ml-1 font-medium text-text-primary">
                        {validation.valid ? tr("Pass") : tr("Warn")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "config" ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="rounded-xl border border-border bg-bg-primary p-4">
                <h3 className="text-sm font-semibold text-text-primary">{tr("Configuration JSON")}</h3>
                <textarea
                  value={configText}
                  onChange={(event) => setConfigText(event.target.value)}
                  rows={16}
                  className="mt-3 w-full rounded-lg border border-border bg-bg-tertiary p-3 font-mono text-xs text-text-primary focus:border-primary focus:outline-none"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        void handleSaveConfig();
                      }}
                      disabled={isSaving}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs text-white transition-colors hover:brightness-110 disabled:opacity-60"
                    >
                      {isSaving ? tr("Saving...") : tr("Save Configuration")}
                    </button>
                  <span className="text-xs text-text-muted">
                    {tr("Required fields and scope are validated before save.")}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "governance" ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="rounded-xl border border-border bg-bg-primary p-4">
                <h3 className="text-sm font-semibold text-text-primary">{tr("Rollout Scope")}</h3>
                <div className="mt-3 space-y-2">
                  {scopeOptions.map((option) => {
                    const active = scope === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setScope(option.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                        }`}
                      >
                          <p className="text-sm font-medium">{tr(option.label)}</p>
                          <p className="mt-1 text-xs opacity-80">{tr(option.description)}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-bg-secondary p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{tr("Validation")}</p>
                    {validation.warnings.length === 0 ? (
                      <p className="mt-2 text-sm text-success">{tr("Configuration contract looks good.")}</p>
                    ) : (
                      <ul className="mt-2 list-disc pl-5 text-sm text-warning">
                        {validation.warnings.map((warning) => (
                          <li key={warning}>{tr(warning)}</li>
                        ))}
                      </ul>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default SkillDetailPage;
