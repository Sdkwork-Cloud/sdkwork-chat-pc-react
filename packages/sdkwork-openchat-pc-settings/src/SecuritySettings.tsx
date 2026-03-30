import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@sdkwork/openchat-pc-auth";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Input, Label } from "@sdkwork/openchat-pc-ui";
import { PanelHeading, Section, SignedOutState } from "./Shared";
import { userCenterService } from "./services";

const LOGIN_PATH = "/login?redirect=%2Fsettings%3Ftab%3Dsecurity";

export function SecuritySettings() {
  const navigate = useNavigate();
  const { tr } = useAppTranslation();
  const { isAuthenticated } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [notice, setNotice] = useState("");

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setNotice(tr("settings.messages.passwordFieldsRequired"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice(tr("settings.messages.passwordMismatch"));
      return;
    }

    setIsUpdating(true);
    setNotice("");

    try {
      await userCenterService.changePassword({
        oldPassword: currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(tr("settings.messages.passwordChanged"));
    } catch {
      setNotice(tr("settings.messages.passwordChangeFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <PanelHeading title={tr("settings.tabs.security")} description={tr("settings.description")} />
        <SignedOutState title={tr("settings.tabs.security")} actionLabel={tr("Login")} onAction={() => navigate(LOGIN_PATH)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PanelHeading title={tr("settings.tabs.security")} description={tr("settings.description")} />

      <Section title={tr("settings.account.changePassword.title")}>
        <div className="max-w-md space-y-4">
          <div>
            <Label className="mb-2 block">{tr("settings.account.changePassword.current")}</Label>
            <Input type="password" value={currentPassword} onValueChange={setCurrentPassword} />
          </div>
          <div>
            <Label className="mb-2 block">{tr("settings.account.changePassword.new")}</Label>
            <Input type="password" value={newPassword} onValueChange={setNewPassword} />
          </div>
          <div>
            <Label className="mb-2 block">{tr("settings.account.changePassword.confirm")}</Label>
            <Input type="password" value={confirmPassword} onValueChange={setConfirmPassword} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {notice ? (
              <p className="mr-auto text-sm text-zinc-500 dark:text-zinc-400">{notice}</p>
            ) : null}
            <Button onClick={() => void handleUpdatePassword()} disabled={isUpdating}>
              {isUpdating ? tr("settings.account.changePassword.submitting") : tr("settings.account.changePassword.update")}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
