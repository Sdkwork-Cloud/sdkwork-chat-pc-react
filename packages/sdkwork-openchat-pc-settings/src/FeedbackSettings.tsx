import { useEffect, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Input, Select, Textarea } from "@sdkwork/openchat-pc-ui";
import { FeedbackResultService } from "./services";
import type { FeedbackSupportInfo } from "./types";
import { PanelHeading, Section } from "./Shared";

const DEFAULT_SUPPORT_INFO: FeedbackSupportInfo = {
  hotline: "",
  email: "",
  workingHours: "",
};

export function FeedbackSettings() {
  const { tr } = useAppTranslation();
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [contact, setContact] = useState("");
  const [content, setContent] = useState("");
  const [supportInfo, setSupportInfo] = useState<FeedbackSupportInfo>(DEFAULT_SUPPORT_INFO);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSupportInfo = async () => {
      const result = await FeedbackResultService.getFeedbackSupportInfo();
      if (!cancelled && result.success && result.data) {
        setSupportInfo(result.data);
      }
    };

    void loadSupportInfo();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      return;
    }

    setSubmitting(true);
    setNotice("");

    try {
      const result = await FeedbackResultService.submitFeedback({
        type: feedbackType,
        content: content.trim(),
        contact: contact.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.message || result.error || "submit feedback failed");
      }

      setContent("");
      setContact("");
      setNotice(tr("settings.messages.settingsSaved"));
    } catch {
      setNotice(tr("settings.messages.saveFailedLocalChanges"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PanelHeading title={tr("settings.tabs.feedback")} description={tr("settings.description")} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <Section title={tr("settings.tabs.feedback")}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {tr("settings.about.feedback.type")}
                </div>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <option value="suggestion">{tr("settings.about.feedback.types.suggestion")}</option>
                  <option value="bug">{tr("settings.about.feedback.types.bug")}</option>
                  <option value="experience">{tr("settings.about.feedback.types.experience")}</option>
                  <option value="other">{tr("settings.about.feedback.types.other")}</option>
                </Select>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {tr("settings.about.feedback.contact")}
                </div>
                <Input
                  value={contact}
                  onValueChange={setContact}
                  placeholder={tr("settings.about.feedback.contactPlaceholder")}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {tr("settings.about.feedback.content")}
              </div>
              <Textarea
                value={content}
                onValueChange={setContent}
                placeholder={tr("settings.about.feedback.contentPlaceholder")}
                rows={6}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {notice ? (
                <p className="mr-auto text-sm text-zinc-500 dark:text-zinc-400">{notice}</p>
              ) : null}
              <Button onClick={() => void handleSubmit()} disabled={submitting || !content.trim()}>
                {submitting ? tr("settings.about.feedback.submitting") : tr("settings.about.feedback.submit")}
              </Button>
            </div>
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
