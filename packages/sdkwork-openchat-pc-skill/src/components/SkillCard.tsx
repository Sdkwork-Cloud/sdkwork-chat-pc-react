import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { SkillMarketItem } from "../entities/skill.entity";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

interface SkillCardProps {
  skill: SkillMarketItem;
  onEnable?: (skillId: string) => void;
  onDisable?: (skillId: string) => void;
  onClick?: () => void;
  disabled?: boolean;
}

export function SkillCard({ skill, onEnable, onDisable, onClick, disabled = false }: SkillCardProps) {
  const { formatNumber, tr } = useAppTranslation();

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-border bg-bg-secondary p-4 transition-all ${
        onClick ? "cursor-pointer hover:border-primary/50" : ""
      } ${disabled ? "opacity-70" : ""}`}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary text-sm font-semibold text-text-primary">
          {skill.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-text-primary">{skill.name}</h3>
          <p className="truncate text-xs text-text-muted">
            {skill.provider} / v{skill.version}
          </p>
        </div>
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-text-secondary">{skill.description}</p>

      <div className="mb-3 flex flex-wrap gap-1">
        {skill.tags.slice(0, 3).map((tag) => (
          <span key={`${skill.id}-${tag}`} className="rounded-md bg-bg-tertiary px-2 py-0.5 text-xs text-text-tertiary">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{tr("{{value}} rating", {
            value: formatNumber(skill.rating, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
          })}</span>
          <span>{tr("{{count}} uses", { count: skill.usageCount })}</span>
          {skill.isEnabled && !skill.isConfigured ? (
            <span className="rounded bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
              {tr("Needs config")}
            </span>
          ) : null}
        </div>

        {skill.isEnabled ? (
          <SharedUi.Button
            onClick={(event) => {
              event.stopPropagation();
              if (!disabled) {
                onDisable?.(skill.id);
              }
            }}
            disabled={disabled}
            className="rounded-md border border-success/40 bg-success/10 px-3 py-1 text-xs text-success transition-colors hover:bg-success/20 disabled:cursor-not-allowed"
          >
            {tr("Enabled")}
          </SharedUi.Button>
        ) : (
          <SharedUi.Button
            onClick={(event) => {
              event.stopPropagation();
              if (!disabled) {
                onEnable?.(skill.id);
              }
            }}
            disabled={disabled}
            className="rounded-md bg-primary px-3 py-1 text-xs text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed"
          >
            {tr("Enable")}
          </SharedUi.Button>
        )}
      </div>
    </div>
  );
}

export default SkillCard;
