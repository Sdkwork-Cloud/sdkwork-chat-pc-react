import { AlertCircle, Download, ShieldCheck, Star } from "lucide-react";
import * as SharedUi from "@sdkwork/openchat-pc-ui";
import type { SkillMarketItem } from "../entities/skill.entity";

type TranslationFn = (key: string, params?: Record<string, unknown>) => string;
type NumberFormatter = (value: number, options?: Intl.NumberFormatOptions) => string;

function getStatusClass(skill: SkillMarketItem): string {
  if (skill.isEnabled && !skill.isConfigured) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  }

  if (skill.isEnabled) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function getStatusLabel(tr: TranslationFn, skill: SkillMarketItem): string {
  if (skill.isEnabled && !skill.isConfigured) {
    return tr("Needs config");
  }

  if (skill.isEnabled) {
    return tr("Enabled");
  }

  return tr("Disabled");
}

export function SkillMarketCard({
  skill,
  isFavorite,
  isBusy,
  onOpen,
  onEnable,
  onDisable,
  onToggleFavorite,
  tr,
  formatNumber,
  categoryLabel,
}: {
  skill: SkillMarketItem;
  isFavorite: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onEnable: (skillId: string) => void;
  onDisable: (skillId: string) => void;
  onToggleFavorite: (skillId: string) => void;
  tr: TranslationFn;
  formatNumber: NumberFormatter;
  categoryLabel: string;
}) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-bg-secondary p-5 shadow-sm transition-all hover:border-primary/40 hover:bg-bg-hover">
      <SharedUi.Button
        type="button"
        variant="unstyled"
        aria-label={skill.name}
        onClick={onOpen}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />

      <div className="pointer-events-none relative z-10 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bg-tertiary text-xl font-semibold text-text-primary">
          {skill.icon || skill.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-text-primary">{skill.name}</h3>
            {skill.isBuiltin ? (
              <span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200">
                <ShieldCheck className="mr-1 inline-block h-3.5 w-3.5" />
                {tr("Builtin")}
              </span>
            ) : null}
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(skill)}`}>
              {getStatusLabel(tr, skill)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="truncate">{skill.provider}</span>
            <span>{tr("v{{version}}", { version: skill.version })}</span>
            <span className="inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              {formatNumber(skill.usageCount)}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-current" />
              {formatNumber(skill.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">
            {skill.description}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap gap-2">
        {skill.tags.slice(0, 4).map((tag) => (
          <span
            key={`${skill.id}-${tag}`}
            className="rounded-full border border-border bg-bg-primary px-3 py-1 text-xs text-text-secondary"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="pointer-events-none flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span>
            {tr("Category")} {categoryLabel}
          </span>
          <span>{tr("v{{version}}", { version: skill.version })}</span>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <SharedUi.Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
          >
            {tr("View details")}
          </SharedUi.Button>

          {skill.isEnabled ? (
            <SharedUi.Button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!isBusy) {
                  onDisable(skill.id);
                }
              }}
              disabled={isBusy}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
            >
              {isBusy ? tr("Updating...") : tr("Disable")}
            </SharedUi.Button>
          ) : (
            <SharedUi.Button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!isBusy) {
                  onEnable(skill.id);
                }
              }}
              disabled={isBusy}
              className="rounded-lg bg-primary px-3 py-2 text-xs text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? tr("Updating...") : tr("Enable")}
            </SharedUi.Button>
          )}

          <SharedUi.Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(skill.id);
            }}
            className={`rounded-lg px-3 py-2 text-xs transition-colors ${
              isFavorite
                ? "border border-primary/40 bg-primary/10 text-primary hover:brightness-110"
                : "border border-border bg-bg-primary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {isFavorite ? tr("Saved") : tr("Save")}
          </SharedUi.Button>
        </div>
      </div>
    </article>
  );
}

export function SkillMarketEmptyState({
  title,
  description,
  onReset,
  resetLabel,
}: {
  title: string;
  description: string;
  onReset?: () => void;
  resetLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-bg-primary px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary text-text-muted ring-1 ring-border">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">{description}</p>
      {onReset && resetLabel ? (
        <SharedUi.Button
          onClick={onReset}
          className="mt-5 rounded-xl border border-border bg-bg-tertiary px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
        >
          {resetLabel}
        </SharedUi.Button>
      ) : null}
    </div>
  );
}
