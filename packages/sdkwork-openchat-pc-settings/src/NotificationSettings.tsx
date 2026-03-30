import { useEffect, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Input } from "@sdkwork/openchat-pc-ui";
import type { NotificationSettings as AppNotificationSettings } from "./types";
import { SettingsService } from "./services";
import { PanelHeading, Section, ToggleRow } from "./Shared";

export function NotificationSettings() {
  const { tr } = useAppTranslation();
  const [settings, setSettings] = useState<AppNotificationSettings | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      const current = await SettingsService.getSettings();
      if (!cancelled) {
        setSettings(current.notifications);
      }
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateNotifications = async (nextSettings: AppNotificationSettings) => {
    const previous = settings;
    setSettings(nextSettings);
    setNotice("");

    try {
      await SettingsService.updateSettings({ notifications: nextSettings });
      setNotice(tr("settings.messages.settingsSaved"));
    } catch {
      setSettings(previous);
      setNotice(tr("settings.messages.saveFailedLocalChanges"));
    }
  };

  return (
    <div className="space-y-8">
      <PanelHeading title={tr("settings.tabs.notifications")} description={tr("settings.description")} />

      <Section title={tr("settings.notifications.title")}>
        <div className="space-y-4">
          <ToggleRow
            title={tr("settings.notifications.messagePreview")}
            enabled={Boolean(settings?.messagePreview)}
            onToggle={(enabled) => {
              if (!settings) {
                return;
              }
              void updateNotifications({ ...settings, messagePreview: enabled });
            }}
          />
          <ToggleRow
            title={tr("settings.notifications.messageSound")}
            enabled={Boolean(settings?.messageSound)}
            onToggle={(enabled) => {
              if (!settings) {
                return;
              }
              void updateNotifications({ ...settings, messageSound: enabled });
            }}
          />
          <ToggleRow
            title={tr("settings.notifications.doNotDisturb")}
            enabled={Boolean(settings?.doNotDisturb)}
            onToggle={(enabled) => {
              if (!settings) {
                return;
              }
              void updateNotifications({ ...settings, doNotDisturb: enabled });
            }}
          />

          {settings?.doNotDisturb ? (
            <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {tr("settings.notifications.dndStart")}
                </div>
                <Input
                  type="time"
                  value={settings.doNotDisturbStart}
                  onValueChange={(value) => {
                    if (!settings) {
                      return;
                    }
                    void updateNotifications({ ...settings, doNotDisturbStart: value });
                  }}
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {tr("settings.notifications.dndEnd")}
                </div>
                <Input
                  type="time"
                  value={settings.doNotDisturbEnd}
                  onValueChange={(value) => {
                    if (!settings) {
                      return;
                    }
                    void updateNotifications({ ...settings, doNotDisturbEnd: value });
                  }}
                />
              </div>
            </div>
          ) : null}

          {notice ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{notice}</p>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
