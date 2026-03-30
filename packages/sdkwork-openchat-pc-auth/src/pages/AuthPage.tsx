import { startTransition, useEffect, useState, type FormEvent } from "react";
import * as QRCode from "qrcode";
import {
  ArrowRight,
  Chrome,
  Github,
  LoaderCircle,
  Lock,
  Mail,
  MessageCircle,
  Music2,
  QrCode,
  RefreshCw,
  Smartphone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Label } from "@sdkwork/openchat-pc-ui";
import {
  appAuthService,
  type AppAuthLoginQrCode,
  type AppAuthSocialProvider,
} from "../services/appAuthService";
import { useAuthStore } from "../stores/useAuthStore";
import { buildOAuthCallbackUri, resolveRedirectTarget } from "./authRouteUtils";

type AuthMode = "login" | "register" | "forgot";
type QrPanelState = "idle" | "loading" | "pending" | "scanned" | "confirmed" | "expired" | "error";

const QR_POLL_INTERVAL_MS = 2_000;
const SOCIAL_PROVIDERS: AppAuthSocialProvider[] = ["wechat", "douyin", "github", "google"];

function resolveAuthMode(pathname: string): AuthMode {
  if (pathname === "/register") {
    return "register";
  }

  if (pathname === "/forgot-password") {
    return "forgot";
  }

  return "login";
}

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ProviderGlyph({ provider }: { provider: AppAuthSocialProvider }) {
  if (provider === "github") {
    return <Github className="h-5 w-5" />;
  }

  if (provider === "google") {
    return <Chrome className="h-5 w-5" />;
  }

  if (provider === "wechat") {
    return <MessageCircle className="h-5 w-5" />;
  }

  return <Music2 className="h-5 w-5" />;
}

function resolveQrStatusCopy(tr: (key: string, options?: Record<string, unknown>) => string, state: QrPanelState) {
  if (state === "loading") {
    return tr("auth.qrStatus.loading");
  }
  if (state === "scanned") {
    return tr("auth.qrStatus.scanned");
  }
  if (state === "confirmed") {
    return tr("auth.qrStatus.confirmed");
  }
  if (state === "expired") {
    return tr("auth.qrStatus.expired");
  }
  if (state === "error") {
    return tr("auth.qrStatus.error");
  }
  return tr("auth.qrStatus.pending");
}

function resolveQrStatusAccent(state: QrPanelState) {
  if (state === "scanned") {
    return "text-amber-300";
  }
  if (state === "confirmed") {
    return "text-emerald-300";
  }
  if (state === "expired" || state === "error") {
    return "text-rose-300";
  }
  return "text-zinc-300";
}

