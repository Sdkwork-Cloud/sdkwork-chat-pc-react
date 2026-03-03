import { useEffect, useMemo, useState } from "react";
import { OpenClawInstallResultService } from "../services";
import type { OpenClawDesktopGuide, OpenClawInstallCommand } from "../types";

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function shellLabel(shell: OpenClawInstallCommand["shell"]): string {
  return shell === "powershell" ? "PowerShell" : "Bash";
}

function platformLabel(platform: OpenClawDesktopGuide["platform"]): string {
  if (platform === "windows") return "Windows";
  if (platform === "macos") return "macOS";
  if (platform === "linux") return "Linux";
  return "Unknown";
}

export function SdkworkOpenclawPcDesktop() {
  const [guide, setGuide] = useState<OpenClawDesktopGuide | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadGuide() {
      setLoading(true);
      const result = await OpenClawInstallResultService.getDesktopGuide();
      if (cancelled) {
        return;
      }
      if (!result.success || !result.data) {
        setNotice(result.error || result.message || "Desktop guide load failed.");
        setLoading(false);
        return;
      }
      setGuide(result.data);
      setLoading(false);
    }

    void loadGuide();
    return () => {
      cancelled = true;
    };
  }, []);

  const platform = useMemo(() => {
    if (!guide) {
      return "Unknown";
    }
    return platformLabel(guide.platform);
  }, [guide]);

  const handleCopy = async (command: string) => {
    const success = await copyText(command);
    setNotice(success ? "Desktop command copied." : "Clipboard unavailable.");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-4 text-sm text-text-secondary">
        Detecting desktop install profile...
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-xl border border-error/40 bg-error/10 p-4 text-sm text-error">
        {notice || "Desktop guide unavailable."}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-border bg-bg-secondary p-4">
        <h2 className="text-base font-semibold text-text-primary">sdkwork-openclaw-pc-desktop</h2>
        <p className="mt-1 text-sm text-text-secondary">
          本地桌面安装向导，根据当前运行平台生成推荐命令。
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
          <span>Detected platform: {platform}</span>
          <a
            href="https://docs.openclaw.ai/install"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            查看完整安装文档
          </a>
        </div>
      </header>

      <article className="rounded-xl border border-border bg-bg-secondary p-4">
        <h3 className="text-sm font-medium text-text-primary">推荐策略</h3>
        <p className="mt-1 text-sm text-text-secondary">{guide.recommendation}</p>

        {guide.notes.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-text-muted">
            {guide.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </article>

      <article className="rounded-xl border border-border bg-bg-secondary p-4">
        <h3 className="text-sm font-medium text-text-primary">快速命令</h3>
        <div className="mt-3 space-y-3">
          {guide.quickCommands.map((command) => (
            <div key={command.id} className="rounded-lg border border-border bg-bg-primary p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-xs text-text-secondary">
                  {command.title}
                  {command.description ? ` · ${command.description}` : ""}
                </div>
                <span className="rounded bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-muted">
                  {shellLabel(command.shell)}
                </span>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-bg-secondary p-2 text-[11px] text-text-primary">
                {command.command}
              </pre>
              <button
                type="button"
                onClick={() => {
                  void handleCopy(command.command);
                }}
                className="mt-2 rounded border border-border bg-bg-tertiary px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover"
              >
                复制命令
              </button>
            </div>
          ))}
        </div>
      </article>

      {notice ? (
        <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
          {notice}
        </div>
      ) : null}
    </section>
  );
}

export default SdkworkOpenclawPcDesktop;
