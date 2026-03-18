import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { UseAuthReturn } from "../hooks/useAuth";
import { appAuthService } from "../services";

interface RegisterPageProps {
  auth: UseAuthReturn;
  onSwitchToLogin: () => void;
}

function isPhoneTarget(target: string): boolean {
  return /^1[3-9]\d{9}$/.test(target);
}

function isEmailTarget(target: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(target);
}

function buildUsername(target: string): string {
  if (isPhoneTarget(target)) {
    return target;
  }

  const [prefix] = target.split("@");
  const normalized = prefix.replace(/[^a-zA-Z0-9_-]/g, "").trim();
  return normalized || `user${Date.now()}`;
}

function buildNickname(target: string): string {
  if (isPhoneTarget(target)) {
    return `user-${target.slice(-4)}`;
  }

  const [prefix] = target.split("@");
  return prefix || `user-${Date.now()}`;
}

export function RegisterPage({ auth, onSwitchToLogin }: RegisterPageProps) {
  const { tr } = useAppTranslation();
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const countdownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const canSendCode = useMemo(() => {
    const normalizedTarget = target.trim();
    return (
      normalizedTarget.length > 0
      && (isPhoneTarget(normalizedTarget) || isEmailTarget(normalizedTarget))
      && countdown === 0
      && !submitting
      && !auth.isLoading
    );
  }, [auth.isLoading, countdown, submitting, target]);

  const canSubmit = useMemo(() => {
    return (
      target.trim().length > 0
      && code.trim().length > 0
      && password.trim().length > 0
      && confirmPassword.trim().length > 0
      && !submitting
      && !auth.isLoading
    );
  }, [auth.isLoading, code, confirmPassword, password, submitting, target]);

  const clearFeedback = () => {
    auth.clearError();
    setError(null);
    setSuccessMessage(null);
  };

  const startCountdown = () => {
    setCountdown(60);

    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return 0;
        }

        return previous - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    const normalizedTarget = target.trim();
    clearFeedback();

    if (!isPhoneTarget(normalizedTarget) && !isEmailTarget(normalizedTarget)) {
      setError(tr("Please enter a valid phone number or email address."));
      return;
    }

    setSubmitting(true);
    try {
      await appAuthService.sendVerifyCode({
        target: normalizedTarget,
        scene: "REGISTER",
        verifyType: isPhoneTarget(normalizedTarget) ? "PHONE" : "EMAIL",
      });
      startCountdown();
      setSuccessMessage(tr("Verification code sent."));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tr("Failed to send verification code."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!canSubmit) {
      return;
    }

    const normalizedTarget = target.trim();
    if (!isPhoneTarget(normalizedTarget) && !isEmailTarget(normalizedTarget)) {
      setError(tr("Please enter a valid phone number or email address."));
      return;
    }

    if (password !== confirmPassword) {
      setError(tr("Passwords do not match."));
      return;
    }

    const username = buildUsername(normalizedTarget);
    const nickname = buildNickname(normalizedTarget);

    setSubmitting(true);
    try {
      await appAuthService.register({
        username,
        password: password.trim(),
        confirmPassword: confirmPassword.trim(),
        phone: isPhoneTarget(normalizedTarget) ? normalizedTarget : undefined,
        email: isPhoneTarget(normalizedTarget) ? undefined : normalizedTarget,
        name: nickname,
        verificationCode: code.trim(),
      });

      const loginOk = await auth.login(username, password.trim());
      if (!loginOk) {
        setError(auth.error || tr("Registration succeeded but login sync failed."));
        return;
      }

      setSuccessMessage(tr("Registration successful."));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tr("Registration failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--ai-primary)] shadow-[var(--shadow-glow)] sm:h-20 sm:w-20">
            <svg className="h-8 w-8 text-white sm:h-10 sm:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">{tr("OpenChat")}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{tr("Create account")}</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-lg)] sm:p-6">
          <h2 className="mb-6 text-lg font-semibold text-[var(--text-primary)]">{tr("Register")}</h2>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Phone or Email")}</label>
              <input
                type="text"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder={tr("Phone number or email")}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                disabled={submitting || auth.isLoading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Verification Code")}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder={tr("Code")}
                  className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                  disabled={submitting || auth.isLoading}
                />
                <button
                  type="button"
                  onClick={() => void handleSendCode()}
                  disabled={!canSendCode}
                  className="rounded-xl bg-[var(--ai-primary)] px-4 py-2.5 text-white transition-colors hover:bg-[var(--ai-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)]"
                >
                  {countdown > 0 ? `${countdown}s` : tr("Send Code")}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={tr("Password")}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 pr-12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                  disabled={submitting || auth.isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  onClick={() => setShowPassword((value) => !value)}
                  tabIndex={-1}
                >
                  {showPassword ? tr("Hide") : tr("Show")}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Confirm Password")}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={tr("Confirm password")}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 pr-12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                  disabled={submitting || auth.isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? tr("Hide") : tr("Show")}
                </button>
              </div>
            </div>

            {error || auth.error ? (
              <div className="rounded-xl border border-[var(--ai-error)]/20 bg-[var(--ai-error-soft)] p-3">
                <p className="text-sm text-[var(--ai-error)]">{error || auth.error}</p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-[var(--ai-success)]/20 bg-[var(--ai-success-soft)] p-3">
                <p className="text-sm text-[var(--ai-success)]">{successMessage}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-[var(--ai-primary)] py-3 font-medium text-white transition-colors hover:bg-[var(--ai-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)]"
            >
              {submitting || auth.isLoading ? tr("Registering...") : tr("Register")}
            </button>
          </form>

          <div className="mt-6 border-t border-[var(--border-color)] pt-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              {tr("Already have an account?")}
              <button
                onClick={onSwitchToLogin}
                className="ml-1 text-[var(--ai-primary)] hover:underline focus:outline-none"
              >
                {tr("Login now")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