export function AuthPage() {
  const { tr } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signIn = useAuthStore((state) => state.signIn);
  const register = useAuthStore((state) => state.register);
  const sendPasswordReset = useAuthStore((state) => state.sendPasswordReset);
  const applySession = useAuthStore((state) => state.applySession);
  const mode = resolveAuthMode(location.pathname);
  const redirectTarget = resolveRedirectTarget(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOAuthProvider, setActiveOAuthProvider] = useState<AppAuthSocialProvider | null>(null);
  const [qrState, setQrState] = useState<QrPanelState>("idle");
  const [qrCode, setQrCode] = useState<AppAuthLoginQrCode | null>(null);
  const [qrImageSrc, setQrImageSrc] = useState("");
  const [qrErrorMessage, setQrErrorMessage] = useState("");
  const [qrReloadNonce, setQrReloadNonce] = useState(0);

  useEffect(() => {
    const nextEmail = searchParams.get("email");
    if (nextEmail) {
      setEmail(nextEmail);
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode !== "login") {
      setQrState("idle");
      setQrCode(null);
      setQrImageSrc("");
      setQrErrorMessage("");
      return;
    }

    let disposed = false;
    let pollTimer: number | null = null;

    const clearPollTimer = () => {
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const schedulePoll = (qrKey: string, delayMs = QR_POLL_INTERVAL_MS) => {
      clearPollTimer();
      pollTimer = window.setTimeout(() => {
        void pollStatus(qrKey);
      }, delayMs);
    };

    const pollStatus = async (qrKey: string) => {
      try {
        const statusResult = await appAuthService.checkLoginQrCodeStatus(qrKey);
        if (disposed) {
          return;
        }

        if (statusResult.status === "confirmed" && statusResult.session) {
          setQrState("confirmed");
          applySession(statusResult.session);
          startTransition(() => {
            navigate(redirectTarget, { replace: true });
          });
          return;
        }

        setQrState(statusResult.status);

        if (statusResult.status === "expired") {
          clearPollTimer();
          return;
        }

        schedulePoll(qrKey);
      } catch (error) {
        if (disposed) {
          return;
        }
        setQrState("error");
        setQrErrorMessage(readErrorMessage(error, tr("auth.errors.qrStatusFailed")));
        clearPollTimer();
      }
    };

    const loadQrCode = async () => {
      setQrState("loading");
      setQrCode(null);
      setQrImageSrc("");
      setQrErrorMessage("");

      try {
        const nextQrCode = await appAuthService.generateLoginQrCode();
        if (disposed) {
          return;
        }

        let nextImageSrc = "";
        if (nextQrCode.qrUrl) {
          nextImageSrc = nextQrCode.qrUrl;
        } else if (nextQrCode.qrContent) {
          nextImageSrc = await QRCode.toDataURL(nextQrCode.qrContent, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 320,
            color: {
              dark: "#111827",
              light: "#ffffff",
            },
          });
        } else {
          throw new Error(tr("auth.errors.invalidQrPayload"));
        }

        if (disposed) {
          return;
        }

        setQrCode(nextQrCode);
        setQrImageSrc(nextImageSrc);
        setQrState("pending");
        schedulePoll(nextQrCode.qrKey);
      } catch (error) {
        if (disposed) {
          return;
        }
        setQrState("error");
        setQrErrorMessage(readErrorMessage(error, tr("auth.errors.qrGenerateFailed")));
      }
    };

    void loadQrCode();

    return () => {
      disposed = true;
      clearPollTimer();
    };
  }, [applySession, mode, navigate, qrReloadNonce, redirectTarget, tr]);

  const withRedirect = (pathname: string) => {
    const [basePath, rawQuery = ""] = pathname.split("?");
    const params = new URLSearchParams(rawQuery);
    if (redirectTarget !== "/chat") {
      params.set("redirect", redirectTarget);
    }

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await signIn({ email, password });
        startTransition(() => {
          navigate(redirectTarget, { replace: true });
        });
        return;
      }

      if (mode === "register") {
        await register({ name, email, password });
        startTransition(() => {
          navigate(redirectTarget, { replace: true });
        });
        return;
      }

      await sendPasswordReset(email);
      startTransition(() => {
        navigate(withRedirect(`/login?email=${encodeURIComponent(email.trim())}`), {
          replace: true,
        });
      });
    } catch (error) {
      toast.error(
        readErrorMessage(
          error,
          mode === "forgot" ? tr("auth.errors.passwordResetFailed") : tr("auth.errors.signInFailed"),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignIn = async (provider: AppAuthSocialProvider) => {
    if (activeOAuthProvider) {
      return;
    }

    setActiveOAuthProvider(provider);

    try {
      const authUrl = await appAuthService.getOAuthAuthorizationUrl({
        provider,
        redirectUri: buildOAuthCallbackUri(provider, redirectTarget),
        state: redirectTarget !== "/chat" ? redirectTarget : undefined,
      });
      window.location.assign(authUrl);
    } catch (error) {
      setActiveOAuthProvider(null);
      toast.error(readErrorMessage(error, tr("auth.errors.oauthStartFailed")));
    }
  };

  if (isAuthenticated) {
    return <Navigate to={redirectTarget} replace />;
  }

  return (
    <div className="relative flex min-h-full items-center justify-center p-4 sm:p-8">
      <div className="relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 md:flex-row">
        <div className="relative flex w-full flex-col justify-between overflow-hidden bg-zinc-950 p-8 text-white dark:bg-black md:w-2/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_62%)]" />

          <div className="relative z-10">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">{tr("auth.qrLogin")}</h2>
            <p className="mt-3 max-w-[260px] text-sm leading-7 text-zinc-300">
              {qrCode?.description || tr("auth.qrDesc")}
            </p>
          </div>

          <div className="relative z-10 mt-8">
            <div className="rounded-[28px] bg-white/95 p-4 shadow-2xl">
              <div className="relative overflow-hidden rounded-2xl bg-white">
                {qrImageSrc ? (
                  <img
                    src={qrImageSrc}
                    alt={tr("auth.qrAlt")}
                    className={`h-56 w-full object-contain transition-opacity ${
                      qrState === "expired" || qrState === "error" ? "opacity-40" : "opacity-100"
                    }`}
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-zinc-100">
                    <LoaderCircle className="h-8 w-8 animate-spin text-zinc-400" />
                  </div>
                )}

                {qrState === "expired" || qrState === "error" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/10">
                    <Button
                      type="button"
                      onClick={() => setQrReloadNonce((value) => value + 1)}
                      className="h-auto rounded-xl px-4 py-2.5 text-sm font-bold"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {tr("auth.qrRefresh")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={`mt-5 text-sm font-medium ${resolveQrStatusAccent(qrState)}`}>
              {resolveQrStatusCopy(tr, qrState)}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {qrState === "error"
                ? qrErrorMessage
                : qrState === "scanned"
                  ? tr("auth.qrScannedHint")
                  : tr("auth.openApp")}
            </p>
            {qrCode?.qrContent ? (
              <div className="mt-4 break-all rounded-2xl bg-white/8 px-3 py-2 font-mono text-[11px] leading-5 text-zinc-300">
                {qrCode.qrContent}
              </div>
            ) : null}
            <div className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
              <Smartphone className="h-4 w-4" />
              <span>{tr("auth.qrWeChatHint")}</span>
            </div>
          </div>
        </div>

        <div className="w-full p-8 md:w-3/5 md:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <h1 className="mb-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                {mode === "login"
                  ? tr("auth.welcomeBack")
                  : mode === "register"
                    ? tr("auth.createAccount")
                    : tr("auth.resetPassword")}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                {mode === "login"
                  ? tr("auth.loginDesc")
                  : mode === "register"
                    ? tr("auth.registerDesc")
                    : tr("auth.resetDesc")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" ? (
                <div>
                  <Label className="mb-1.5 block text-zinc-700 dark:text-zinc-300">
                    {tr("auth.name")}
                  </Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-5 w-5 text-zinc-400" />
                    </div>
                    <Input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="py-2.5 pl-10 pr-3"
                      placeholder={tr("auth.placeholders.name")}
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <Label className="mb-1.5 block text-zinc-700 dark:text-zinc-300">
                  {tr("auth.email")}
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-zinc-400" />
                  </div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="py-2.5 pl-10 pr-3"
                    placeholder={tr("auth.placeholders.email")}
                    required
                  />
                </div>
              </div>

              {mode !== "forgot" ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label className="text-zinc-700 dark:text-zinc-300">
                      {tr("auth.password")}
                    </Label>
                    {mode === "login" ? (
                      <Button
                        variant="unstyled"
                        type="button"
                        onClick={() => navigate(withRedirect("/forgot-password"))}
                        className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-500"
                      >
                        {tr("auth.forgotPassword")}
                      </Button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-zinc-400" />
                    </div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="py-2.5 pl-10 pr-3"
                      placeholder={tr("auth.placeholders.password")}
                      required
                    />
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-auto w-full py-3 font-bold"
              >
                {isSubmitting
                  ? tr("common.loading")
                  : mode === "login"
                    ? tr("auth.signIn")
                    : mode === "register"
                      ? tr("auth.signUp")
                      : tr("auth.sendResetLink")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {mode === "login" ? (
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900">
                      {tr("auth.continueWith")}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {SOCIAL_PROVIDERS.map((provider) => {
                    const isBusy = activeOAuthProvider === provider;
                    return (
                      <Button
                        key={provider}
                        variant="unstyled"
                        type="button"
                        onClick={() => {
                          void handleSocialSignIn(provider);
                        }}
                        disabled={Boolean(activeOAuthProvider)}
                        className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        <span className="flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          <ProviderGlyph provider={provider} />
                          {tr(`auth.providers.${provider}`)}
                        </span>
                        {isBusy ? (
                          <LoaderCircle className="h-4 w-4 animate-spin text-primary-500" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-zinc-400" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
              {mode === "login" ? (
                <>
                  {tr("auth.noAccount")}{" "}
                  <Button
                    variant="unstyled"
                    type="button"
                    onClick={() => navigate(withRedirect("/register"))}
                    className="font-bold text-primary-600 transition-colors hover:text-primary-500"
                  >
                    {tr("auth.signUp")}
                  </Button>
                </>
              ) : mode === "register" ? (
                <>
                  {tr("auth.hasAccount")}{" "}
                  <Button
                    variant="unstyled"
                    type="button"
                    onClick={() => navigate(withRedirect("/login"))}
                    className="font-bold text-primary-600 transition-colors hover:text-primary-500"
                  >
                    {tr("auth.signIn")}
                  </Button>
                </>
              ) : (
                <Button
                  variant="unstyled"
                  type="button"
                  onClick={() => navigate(withRedirect("/login"))}
                  className="mx-auto flex items-center justify-center gap-1 font-bold text-primary-600 transition-colors hover:text-primary-500"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  {tr("auth.backToLogin")}
                </Button>
              )}
            </div>

            {mode === "forgot" ? (
              <div className="mt-4 text-center">
                <Button
                  variant="unstyled"
                  type="button"
                  onClick={() => navigate(withRedirect("/register"))}
                  className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-500"
                >
                  {tr("auth.signUp")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
