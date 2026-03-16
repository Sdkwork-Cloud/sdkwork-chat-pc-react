import { useMemo, useState } from "react";
import type { UseAuthReturn } from "../hooks/useAuth";

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
      setLocalError("Email or phone is required.");
      return false;
    }
    if (method === "email" && !isValidEmail(account)) {
      setLocalError("Please enter a valid email address.");
      return false;
    }
    if (method === "phone" && !isValidPhone(account)) {
      setLocalError("Please enter a valid mainland China phone number.");
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
      setLocalError(auth.error || "Failed to send reset code.");
      return;
    }
    setSuccessMessage("Verification code sent.");
    setStage("verify");
  };

  const handleVerifyCode = async () => {
    clearFeedback();
    if (!validateAccount()) {
      return;
    }
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      setLocalError("Verification code is required.");
      return;
    }

    const ok = await auth.verifyPasswordResetCode(account, normalizedCode, channel);
    if (!ok) {
      setLocalError(auth.error || "Verification code is invalid.");
      return;
    }
    setVerifiedCode(normalizedCode);
    setSuccessMessage("Code verification succeeded.");
    setStage("reset");
  };

  const handleResetPassword = async () => {
    clearFeedback();
    if (!validateAccount()) {
      return;
    }
    if (!verifiedCode) {
      setLocalError("Please verify the code first.");
      setStage("verify");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    const ok = await auth.resetPassword(account, verifiedCode, newPassword, confirmPassword);
    if (!ok) {
      setLocalError(auth.error || "Failed to reset password.");
      return;
    }
    setSuccessMessage("Password reset succeeded.");
    setStage("done");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">OpenChat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Reset Password</p>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6 shadow-[var(--shadow-lg)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Forgot Password</h2>

          <div className="flex space-x-4 mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="recoveryMethod"
                value="email"
                checked={method === "email"}
                onChange={() => {
                  clearFeedback();
                  setMethod("email");
                }}
                className="h-4 w-4 text-[var(--ai-primary)] focus:ring-[var(--ai-primary)] border-[var(--border-color)]"
                disabled={auth.isLoading || stage !== "request"}
              />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">Email</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="recoveryMethod"
                value="phone"
                checked={method === "phone"}
                onChange={() => {
                  clearFeedback();
                  setMethod("phone");
                }}
                className="h-4 w-4 text-[var(--ai-primary)] focus:ring-[var(--ai-primary)] border-[var(--border-color)]"
                disabled={auth.isLoading || stage !== "request"}
              />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">Phone</span>
            </label>
          </div>

          <div className="space-y-4">
            {method === "email" ? (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Please enter your email"
                  className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                  disabled={auth.isLoading}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Please enter your phone number"
                  className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                  disabled={auth.isLoading}
                />
              </div>
            )}

            {(stage === "verify" || stage === "reset") && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Verification Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Please enter verification code"
                    className="flex-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                    disabled={auth.isLoading || stage === "reset"}
                  />
                  {stage === "verify" && (
                    <button
                      type="button"
                      onClick={() => {
                        void handleSendCode();
                      }}
                      disabled={auth.isLoading}
                      className="px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl border border-[var(--border-color)] hover:border-[var(--ai-primary)] transition-colors"
                    >
                      Resend
                    </button>
                  )}
                </div>
              </div>
            )}

            {stage === "reset" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Please enter new password"
                    className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                    disabled={auth.isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Please confirm new password"
                    className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                    disabled={auth.isLoading}
                  />
                </div>
              </>
            )}
          </div>

          {(localError || auth.error) && (
            <div className="p-3 bg-[var(--ai-error-soft)] border border-[var(--ai-error)]/20 rounded-xl mt-4">
              <p className="text-sm text-[var(--ai-error)]">{localError || auth.error}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[var(--ai-success-soft)] border border-[var(--ai-success)]/20 rounded-xl mt-4">
              <p className="text-sm text-[var(--ai-success)]">{successMessage}</p>
            </div>
          )}

          <div className="space-y-2 mt-6">
            {stage === "request" && (
              <button
                type="button"
                onClick={() => {
                  void handleSendCode();
                }}
                disabled={auth.isLoading}
                className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                {auth.isLoading ? "Sending..." : "Send Verification Code"}
              </button>
            )}

            {stage === "verify" && (
              <button
                type="button"
                onClick={() => {
                  void handleVerifyCode();
                }}
                disabled={auth.isLoading}
                className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                {auth.isLoading ? "Verifying..." : "Verify Code"}
              </button>
            )}

            {stage === "reset" && (
              <button
                type="button"
                onClick={() => {
                  void handleResetPassword();
                }}
                disabled={auth.isLoading}
                className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                {auth.isLoading ? "Resetting..." : "Reset Password"}
              </button>
            )}

            {stage === "done" && (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white font-medium rounded-xl transition-colors"
              >
                Back to Login
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-sm text-[var(--ai-primary)] hover:underline focus:outline-none"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
