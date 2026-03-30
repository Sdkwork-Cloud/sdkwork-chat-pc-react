import { useEffect, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button } from "@sdkwork/openchat-pc-ui";
import { FeedbackResultService, SettingsResultService } from "./services";
import type { AppInfo, FeedbackSupportInfo } from "./types";
import { PanelHeading, Section } from "./Shared";

const DEFAULT_APP_INFO: AppInfo = {
  version: "1.0.0",
  buildNumber: "local",
  platform: "web",
  updateAvailable: false,
};

const DEFAULT_SUPPORT_INFO: FeedbackSupportInfo = {
  hotline: "",
  email: "",
  workingHours: "",
};

export function AboutSettings() {
  const { tr } = useAppTranslation();
  const [appInfo, setAppInfo] = useState<AppInfo>(DEFAULT_APP_INFO);
  const [supportInfo, setSupportInfo] = useState<FeedbackSupportInfo>(DEFAULT_SUPPORT_INFO);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const [appInfoResult, supportInfoResult] = await Promise.all([
        SettingsResultService.getAppInfo(),
        FeedbackResultService.getFeedbackSupportInfo(),
      ]);

      if (cancelled) {
        return;
      }

      if (appInfoResult.success && appInfoResult.data) {
        setAppInfo((current) => ({ ...current, ...appInfoResult.data }));
      }

      if (supportInfoResult.success && supportInfoResult.data) {
        setSupportInfo((current) => ({ ...current, ...supportInfoResult.data }));
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setNotice("");

    try {
      const result = await SettingsResultService.checkForUpdates();
      if (!result.success || !result.data) {
        throw new Error(result.message || result.error || "check for updates failed");
      }

      setAppInfo((current) => ({ ...current, ...result.data }));
      setNotice(
        result.data.updateAvailable
          ? tr("settings.messages.updateAvailable")
          : tr("settings.messages.updateUpToDate"),
      );
    } catch {
      setNotice(tr("settings.messages.updateCheckFailed"));
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="space-y-8">
      <PanelHeading title={tr("settings.tabs.about")} description={tr("settings.description")} />

      <div className="space-y-6">
        <Section title={tr("settings.about.application.title")}>
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            <p>{tr("settings.about.application.version")}: {appInfo.version}</p>
            <p>{tr("settings.about.application.build")}: {appInfo.buildNumber}</p>
            <p>{tr("settings.about.application.platform")}: {appInfo.platform}</p>
            <p>
              {tr("settings.about.application.status")}:{" "}
              {appInfo.updateAvailable
                ? tr("settings.about.application.status.updateAvailable")
                : tr("settings.about.application.status.upToDate")}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            {notice ? <p className="mr-auto text-sm text-zinc-500 dark:text-zinc-400">{notice}</p> : null}
            <Button variant="outline" onClick={() => void handleCheckUpdate()} disabled={checkingUpdate}>
              {checkingUpdate ? tr("settings.about.application.checking") : tr("settings.about.application.checkUpdates")}
            </Button>
          </div>
        </Section>

        <Section title={tr("settings.about.feedback.title")}>
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            <p>{tr("settings.about.feedback.supportHotline")}: {supportInfo.hotline || "-"}</p>
            <p>{tr("settings.about.feedback.supportEmail")}: {supportInfo.email || "-"}</p>
            <p>{tr("settings.about.feedback.supportHours")}: {supportInfo.workingHours || "-"}</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
