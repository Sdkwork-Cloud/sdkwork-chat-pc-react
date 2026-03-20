import { useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { UseAuthReturn } from "../hooks/useAuth";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

interface ForgotPasswordPageProps {
  auth: UseAuthReturn;
  onSwitchToLogin: () => void;
}

type RecoveryMethod = "email" | "phone";
type ResetStage = "request" | "verify" | "reset" | "done";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value);
}

export function ForgotPasswordPage({ auth, onSwitchToLogin }: ForgotPasswordPageProps) {
  const { tr } = useAppTranslation();
  const [method, setMethod] = useState<RecoveryMethod>("email");
  const [stage, setStage] = useState<ResetStage>("request");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const account = useMemo(() => {
    return method === "email" ? email.trim() : phone.trim();
  }, [email, method, phone]);

  const channel = method === "email" ? "EMAIL" : "SMS";

  const clearFeedback = () => {
    setLocalError(null);
    setSuccessMessage(null);
    auth.clearError();
  };

  const validateAccount = (): boolean => {
    if (!account) {
      setLocalError(tr("Email or phone is required."));
      return false;
    }

    if (method === "email" && !isValidEmail(account)) {
      setLocalError(tr("Please enter a valid email address."));
      return false;
    }

    if (method === "phone" && !isValidPhone(account)) {
      setLocalError(tr("Please enter a valid mainland China phone number."));
      return false;
    }

    return true;
  };

  const handleSendCode = async () => {
    clearFeedback();
    if (!validateAccount()) {
      return;
    }

    const ok = await auth.requestPasswordReset(account, channel);
    if (!ok) {
      setLocalError(auth.error || tr("Failed to send reset code."));
      return;
    }

    setSuccessMessage(tr("Verification code sent."));
    setStage("verify");
  };

  const handleVerifyCode = async () => {
    clearFeedback();
    if (!validateAccount()) {
      return;
    }

    const normalizedCode = code.trim();
    if (!normalizedCode) {
      setLocalError(tr("Verification code is required."));
      return;
    }

    const ok = await auth.verifyPasswordResetCode(account, normalizedCode, channel);
    if (!ok) {
      setLocalError(auth.error || tr("Verification code is invalid."));
      return;
    }

    setVerifiedCode(normalizedCode);
    setSuccessMessage(tr("Code verification succeeded."));
    setStage("reset");
  };

  const handleResetPassword = async () => {
    clearFeedback();
    if (!validateAccount()) {
      return;
    }

    if (!verifiedCode) {
      setLocalError(tr("Please verify the code first."));
      setStage("verify");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setLocalError(tr("Password must be at least 6 characters."));
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError(tr("Passwords do not match."));
      return;
    }

    const ok = await auth.resetPassword(account, verifiedCode, newPassword, confirmPassword);
    if (!ok) {
      setLocalError(auth.error || tr("Failed to reset password."));
      return;
    }

    setSuccessMessage(tr("Password reset succeeded."));
    setStage("done");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--ai-primary)] shadow-[var(--shadow-glow)]">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{tr("OpenChat")}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{tr("Reset Password")}</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-[var(--shadow-lg)]">
          <h2 className="mb-6 text-lg font-semibold text-[var(--text-primary)]">{tr("Forgot Password")}</h2>

          <div className="mb-4 flex space-x-4">
            <label className="flex cursor-pointer items-center">
              <SharedUi.Input
                type="radio"
                name="recoveryMethod"
                value="email"
                checked={method === "email"}
                onChange={() => {
                  clearFeedback();
                  setMethod("email");
                }}
                className="h-4 w-4 border-[var(--border-color)] text-[var(--ai-primary)] focus:ring-[var(--ai-primary)]"
                disabled={auth.isLoading || stage !== "request"}
              />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">{tr("Email")}</span>
            </label>
            <label className="flex cursor-pointer items-center">
              <SharedUi.Input
                type="radio"
                name="recoveryMethod"
                value="phone"
                checked={method === "phone"}
                onChange={() => {
                  clearFeedback();
                  setMethod("phone");
                }}
                className="h-4 w-4 border-[var(--border-color)] text-[var(--ai-primary)] focus:ring-[var(--ai-primary)]"
                disabled={auth.isLoading || stage !== "request"}
              />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">{tr("Phone")}</span>
            </label>
          </div>

          <div className="space-y-4">
            {method === "email" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Email")}</label>
                <SharedUi.Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={tr("Please enter your email")}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--ai-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                  disabled={auth.isLoading}
                />
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Phone")}</label>
                <SharedUi.Input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={tr("Please enter your phone number")}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--ai-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                  disabled={auth.isLoading}
                />
              </div>
            )}

            {stage === "verify" || stage === "reset" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Verification Code")}</label>
                <div className="flex gap-2">
                  <SharedUi.Input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={tr("Please enter verification code")}
                    className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--ai-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                    disabled={auth.isLoading || stage === "reset"}
                  />
                  {stage === "verify" ? (
                    <SharedUi.Button
                      type="button"
                      onClick={() => void handleSendCode()}
                      disabled={auth.isLoading}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--ai-primary)]"
                    >
                      {tr("Resend")}
                    </SharedUi.Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {stage === "reset" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("New Password")}</label>
                  <SharedUi.Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={tr("Please enter new password")}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--ai-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                    disabled={auth.isLoading}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Confirm Password")}</label>
                  <SharedUi.Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={tr("Please confirm new password")}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--ai-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                    disabled={auth.isLoading}
                  />
                </div>
              </>
            ) : null}
          </div>

          {localError || auth.error ? (
            <div className="mt-4 rounded-xl border border-[var(--ai-error)]/20 bg-[var(--ai-error-soft)] p-3">
              <p className="text-sm text-[var(--ai-error)]">{localError || auth.error}</p>
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-xl border border-[var(--ai-success)]/20 bg-[var(--ai-success-soft)] p-3">
              <p className="text-sm text-[var(--ai-success)]">{successMessage}</p>
            </div>
          ) : null}

          <div className="mt-6 space-y-2">
            {stage === "request" ? (
              <SharedUi.Button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={auth.isLoading}
                className="w-full rounded-xl bg-[var(--ai-primary)] py-3 font-medium text-white transition-colors hover:bg-[var(--ai-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)]"
              >
                {auth.isLoading ? tr("Sending...") : tr("Send Verification Code")}
              </SharedUi.Button>
            ) : null}

            {stage === "verify" ? (
              <SharedUi.Button
                type="button"
                onClick={() => void handleVerifyCode()}
                disabled={auth.isLoading}
                className="w-full rounded-xl bg-[var(--ai-primary)] py-3 font-medium text-white transition-colors hover:bg-[var(--ai-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)]"
              >
                {auth.isLoading ? tr("Verifying...") : tr("Verify Code")}
              </SharedUi.Button>
            ) : null}

            {stage === "reset" ? (
              <SharedUi.Button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={auth.isLoading}
                className="w-full rounded-xl bg-[var(--ai-primary)] py-3 font-medium text-white transition-colors hover:bg-[var(--ai-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)]"
              >
                {auth.isLoading ? tr("Resetting...") : tr("Reset Password")}
              </SharedUi.Button>
            ) : null}

            {stage === "done" ? (
              <SharedUi.Button
                type="button"
                onClick={onSwitchToLogin}
                className="w-full rounded-xl bg-[var(--ai-primary)] py-3 font-medium text-white transition-colors hover:bg-[var(--ai-primary-hover)]"
              >
                {tr("Back to Login")}
              </SharedUi.Button>
            ) : null}
          </div>

          <div className="mt-6 border-t border-[var(--border-color)] pt-6 text-center">
            <SharedUi.Button
              type="button"
              onClick={onSwitchToLogin}
              className="text-sm text-[var(--ai-primary)] hover:underline focus:outline-none"
            >
              {tr("Back to Login")}
            </SharedUi.Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
