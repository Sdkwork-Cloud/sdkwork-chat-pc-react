import type { ReactNode } from "react";
import { Button, Switch } from "@sdkwork/openchat-pc-ui";

export function PanelHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 bg-zinc-50/60 px-6 py-5 dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</div>
        {description ? (
          <div className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {description}
          </div>
        ) : null}
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

export function SignedOutState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_42%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
          </div>

          <Button onClick={onAction} className="min-w-[160px]">
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
