import { useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { OpenClawInstallResultService } from "../services";
import type {
  OpenClawInstallCatalog,
  OpenClawInstallCommand,
  OpenClawInstallMode,
} from "../types";

const INSTALLER_PROGRESS_STORAGE_KEY = "openclaw:installer-progress:v1";

type ProgressMap = Record<string, boolean>;

function commandProgressKey(modeId: string, commandId: string): string {
  return `${modeId}::${commandId}`;
}

function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(INSTALLER_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as ProgressMap;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function saveProgress(progress: ProgressMap): void {
  localStorage.setItem(INSTALLER_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

function shellBadge(shell: OpenClawInstallCommand["shell"]): string {
  return shell === "powershell" ? "PowerShell" : "Bash";
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function countModeCommands(mode: OpenClawInstallMode): number {
  return mode.steps.reduce((count, step) => count + (step.commands?.length || 0), 0);
}

export function SdkworkOpenclawPcInstaller() {
  const { tr } = useAppTranslation();
  const [catalog, setCatalog] = useState<OpenClawInstallCatalog | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("official");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);
      const result = await OpenClawInstallResultService.getInstallCatalog();
      if (cancelled) {
        return;
      }
      if (!result.success || !result.data) {
        setNotice(result.error || result.message || "Install catalog load failed.");
        setLoading(false);
        return;
      }
      const catalogData = result.data;
      setCatalog(catalogData);
      setActiveCategoryId((current) => {
        if (catalogData.categories.some((item) => item.id === current)) {
          return current;
        }
        return catalogData.categories[0]?.id || "official";
      });
      setLoading(false);
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const modes = useMemo(() => {
    if (!catalog) {
      return [];
    }

    const normalizedKeyword = keyword.trim().toLowerCase();
    return catalog.modes.filter((mode) => {
      if (activeCategoryId !== "all" && mode.categoryId !== activeCategoryId) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const haystack = [
        mode.name,
        mode.summary,
        mode.bestFor,
        ...mode.platforms,
        ...mode.steps.map((item) => `${item.title} ${item.description}`),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedKeyword);
    });
  }, [activeCategoryId, catalog, keyword]);

  const totalCommands = useMemo(() => {
    return modes.reduce((count, mode) => count + countModeCommands(mode), 0);
  }, [modes]);

  const completedCommands = useMemo(() => {
    return modes.reduce((count, mode) => {
      const commandCount = mode.steps.reduce((stepCount, step) => {
        return (
          stepCount +
          (step.commands?.filter((command) => progress[commandProgressKey(mode.id, command.id)]).length || 0)
        );
      }, 0);
      return count + commandCount;
    }, 0);
  }, [modes, progress]);

  const handleCopy = async (command: string) => {
    const success = await copyText(command);
    setNotice(success ? "Command copied." : "Clipboard unavailable, please copy manually.");
  };

  const handleToggleDone = (modeId: string, commandId: string) => {
    const key = commandProgressKey(modeId, commandId);
    const next = {
      ...progress,
      [key]: !progress[key],
    };
    setProgress(next);
    saveProgress(next);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-4 text-sm text-text-secondary">
        {tr("Loading install modes...")}
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="rounded-xl border border-error/40 bg-error/10 p-4 text-sm text-error">
        {tr(notice || "Install catalog unavailable.")}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-border bg-bg-secondary p-4">
        <h2 className="text-base font-semibold text-text-primary">sdkwork-openclaw-pc-installer</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Interactive coverage for all OpenClaw install modes: official installer, manual, containers, automation, managed platforms, and self-managed VPS.")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span>{tr("Visible commands")}: {totalCommands}</span>
          <span>{tr("Completed")}: {completedCommands}</span>
          <a
            href="https://docs.openclaw.ai/install"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {tr("Open docs/install")}
          </a>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-bg-secondary p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategoryId("all")}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              activeCategoryId === "all"
                ? "bg-primary-soft text-primary"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {tr("All")}
          </button>
          {catalog.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategoryId(category.id)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                activeCategoryId === category.id
                  ? "bg-primary-soft text-primary"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
              title={tr(category.description)}
            >
              {tr(category.label)}
            </button>
          ))}
        </div>

        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={tr("Search mode/platform/step, for example Docker, Fly, install.ps1, or Nix")}
          className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
        />
      </div>

      {notice ? (
        <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
          {tr(notice)}
        </div>
      ) : null}

      {modes.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          {tr("No install mode matches the current filters.")}
        </div>
      ) : (
        <div className="space-y-4">
          {modes.map((mode) => {
            const total = countModeCommands(mode);
            const done = mode.steps.reduce((count, step) => {
              return (
                count +
                (step.commands?.filter((command) => progress[commandProgressKey(mode.id, command.id)]).length || 0)
              );
            }, 0);
            const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <article key={mode.id} className="rounded-xl border border-border bg-bg-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{tr(mode.name)}</h3>
                    <p className="mt-1 text-sm text-text-secondary">{tr(mode.summary)}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {tr("Best for")}: {tr(mode.bestFor)} | {tr("Platforms")}: {mode.platforms.join(", ")}
                    </p>
                  </div>
                  <a
                    href={mode.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    {tr("Docs")}
                  </a>
                </div>

                {total > 0 ? (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                      <span>
                        {done}/{total} {tr("commands done")}
                      </span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-tertiary">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {mode.steps.map((step) => (
                    <div key={step.id} className="rounded-lg border border-border bg-bg-primary p-3">
                      <h4 className="text-sm font-medium text-text-primary">{tr(step.title)}</h4>
                      <p className="mt-1 text-xs text-text-secondary">{tr(step.description)}</p>

                      {step.commands?.length ? (
                        <div className="mt-3 space-y-2">
                          {step.commands.map((command) => {
                            const doneKey = commandProgressKey(mode.id, command.id);
                            const checked = Boolean(progress[doneKey]);
                            return (
                              <div key={command.id} className="rounded-md border border-border bg-bg-secondary p-2.5">
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-xs text-text-secondary">
                                    {tr(command.title)}
                                    {command.description ? ` - ${tr(command.description)}` : ""}
                                  </div>
                                  <span className="rounded bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-muted">
                                    {shellBadge(command.shell)}
                                  </span>
                                </div>
                                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-bg-primary p-2 text-[11px] text-text-primary">
                                  {command.command}
                                </pre>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleCopy(command.command);
                                    }}
                                    className="rounded border border-border bg-bg-tertiary px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover"
                                  >
                                    {tr("Copy command")}
                                  </button>
                                  <label className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleDone(mode.id, command.id)}
                                    />
                                    {tr("Mark as completed")}
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {step.notes?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-text-muted">
                          {step.notes.map((note) => (
                            <li key={note}>{tr(note)}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SdkworkOpenclawPcInstaller;
