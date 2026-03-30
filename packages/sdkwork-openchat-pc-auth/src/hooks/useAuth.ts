import { useCallback, useEffect, useState } from "react";
import { IS_DEV } from "@sdkwork/openchat-pc-kernel";
import type {
  AuthState,
  IMConfig,
  PasswordStrength,
  RegisterRequest,
  User,
} from "../entities/auth.entity";
import { useAuthStore } from "../stores/useAuthStore";
import {
  appAuthService,
  loadAuthData,
  saveAuthData,
  validateEmail,
  validateNickname,
  validatePasswordStrength,
  validatePhone,
  validateUsername,
} from "../services";

const DEV_TEST_ACCOUNT = {
  username: "testuser",
  password: "Test@123456",
};

const DEV_AUTO_LOGIN_KEY = "openchat_dev_auto_login_disabled";

export interface UseAuthReturn extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  loginWithThirdParty: (provider: string) => Promise<boolean>;
  register: (request: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  requestPasswordReset: (account: string, channel: "EMAIL" | "SMS") => Promise<boolean>;
  verifyPasswordResetCode: (
    account: string,
    code: string,
    channel: "EMAIL" | "SMS",
  ) => Promise<boolean>;
  resetPassword: (
    account: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<boolean>;
  forgotPassword: (email?: string, phone?: string) => Promise<boolean>;
  clearError: () => void;
  checkPasswordStrength: (password: string) => PasswordStrength;
  checkUsername: (username: string) => { isValid: boolean; error?: string };
  checkEmail: (email: string) => { isValid: boolean; error?: string };
  checkPhone: (phone: string) => { isValid: boolean; error?: string };
  checkNickname: (nickname: string) => { isValid: boolean; error?: string };
  updateIMConfig: (config: Partial<IMConfig>) => void;
  disableDevAutoLogin: () => void;
  enableDevAutoLogin: () => void;
  isDevAutoLoginDisabled: () => boolean;
}

function mapStoreUserToLegacyUser(user: ReturnType<typeof useAuthStore.getState>["user"]): User | null {
  if (!user) {
    return null;
  }

  const storedUser = loadAuthData()?.user;
  if (storedUser?.email && storedUser.email === user.email) {
    return storedUser;
  }

  return {
    id: storedUser?.id || user.email || user.displayName,
    uid: storedUser?.uid || storedUser?.id || user.email || user.displayName,
    username: storedUser?.username || user.email || user.displayName,
    email: user.email,
    phone: storedUser?.phone || "",
    nickname: user.displayName,
    avatar: user.avatarUrl || storedUser?.avatar,
    status: storedUser?.status,
  };
}

function buildSessionUserInfo(authData: ReturnType<typeof loadAuthData>): Parameters<
  ReturnType<typeof useAuthStore.getState>["applySession"]
>[0]["userInfo"] {
  if (!authData?.user) {
    return undefined;
  }

  return {
    username: authData.user.username,
    email: authData.user.email,
    nickname: authData.user.nickname,
    avatar: authData.user.avatar,
  };
}

export function useAuth(): UseAuthReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storeUser = useAuthStore((state) => state.user);
  const signIn = useAuthStore((state) => state.signIn);
  const registerStore = useAuthStore((state) => state.register);
  const signOut = useAuthStore((state) => state.signOut);
  const sendPasswordReset = useAuthStore((state) => state.sendPasswordReset);
  const applySession = useAuthStore((state) => state.applySession);
  const resetStore = useAuthStore((state) => state.reset);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imConfig, setImConfig] = useState<IMConfig | null>(() => loadAuthData()?.imConfig ?? null);

  const disableDevAutoLogin = useCallback(() => {
    localStorage.setItem(DEV_AUTO_LOGIN_KEY, "true");
  }, []);

  const enableDevAutoLogin = useCallback(() => {
    localStorage.removeItem(DEV_AUTO_LOGIN_KEY);
  }, []);

  const isDevAutoLoginDisabled = useCallback(() => {
    return localStorage.getItem(DEV_AUTO_LOGIN_KEY) === "true";
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const restoreResult = await appAuthService.restoreAuth();
        if (restoreResult) {
          applySession({
            ...restoreResult.session,
            userInfo: {
              username: restoreResult.user.username,
              email: restoreResult.user.email,
              nickname: restoreResult.user.nickname,
              avatar: restoreResult.user.avatar,
            },
          });
          setImConfig(restoreResult.imConfig);
          setIsLoading(false);
          return;
        }

        if (IS_DEV && !isDevAutoLoginDisabled()) {
          try {
            const session = await appAuthService.login({
              username: DEV_TEST_ACCOUNT.username,
              password: DEV_TEST_ACCOUNT.password,
            });
            applySession({
              ...session,
              userInfo: session.userInfo || buildSessionUserInfo(loadAuthData()),
            });
            setImConfig(loadAuthData()?.imConfig ?? null);
            setIsLoading(false);
            return;
          } catch {
            // Keep dev init flow resilient when default account is unavailable.
          }
        }
      } catch (nextError) {
        console.error("Failed to initialize auth state:", nextError);
      }

      resetStore();
      setImConfig(null);
      setIsLoading(false);
    };

    void initAuth();
  }, [applySession, isDevAutoLoginDisabled, resetStore]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn({ email: username, password });
      setImConfig(loadAuthData()?.imConfig ?? null);
      setIsLoading(false);
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login failed.");
      setIsLoading(false);
      return false;
    }
  }, [signIn]);

  const register = useCallback(async (request: RegisterRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await registerStore({
        name: request.nickname || request.username,
        email: request.email,
        password: request.password,
      });
      setImConfig(loadAuthData()?.imConfig ?? null);
      setIsLoading(false);
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Register failed.");
      setIsLoading(false);
      return false;
    }
  }, [registerStore]);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      await signOut();
    } catch (nextError) {
      console.error("Logout failed:", nextError);
    } finally {
      setImConfig(null);
      setError(null);
      setIsLoading(false);
    }
  }, [signOut]);

  const loginWithThirdParty = useCallback(async (provider: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const normalizedProvider = provider.trim().toLowerCase();
      if (!["wechat", "github", "google", "apple", "douyin"].includes(normalizedProvider)) {
        throw new Error("Unsupported social login provider.");
      }

      const session = await appAuthService.loginWithSocial({
        provider: normalizedProvider as "wechat" | "github" | "google" | "apple" | "douyin",
      });
      applySession({
        ...session,
        userInfo: session.userInfo || buildSessionUserInfo(loadAuthData()),
      });
      setImConfig(loadAuthData()?.imConfig ?? null);
      setIsLoading(false);
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Third-party login failed.");
      setIsLoading(false);
      return false;
    }
  }, [applySession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkPasswordStrength = useCallback((password: string): PasswordStrength => {
    return validatePasswordStrength(password);
  }, []);

  const checkUsername = useCallback((username: string): { isValid: boolean; error?: string } => {
    return validateUsername(username);
  }, []);

  const checkEmail = useCallback((email: string): { isValid: boolean; error?: string } => {
    return validateEmail(email);
  }, []);

  const checkPhone = useCallback((phone: string): { isValid: boolean; error?: string } => {
    return validatePhone(phone);
  }, []);

  const checkNickname = useCallback((nickname: string): { isValid: boolean; error?: string } => {
    return validateNickname(nickname);
  }, []);

  const forgotPassword = useCallback(async (email?: string, phone?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const account = (email || phone || "").trim();
      if (!account) {
        throw new Error("Email or phone is required.");
      }

      if (email) {
        await sendPasswordReset(account);
      } else {
        await appAuthService.requestPasswordReset({
          account,
          channel: "SMS",
        });
      }

      setIsLoading(false);
      return true;
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to send password reset request.",
      );
      setIsLoading(false);
      return false;
    }
  }, [sendPasswordReset]);

  const requestPasswordReset = useCallback(
    async (account: string, channel: "EMAIL" | "SMS"): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const normalizedAccount = account.trim();
        if (!normalizedAccount) {
          throw new Error("Email or phone is required.");
        }

        if (channel === "EMAIL") {
          await sendPasswordReset(normalizedAccount);
        } else {
          await appAuthService.requestPasswordReset({
            account: normalizedAccount,
            channel,
          });
        }

        setIsLoading(false);
        return true;
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to send password reset request.",
        );
        setIsLoading(false);
        return false;
      }
    },
    [sendPasswordReset],
  );

  const verifyPasswordResetCode = useCallback(
    async (account: string, code: string, channel: "EMAIL" | "SMS"): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const normalizedAccount = account.trim();
        const normalizedCode = code.trim();
        if (!normalizedAccount) {
          throw new Error("Email or phone is required.");
        }
        if (!normalizedCode) {
          throw new Error("Verification code is required.");
        }
        const verified = await appAuthService.verifyCode({
          target: normalizedAccount,
          code: normalizedCode,
          scene: "RESET_PASSWORD",
          verifyType: channel === "EMAIL" ? "EMAIL" : "PHONE",
        });
        if (!verified) {
          throw new Error("Invalid or expired verification code.");
        }
        setIsLoading(false);
        return true;
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "Failed to verify reset code.",
        );
        setIsLoading(false);
        return false;
      }
    },
    [],
  );

  const resetPassword = useCallback(
    async (
      account: string,
      code: string,
      newPassword: string,
      confirmPassword: string,
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const normalizedAccount = account.trim();
        const normalizedCode = code.trim();
        if (!normalizedAccount) {
          throw new Error("Email or phone is required.");
        }
        if (!normalizedCode) {
          throw new Error("Verification code is required.");
        }
        if (!newPassword || newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        await appAuthService.resetPassword({
          account: normalizedAccount,
          code: normalizedCode,
          newPassword,
          confirmPassword,
        });

        setIsLoading(false);
        return true;
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to reset password.");
        setIsLoading(false);
        return false;
      }
    },
    [],
  );

  const updateIMConfig = useCallback((config: Partial<IMConfig>) => {
    setImConfig((current) => {
      const existing = current || loadAuthData()?.imConfig || null;
      if (!existing) {
        return current;
      }

      const nextConfig = { ...existing, ...config };
      const currentAuth = loadAuthData();
      if (currentAuth?.user) {
        saveAuthData({
          ...currentAuth,
          imToken: nextConfig.token,
          imConfig: nextConfig,
          timestamp: Date.now(),
        });
      }

      return nextConfig;
    });
  }, []);

  return {
    isAuthenticated,
    user: mapStoreUserToLegacyUser(storeUser),
    imConfig,
    isLoading,
    error,
    login,
    loginWithThirdParty,
    register,
    logout,
    requestPasswordReset,
    verifyPasswordResetCode,
    resetPassword,
    forgotPassword,
    clearError,
    checkPasswordStrength,
    checkUsername,
    checkEmail,
    checkPhone,
    checkNickname,
    updateIMConfig,
    disableDevAutoLogin,
    enableDevAutoLogin,
    isDevAutoLoginDisabled,
  };
}
