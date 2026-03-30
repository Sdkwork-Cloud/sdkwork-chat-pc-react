import { useEffect, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Select } from "@sdkwork/openchat-pc-ui";
import type { PrivacySettings as AppPrivacySettings } from "./types";
import { SettingsService } from "./services";
import { PanelHeading, Section, ToggleRow } from "./Shared";

export function DataPrivacySettings() {
  const { tr } = useAppTranslation();
  const [settings, setSettings] = useState<AppPrivacySettings | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      const current = await SettingsService.getSettings();
      if (!cancelled) {
        setSettings(current.privacy);
      }
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrivacy = async (nextSettings: AppPrivacySettings) => {
    const previous = settings;
    setSettings(nextSettings);
    setNotice("");

    try {
      await SettingsService.updateSettings({ privacy: nextSettings });
      setNotice(tr("settings.messages.settingsSaved"));
    } catch {
      setSettings(previous);
      setNotice(tr("settings.messages.saveFailedLocalChanges"));
    }
  };

  const handleClearCache = async () => {
    try {
      await SettingsService.cleanCache();
      setNotice(tr("settings.messages.settingsSaved"));
    } catch {
      setNotice(tr("settings.messages.saveFailedLocalChanges"));
    }
  };

  const handleClearLocalData = async () => {
    try {
      await SettingsService.cleanAllData();
      setNotice(tr("settings.messages.settingsSaved"));
    } catch {
      setNotice(tr("settings.messages.saveFailedLocalChanges"));
    }
  };

  return (
    <div className="space-y-8">
      <PanelHeading title={tr("settings.tabs.privacy")} description={tr("settings.description")} />

      <Section title={tr("settings.privacy.title")}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {tr("settings.privacy.onlineStatus")}
              </div>
              <Select
                value={settings?.onlineStatus || "contacts"}
                onValueChange={(value) => {
                  if (!settings) {
                    return;
                  }
                  void updatePrivacy({
                    ...settings,
                    onlineStatus: value as AppPrivacySettings["onlineStatus"],
                  });
                }}
              >
                <option value="everyone">{tr("settings.privacy.visibility.everyone")}</option>
                <option value="contacts">{tr("settings.privacy.visibility.contactsOnly")}</option>
                <option value="nobody">{tr("settings.privacy.visibility.nobody")}</option>
              </Select>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {tr("settings.privacy.phoneVisibility")}
              </div>
              <Select
                value={settings?.phoneNumber || "contacts"}
                onValueChange={(value) => {
                  if (!settings) {
                    return;
                  }
                  void updatePrivacy({
                    ...settings,
                    phoneNumber: value as AppPrivacySettings["phoneNumber"],
                  });
                }}
              >
                <option value="everyone">{tr("settings.privacy.visibility.everyone")}</option>
                <option value="contacts">{tr("settings.privacy.visibility.contactsOnly")}</option>
                <option value="nobody">{tr("settings.privacy.visibility.nobody")}</option>
              </Select>
            </div>
          </div>

          <ToggleRow
            title={tr("settings.privacy.allowSearchByPhone")}
            enabled={Boolean(settings?.addByPhone)}
            onToggle={(enabled) => {
              if (!settings) {
                return;
              }
              void updatePrivacy({ ...settings, addByPhone: enabled });
            }}
          />
          <ToggleRow
            title={tr("settings.privacy.allowSearchByUsername")}
            enabled={Boolean(settings?.addByUsername)}
            onToggle={(enabled) => {
              if (!settings) {
                return;
              }
              void updatePrivacy({ ...settings, addByUsername: enabled });
            }}
          />
          <ToggleRow
            title={tr("settings.privacy.readReceipts")}
            enabled={Boolean(settings?.readReceipts)}
            onToggle={(enabled) => {
              if (!settings) {
                return;
              }
              void updatePrivacy({ ...settings, readReceipts: enabled });
            }}
          />

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {notice ? (
              <p className="mr-auto text-sm text-zinc-500 dark:text-zinc-400">{notice}</p>
            ) : null}
            <Button variant="outline" onClick={() => void handleClearCache()}>
              {tr("settings.privacy.clearCache")}
            </Button>
            <Button variant="outline" onClick={() => void handleClearLocalData()}>
              {tr("settings.privacy.clearLocalData")}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
