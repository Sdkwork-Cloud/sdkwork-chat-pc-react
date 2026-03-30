import { useEffect, useMemo, useState } from "react";
import type { IMConfig } from "@sdkwork/openchat-pc-auth";
import { loadAuthData, saveAuthData, useAuth } from "@sdkwork/openchat-pc-auth";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Input, Label, Select } from "@sdkwork/openchat-pc-ui";
import { PanelHeading, Section } from "./Shared";

function buildDraft(imConfig: IMConfig | null): IMConfig {
  return {
    wsUrl: imConfig?.wsUrl || "",
    serverUrl: imConfig?.serverUrl || "",
    uid: imConfig?.uid || "",
    deviceId: imConfig?.deviceId || "",
    deviceFlag: imConfig?.deviceFlag || "PC",
    token: imConfig?.token || "",
  };
}

export function ImConfigSettings() {
  const { tr } = useAppTranslation();
  const { imConfig, updateIMConfig } = useAuth();
  const [draft, setDraft] = useState<IMConfig>(() => buildDraft(imConfig));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDraft(buildDraft(imConfig));
  }, [imConfig]);

  const tokenConfigured = useMemo(() => Boolean(draft.token.trim()), [draft.token]);

  const handleSave = () => {
    updateIMConfig(draft);

    const current = loadAuthData();
    if (current?.user) {
      saveAuthData({
        ...current,
        imToken: draft.token,
        imConfig: draft,
        timestamp: Date.now(),
      });
    }

    setNotice(tr("settings.messages.imConfigSaved"));
  };

  return (
    <div className="space-y-8">
      <PanelHeading title={tr("settings.tabs.imconfig")} description={tr("settings.description")} />

      <Section title={tr("settings.imconfig.title")}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Label className="mb-2 block">{tr("settings.imconfig.websocket")}</Label>
            <Input
              value={draft.wsUrl}
              onValueChange={(value) => setDraft((current) => ({ ...current, wsUrl: value }))}
              placeholder={tr("settings.imconfig.websocketPlaceholder")}
            />
          </div>

          <div>
            <Label className="mb-2 block">{tr("settings.imconfig.httpApi")}</Label>
            <Input
              value={draft.serverUrl || ""}
              onValueChange={(value) => setDraft((current) => ({ ...current, serverUrl: value }))}
              placeholder={tr("settings.imconfig.httpApiPlaceholder")}
            />
          </div>

          <div>
            <Label className="mb-2 block">{tr("settings.imconfig.uid")}</Label>
            <Input
              value={draft.uid}
              onValueChange={(value) => setDraft((current) => ({ ...current, uid: value }))}
              placeholder={tr("settings.imconfig.uidPlaceholder")}
            />
          </div>

          <div>
            <Label className="mb-2 block">{tr("settings.imconfig.deviceId")}</Label>
            <Input
              value={draft.deviceId || ""}
              onValueChange={(value) => setDraft((current) => ({ ...current, deviceId: value }))}
              placeholder={tr("settings.imconfig.deviceIdPlaceholder")}
            />
          </div>

          <div>
            <Label className="mb-2 block">{tr("settings.imconfig.deviceType")}</Label>
            <Select
              value={draft.deviceFlag || "PC"}
              onValueChange={(value) => setDraft((current) => ({ ...current, deviceFlag: value }))}
            >
              <option value="PC">{tr("settings.imconfig.deviceTypeOptions.PC")}</option>
              <option value="WEB">{tr("settings.imconfig.deviceTypeOptions.WEB")}</option>
              <option value="DESKTOP">{tr("settings.imconfig.deviceTypeOptions.DESKTOP")}</option>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">{tr("settings.imconfig.token")}</Label>
            <Input
              value={draft.token}
              onValueChange={(value) => setDraft((current) => ({ ...current, token: value }))}
              placeholder={tr("settings.imconfig.tokenPlaceholder")}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <div className="mr-auto text-sm text-zinc-500 dark:text-zinc-400">
            {tokenConfigured
              ? tr("settings.imconfig.tokenConfigured")
              : tr("settings.imconfig.tokenNotConfigured")}
          </div>
          {notice ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{notice}</p> : null}
          <Button onClick={handleSave}>{tr("settings.imconfig.save")}</Button>
        </div>
      </Section>
    </div>
  );
}
