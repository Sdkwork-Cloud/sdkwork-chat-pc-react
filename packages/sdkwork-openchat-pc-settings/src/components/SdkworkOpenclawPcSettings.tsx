import { useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { OpenClawInstallResultService } from "../services";
import type { OpenClawInstallCommand, OpenClawPostInstallProfile } from "../types";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

const OPENCLAW_PROFILE_STORAGE_KEY = "openclaw:post-install-profile:v1";

const defaultProfile: OpenClawPostInstallProfile = {
  gatewayMode: "local",
  gatewayBind: "loopback",
  gatewayPort: "18789",
  gatewayToken: "",
  stateDir: "~/.openclaw",
  configPath: "~/.openclaw/openclaw.json",
  workspaceDir: "~/.openclaw/workspace",
  channels: {
    telegram: false,
    discord: false,
    whatsapp: false,
    signal: false,
  },
};

function loadProfile(): OpenClawPostInstallProfile {
  try {
    const raw = localStorage.getItem(OPENCLAW_PROFILE_STORAGE_KEY);
    if (!raw) {
      return defaultProfile;
    }

    const parsed = JSON.parse(raw) as Partial<OpenClawPostInstallProfile>;
    return {
      ...defaultProfile,
      ...parsed,
      channels: {
        ...defaultProfile.channels,
        ...(parsed.channels || {}),
      },
    };
  } catch {
    return defaultProfile;
  }
}

function saveProfile(profile: OpenClawPostInstallProfile): void {
  localStorage.setItem(OPENCLAW_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

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

export function SdkworkOpenclawPcSettings() {
  const { tr } = useAppTranslation();
  const [profile, setProfile] = useState<OpenClawPostInstallProfile>(() => loadProfile());
  const [commands, setCommands] = useState<OpenClawInstallCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function buildCommands() {
      setLoading(true);
      const result = await OpenClawInstallResultService.getPostInstallCommands(profile);
      if (cancelled) {
        return;
      }

      if (!result.success || !result.data) {
        setCommands([]);
        setNotice(result.error || result.message || "Unable to generate post-install commands.");
        setLoading(false);
        return;
      }

      setCommands(result.data);
      setLoading(false);
    }

    void buildCommands();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const commandText = useMemo(() => {
    return commands.map((command) => command.command).join("\n");
  }, [commands]);

  const handleCopySingle = async (command: string) => {
    const success = await copyText(command);
    setNotice(success ? "Command copied." : "Clipboard unavailable.");
  };

  const handleCopyAll = async () => {
    const success = await copyText(commandText);
    setNotice(success ? "All generated commands copied." : "Clipboard unavailable.");
  };

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-border bg-bg-secondary p-4">
        <h2 className="text-base font-semibold text-text-primary">sdkwork-openclaw-pc-settings</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Post-install configuration panel that generates executable commands from your gateway mode, paths, and channel selections.")}
        </p>
      </header>

      <article className="rounded-xl border border-border bg-bg-secondary p-4">
        <h3 className="text-sm font-medium text-text-primary">{tr("Gateway profile")}</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm text-text-secondary">
            {tr("gateway.mode")}
            <SharedUi.Select
              value={profile.gatewayMode}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  gatewayMode: event.target.value as OpenClawPostInstallProfile["gatewayMode"],
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            >
              <option value="local">{tr("local")}</option>
              <option value="remote">{tr("remote")}</option>
            </SharedUi.Select>
          </label>

          <label className="text-sm text-text-secondary">
            {tr("gateway.bind")}
            <SharedUi.Select
              value={profile.gatewayBind}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  gatewayBind: event.target.value as OpenClawPostInstallProfile["gatewayBind"],
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            >
              <option value="loopback">{tr("loopback")}</option>
              <option value="lan">{tr("lan")}</option>
              <option value="auto">{tr("auto")}</option>
            </SharedUi.Select>
          </label>

          <label className="text-sm text-text-secondary">
            {tr("gateway port")}
            <SharedUi.Input
              value={profile.gatewayPort}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, gatewayPort: event.target.value }))
              }
              placeholder="18789"
              className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            />
          </label>

          <label className="text-sm text-text-secondary">
            {tr("gateway token (optional)")}
            <SharedUi.Input
              value={profile.gatewayToken}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, gatewayToken: event.target.value }))
              }
              placeholder={tr("paste generated token")}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            />
          </label>

          <label className="text-sm text-text-secondary">
            OPENCLAW_STATE_DIR
            <SharedUi.Input
              value={profile.stateDir}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, stateDir: event.target.value }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            />
          </label>

          <label className="text-sm text-text-secondary">
            OPENCLAW_CONFIG_PATH
            <SharedUi.Input
              value={profile.configPath}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, configPath: event.target.value }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            />
          </label>

          <label className="text-sm text-text-secondary md:col-span-2">
            OPENCLAW_HOME / workspace
            <SharedUi.Input
              value={profile.workspaceDir}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, workspaceDir: event.target.value }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            />
          </label>
        </div>
      </article>

      <article className="rounded-xl border border-border bg-bg-secondary p-4">
        <h3 className="text-sm font-medium text-text-primary">{tr("Channels (optional)")}</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-text-secondary md:grid-cols-4">
          <label className="inline-flex items-center gap-2">
            <SharedUi.Input
              type="checkbox"
              checked={profile.channels.telegram}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  channels: { ...prev.channels, telegram: event.target.checked },
                }))
              }
            />
            {tr("Telegram")}
          </label>
          <label className="inline-flex items-center gap-2">
            <SharedUi.Input
              type="checkbox"
              checked={profile.channels.discord}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  channels: { ...prev.channels, discord: event.target.checked },
                }))
              }
            />
            {tr("Discord")}
          </label>
          <label className="inline-flex items-center gap-2">
            <SharedUi.Input
              type="checkbox"
              checked={profile.channels.whatsapp}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  channels: { ...prev.channels, whatsapp: event.target.checked },
                }))
              }
            />
            {tr("WhatsApp")}
          </label>
          <label className="inline-flex items-center gap-2">
            <SharedUi.Input
              type="checkbox"
              checked={profile.channels.signal}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  channels: { ...prev.channels, signal: event.target.checked },
                }))
              }
            />
            {tr("Signal")}
          </label>
        </div>
      </article>

      <article className="rounded-xl border border-border bg-bg-secondary p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-text-primary">{tr("Generated commands")}</h3>
          <SharedUi.Button
            type="button"
            onClick={() => {
              void handleCopyAll();
            }}
            disabled={commands.length === 0}
            className="rounded border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-60"
          >
            {tr("Copy all")}
          </SharedUi.Button>
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">{tr("Generating commands...")}</p>
        ) : null}

        {!loading && commands.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {tr("No commands generated. Check profile values.")}
          </p>
        ) : null}

        {!loading && commands.length > 0 ? (
          <div className="space-y-2">
            {commands.map((command) => (
              <div key={command.id} className="rounded-md border border-border bg-bg-primary p-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-xs text-text-secondary">{tr(command.title)}</div>
                  <span className="rounded bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-muted">
                    {shellLabel(command.shell)}
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-bg-secondary p-2 text-[11px] text-text-primary">
                  {command.command}
                </pre>
                <SharedUi.Button
                  type="button"
                  onClick={() => {
                    void handleCopySingle(command.command);
                  }}
                  className="mt-2 rounded border border-border bg-bg-tertiary px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover"
                >
                  {tr("Copy command")}
                </SharedUi.Button>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      {notice ? (
        <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
          {tr(notice)}
        </div>
      ) : null}
    </section>
  );
}

export default SdkworkOpenclawPcSettings;
