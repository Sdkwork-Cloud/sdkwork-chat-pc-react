import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { App } from "../entities/app.entity";

type AppCardVariant = "large" | "small" | "compact" | "banner";
type AppCardActionTone = "primary" | "neutral" | "danger";

interface AppCardProps {
  app: App;
  variant?: AppCardVariant;
  onClick: () => void;
  actionLabel?: string;
  onActionClick?: () => void;
  actionDisabled?: boolean;
  actionTone?: AppCardActionTone;
}

function getActionClass(actionTone: AppCardActionTone): string {
  if (actionTone === "danger") {
    return "bg-warning/15 text-warning hover:bg-warning/25";
  }
  if (actionTone === "neutral") {
    return "bg-bg-tertiary text-text-secondary hover:bg-bg-hover";
  }
  return "bg-bg-tertiary text-primary hover:bg-primary/10";
}

export const AppCard = memo(
  ({
    app,
    variant = "large",
    onClick,
    actionLabel,
    onActionClick,
    actionDisabled = false,
    actionTone = "primary",
  }: AppCardProps) => {
    const { tr, language, formatCurrency, formatNumber } = useAppTranslation();
    const compactNumberFormatter = new Intl.NumberFormat(language, {
      notation: "compact",
      maximumFractionDigits: 1,
    });
    const ratingLabel = formatNumber(app.rating.average, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const resolvedActionLabel =
      actionLabel || (!app.price || app.price <= 0 ? tr("GET") : formatCurrency(app.price, app.currency));
    const actionClass = getActionClass(actionTone);

    const actionNode = onActionClick ? (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onActionClick();
        }}
        disabled={actionDisabled}
        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${actionClass}`}
      >
        {resolvedActionLabel}
      </button>
    ) : (
      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${actionClass}`}>
        {resolvedActionLabel}
      </span>
    );

    if (variant === "banner") {
      return (
        <button
          onClick={onClick}
          className="group w-full rounded-2xl border border-border bg-gradient-to-br from-bg-secondary via-bg-secondary to-bg-primary p-4 text-left transition-all hover:border-primary/40 hover:shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bg-tertiary text-2xl shadow-sm">
              {app.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-text-primary">{app.name}</h3>
                {app.editorChoice ? (
                  <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                    {tr("Editor")}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{app.shortDescription}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                <span>{tr("{{value}} rating", { value: ratingLabel })}</span>
                <span>{tr("{{count}} downloads", { count: app.downloads })}</span>
                <span>{app.category.name}</span>
              </div>
            </div>
            {actionNode}
          </div>
        </button>
      );
    }

    if (variant === "small") {
      return (
        <button
          onClick={onClick}
          className="group flex w-full items-center gap-3 rounded-xl border border-border bg-bg-secondary p-3 text-left transition-all hover:border-primary/40 hover:bg-bg-hover"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-tertiary text-xl">
            {app.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-text-primary">{app.name}</h3>
            <p className="truncate text-xs text-text-tertiary">{app.category.name}</p>
            <p className="mt-1 text-xs text-text-muted">{tr("{{value}} rating", { value: ratingLabel })}</p>
          </div>
          {actionNode}
        </button>
      );
    }

    if (variant === "compact") {
      return (
        <button
          onClick={onClick}
          className="group w-full rounded-xl border border-border bg-bg-secondary p-3 text-left transition-all hover:border-primary/40 hover:bg-bg-hover"
        >
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-bg-tertiary text-xl">
            {app.icon}
          </div>
          <h3 className="truncate text-sm font-semibold text-text-primary">{app.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-text-muted">{app.shortDescription}</p>
        </button>
      );
    }

    return (
      <button
        onClick={onClick}
        className="group w-full rounded-2xl border border-border bg-bg-secondary p-4 text-left transition-all hover:border-primary/40 hover:bg-bg-hover hover:shadow-lg"
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bg-tertiary text-2xl">
            {app.icon}
          </div>
          <div className="flex gap-1">
            {app.featured ? (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {tr("Featured")}
              </span>
            ) : null}
            {app.trending ? (
              <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                {tr("Trending")}
              </span>
            ) : null}
          </div>
        </div>
        <h3 className="truncate text-base font-semibold text-text-primary">{app.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{app.shortDescription}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
          <span>{app.developer.name}</span>
          <span>{ratingLabel} / 5</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">
                  {tr("{{count}} installs", { count: app.downloads })}
          </span>
          {actionNode}
        </div>
      </button>
    );
  },
);

AppCard.displayName = "AppCard";

export default AppCard;
