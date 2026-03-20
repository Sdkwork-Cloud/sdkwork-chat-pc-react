import { useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { UseAuthReturn } from "../hooks/useAuth";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

interface LoginPageProps {
  auth: UseAuthReturn;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export function LoginPage({ auth, onSwitchToRegister, onSwitchToForgotPassword }: LoginPageProps) {
  const { tr } = useAppTranslation();
  const isDev = import.meta.env.VITE_APP_ENV === "development";
  const [username, setUsername] = useState(isDev ? "test" : "");
  const [password, setPassword] = useState(isDev ? "123456" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  function validateUsername(nextUsername = username): boolean {
    if (!nextUsername.trim()) {
      setValidationErrors((previous) => ({
        ...previous,
        username: tr("Please enter a username."),
      }));
      return false;
    }

    setValidationErrors((previous) => ({
      ...previous,
      username: undefined,
    }));
    return true;
  }

  function validatePassword(nextPassword = password): boolean {
    if (!nextPassword.trim()) {
      setValidationErrors((previous) => ({
        ...previous,
        password: tr("Please enter a password."),
      }));
      return false;
    }

    setValidationErrors((previous) => ({
      ...previous,
      password: undefined,
    }));
    return true;
  }

  const canSubmit =
    username.trim().length > 0 &&
    password.trim().length > 0 &&
    !validationErrors.username &&
    !validationErrors.password &&
    !auth.isLoading;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    auth.clearError();

    const usernameValid = validateUsername();
    const passwordValid = validatePassword();

    if (!usernameValid || !passwordValid || !canSubmit) {
      return;
    }

    await auth.login(username.trim(), password.trim());
  };

  const handleThirdPartyLogin = async (provider: string) => {
    try {
      auth.clearError();
      await auth.loginWithThirdParty(provider);
    } catch (error) {
      console.error("Third-party login failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--ai-primary)] shadow-[var(--shadow-glow)] sm:h-20 sm:w-20">
            <svg className="h-8 w-8 text-white sm:h-10 sm:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">{tr("OpenChat")}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{tr("Make communication simpler")}</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-lg)] sm:p-6">
          <h2 className="mb-6 text-lg font-semibold text-[var(--text-primary)]">{tr("Login")}</h2>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Username")}</label>
              <SharedUi.Input
                type="text"
                value={username}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setUsername(nextValue);
                  validateUsername(nextValue);
                }}
                onBlur={() => {
                  validateUsername();
                }}
                placeholder={tr("Please enter your username")}
                className={`w-full rounded-xl border bg-[var(--bg-tertiary)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] ${
                  validationErrors.username
                    ? "border-[var(--ai-error)]"
                    : username
                      ? "border-[var(--ai-success)]"
                      : "border-[var(--border-color)]"
                }`}
                disabled={auth.isLoading}
              />
              {validationErrors.username ? (
                <p className="mt-1 text-xs text-[var(--ai-error)]">{validationErrors.username}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{tr("Password")}</label>
              <div className="relative">
                <SharedUi.Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setPassword(nextValue);
                    validatePassword(nextValue);
                  }}
                  onBlur={() => {
                    validatePassword();
                  }}
                  placeholder={tr("Please enter your password")}
                  className={`w-full rounded-xl border bg-[var(--bg-tertiary)] px-4 py-2.5 pr-12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] ${
                    validationErrors.password
                      ? "border-[var(--ai-error)]"
                      : password
                        ? "border-[var(--ai-success)]"
                        : "border-[var(--border-color)]"
                  }`}
                  disabled={auth.isLoading}
                />
                <SharedUi.Button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </SharedUi.Button>
              </div>
              {validationErrors.password ? (
                <p className="mt-1 text-xs text-[var(--ai-error)]">{validationErrors.password}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <SharedUi.Input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--ai-primary)] focus:ring-[var(--ai-primary)]"
                />
                <span className="ml-2 text-sm text-[var(--text-secondary)]">{tr("Remember me")}</span>
              </label>
              <SharedUi.Button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-sm text-[var(--ai-primary)] hover:underline focus:outline-none"
              >
                {tr("Forgot password?")}
              </SharedUi.Button>
            </div>

            {auth.error ? (
              <div className="rounded-xl border border-[var(--ai-error)]/20 bg-[var(--ai-error-soft)] p-3">
                <p className="text-sm text-[var(--ai-error)]">{auth.error}</p>
              </div>
            ) : null}

            <SharedUi.Button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center rounded-xl bg-[var(--ai-primary)] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-in-out hover:scale-[1.02] hover:bg-[var(--ai-primary-hover)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--ai-primary)] focus:ring-opacity-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)] disabled:shadow-none"
            >
              {auth.isLoading ? (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {tr("Logging in...")}
                </>
              ) : (
                tr("Login")
              )}
            </SharedUi.Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-color)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[var(--bg-secondary)] px-2 text-[var(--text-muted)]">{tr("Other login methods")}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <SharedUi.Button
                type="button"
                onClick={() => void handleThirdPartyLogin("wechat")}
                disabled={auth.isLoading}
                className="flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 transition-colors hover:bg-[var(--bg-secondary)]"
                aria-label={tr("WeChat")}
              >
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </SharedUi.Button>
              <SharedUi.Button
                type="button"
                onClick={() => void handleThirdPartyLogin("github")}
                disabled={auth.isLoading}
                className="flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 transition-colors hover:bg-[var(--bg-secondary)]"
                aria-label={tr("GitHub")}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </SharedUi.Button>
              <SharedUi.Button
                type="button"
                onClick={() => void handleThirdPartyLogin("google")}
                disabled={auth.isLoading}
                className="flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 transition-colors hover:bg-[var(--bg-secondary)]"
                aria-label={tr("Google")}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.057 10.057 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </SharedUi.Button>
            </div>
          </form>

          <div className="mt-6 border-t border-[var(--border-color)] pt-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              {tr("Don't have an account?")}
              <SharedUi.Button
                onClick={onSwitchToRegister}
                className="ml-1 text-[var(--ai-primary)] hover:underline focus:outline-none"
              >
                {tr("Register now")}
              </SharedUi.Button>
            </p>
          </div>

          <div className="mt-6">
            <p className="text-center text-xs text-[var(--text-muted)]">
              {tr("Powered by OpenChat SDK IM connectivity")}
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-[var(--text-muted)]">{tr("Copyright 2024 OpenChat Team")}</p>
      </div>
    </div>
  );
}

export default LoginPage;
